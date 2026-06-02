#box

*Created: 2/5/2026*

### Step 1

**Tags:** #ftp #Credentials-Leak #Weak-Credentials #Hydra

**Command:**
```bash
echo 'Offsec' >> users.txt
echo 'admin' >> users.txt
```

*Port: 21*

> 
> The machine exposes a FTP instance on port 21. All the files in this FTP are readonly. However inside accounts something hints to the account names there might be on that server. After a little bruteforce we discover that another pair of credentials to authenticate to FTP are `admin:admin`

---

### Step 2

**Tags:** #decrypt #hashcat

**Command:**
```bash
hashcat -m 1600 '$apr1$oRfRsc/K$UpYpplHDlaemqseM39Ugg0' /usr/share/wordlists/rockyou.txt
```

> 
> Inside the FTP with `admin:admin` we discover the content of what seems to be the website hosted on port 242. Moreover we find a `.htpasswd` file containing an encrypted password with Apache encryption. After a quick decrypt with `hashcat` we discover a new pair of credentials `offsec:elite`. This pair can be used to authenticate on the website on port 242

---

### Step 3

**Tags:** #ftp #Reverse-Shell

**Command:**
```bash
ftp admin@192.168.208.46
```

*Port: 21*

> 
> Having access to the web app and on its FTP, we discover that `admin` can also upload files in FTP. We proceed to upload a PentestMonkey PHP Reverse Shell and gain a shel on port 3145

---

### Step 4

**Tags:** #Kernel-Exploit #MS11-046

🔗 **URL/Link:** https://github.com/SecWiki/windows-kernel-exploits/tree/master/MS11-046

**Command:**
```bash
# For this script we're using an already built MS11-046 because we weren't able to compile the C script. The repository is here: https://github.com/SecWiki/windows-kernel-exploits/tree/master/MS11-046
.\ms11-046.exe
```

*💎 GEM*

> 
> On the target machine, while the SeImpersonatePrivilege might bait us, the effective privesc vector is MS11-046, a vulnerability consisting in the `afd.sys` file. A Kernel Exploit for version `Microsoft Windows Server 2008 Standard 6.0.6001 Service Pack 1 Build 6001`

---

