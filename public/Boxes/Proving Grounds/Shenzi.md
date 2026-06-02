#box

*Created: 2/3/2026*

### Step 1

**Tags:** #SMB-Null-Session #SMB #Credentials-Leak #Web-Enumeration #Wordpress #Web-Shell #Reverse-Shell

**Command:**
```bash
smbclient -N //192.168.177.55/Shenzi -c "prompt OFF; mget *"
```

*Port: 80*

> 
> The machine exposes on port 80 a xampp instance. Considering the randomicity of OSCP we discover by looking online that the endpoint is the same one of the machine's name (no wordlist contained that key). Within an open SMB Share we discover the credentials to authenticate in wp-admin and we upload a webshell in the Theme Editor, subsequently gaining access to the machine through a reverse shell

---

### Step 2

**Tags:** #msi #AlwaysInstallElevated #msfvenom

**Command:**
```bash
# Recognition, without WinPEAS

reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
```

*💎 GEM*

> 
> The escalation step is quite interesting because I've never viewed it earlier. During the WinPEAS scan we've identified that the AlwaysInstallElevated flag is set to TRUE. There's an escalation path that consists in creating a malicious `.msi` package and execute it through the utility `msiexec`. This will grant us a reverse shell privileged or eventually an user add. To craft the msi we can use msfvenom.

---

