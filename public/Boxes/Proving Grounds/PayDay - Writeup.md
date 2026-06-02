#box #easy-guessing #ssh-oHostKeyAlgorithms #sudo-capabilities 
## Nmap

```bash# Nmap 7.95 scan initiated Tue Jul  1 12:33:29 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV_Fast 192.168.168.39
Nmap scan report for 192.168.168.39
Host is up (0.044s latency).
Not shown: 992 closed tcp ports (reset)
PORT    STATE SERVICE     VERSION
22/tcp  open  ssh         OpenSSH 4.6p1 Debian 5build1 (protocol 2.0)
| ssh-hostkey: 
|   1024 f3:6e:87:04:ea:2d:b3:60:ff:42:ad:26:67:17:94:d5 (DSA)
|_  2048 bb:03:ce:ed:13:f1:9a:9e:36:03:e2:af:ca:b2:35:04 (RSA)
80/tcp  open  http        Apache httpd 2.2.4 ((Ubuntu) PHP/5.2.3-1ubuntu6)
|_http-title: CS-Cart. Powerful PHP shopping cart software
|_http-server-header: Apache/2.2.4 (Ubuntu) PHP/5.2.3-1ubuntu6
110/tcp open  pop3        Dovecot pop3d
|_pop3-capabilities: UIDL STLS CAPA SASL TOP PIPELINING RESP-CODES
| sslv2: 
|   SSLv2 supported
|   ciphers: 
|     SSL2_RC4_128_EXPORT40_WITH_MD5
|     SSL2_RC2_128_CBC_EXPORT40_WITH_MD5
|     SSL2_RC2_128_CBC_WITH_MD5
|     SSL2_RC4_128_WITH_MD5
|_    SSL2_DES_192_EDE3_CBC_WITH_MD5
|_ssl-date: 2025-07-01T16:33:44+00:00; +1s from scanner time.
| ssl-cert: Subject: commonName=ubuntu01/organizationName=OCOSA/stateOrProvinceName=There is no such thing outside US/countryName=XX
| Not valid before: 2008-04-25T02:02:48
|_Not valid after:  2008-05-25T02:02:48
139/tcp open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: MSHOME)
143/tcp open  imap        Dovecot imapd
|_ssl-date: 2025-07-01T16:33:44+00:00; +1s from scanner time.
|_imap-capabilities: IMAP4rev1 LOGINDISABLEDA0001 NAMESPACE MULTIAPPEND CHILDREN completed SORT SASL-IR Capability UNSELECT LITERAL+ OK IDLE LOGIN-REFERRALS THREAD=REFERENCES STARTTLS
| ssl-cert: Subject: commonName=ubuntu01/organizationName=OCOSA/stateOrProvinceName=There is no such thing outside US/countryName=XX
| Not valid before: 2008-04-25T02:02:48
|_Not valid after:  2008-05-25T02:02:48
| sslv2: 
|   SSLv2 supported
|   ciphers: 
|     SSL2_RC4_128_EXPORT40_WITH_MD5
|     SSL2_RC2_128_CBC_EXPORT40_WITH_MD5
|     SSL2_RC2_128_CBC_WITH_MD5
|     SSL2_RC4_128_WITH_MD5
|_    SSL2_DES_192_EDE3_CBC_WITH_MD5
445/tcp open  netbios-ssn Samba smbd 3.0.26a (workgroup: MSHOME)
993/tcp open  ssl/imap    Dovecot imapd
|_imap-capabilities: IMAP4rev1 NAMESPACE MULTIAPPEND CHILDREN completed SORT SASL-IR IDLE UNSELECT LITERAL+ OK AUTH=PLAINA0001 LOGIN-REFERRALS THREAD=REFERENCES Capability
| ssl-cert: Subject: commonName=ubuntu01/organizationName=OCOSA/stateOrProvinceName=There is no such thing outside US/countryName=XX
| Not valid before: 2008-04-25T02:02:48
|_Not valid after:  2008-05-25T02:02:48
| sslv2: 
|   SSLv2 supported
|   ciphers: 
|     SSL2_RC4_128_EXPORT40_WITH_MD5
|     SSL2_RC2_128_CBC_EXPORT40_WITH_MD5
|     SSL2_RC2_128_CBC_WITH_MD5
|     SSL2_RC4_128_WITH_MD5
|_    SSL2_DES_192_EDE3_CBC_WITH_MD5
|_ssl-date: 2025-07-01T16:33:44+00:00; 0s from scanner time.
995/tcp open  ssl/pop3    Dovecot pop3d
|_ssl-date: 2025-07-01T16:33:44+00:00; +1s from scanner time.
|_pop3-capabilities: UIDL CAPA SASL(PLAIN) TOP USER PIPELINING RESP-CODES
| sslv2: 
|   SSLv2 supported
|   ciphers: 
|     SSL2_RC4_128_EXPORT40_WITH_MD5
|     SSL2_RC2_128_CBC_EXPORT40_WITH_MD5
|     SSL2_RC2_128_CBC_WITH_MD5
|     SSL2_RC4_128_WITH_MD5
|_    SSL2_DES_192_EDE3_CBC_WITH_MD5
| ssl-cert: Subject: commonName=ubuntu01/organizationName=OCOSA/stateOrProvinceName=There is no such thing outside US/countryName=XX
| Not valid before: 2008-04-25T02:02:48
|_Not valid after:  2008-05-25T02:02:48
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Host script results:
|_nbstat: NetBIOS name: PAYDAY, NetBIOS user: <unknown>, NetBIOS MAC: <unknown> (unknown)
|_clock-skew: mean: 40m00s, deviation: 1h37m58s, median: 0s
|_smb2-time: Protocol negotiation failed (SMB2)
| smb-os-discovery: 
|   OS: Unix (Samba 3.0.26a)
|   Computer name: payday
|   NetBIOS computer name: 
|   Domain name: 
|   FQDN: payday
|_  System time: 2025-07-01T12:33:42-04:00
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Tue Jul  1 12:33:44 2025 -- 1 IP address (1 host up) scanned in 14.70 seconds
```

## 80 - HTTP

On port 80, we discover the presence of CS-Cart, an ecommerce platform. We discover the presence of various vulnerabilities of it, especially the following one: https://www.exploit-db.com/exploits/48891. It seems the application is vulnerable to Authenticated RCE.
Without expectation, we opt to try basic combination of credentials to authenticate, succeeding with `admin:admin`.
By properly reading the exploit, we discover by the endpoint specified at the end that the upload of the reverse shell (which is converted in a `.pthml` file) must be a **skin**.
We then go in the view, on `http://$ip/admin.php?target=template_editor` of the Template Editor and proceed with uploading the .phtml file, alongside we'll start a netcat listener.
We then visit `/skins/$shell.phtml` and receive a connection back on our listener, gaining an initial foothold as `www-data`.

## Second Foothold

To gain the second foothold, the answer is simpler than ever. OSCP hid that in clear to suggest to try also easy combinations whenever we're enumerating. The password is equal to the user we're looking for, gaining a second foothold as `patrick:patrick`.
To connect in SSH we must enforce the usage of a specific HostKeyAlgorithm by typing the following ssh command:

```bash
ssh -oHostKeyAlgorithms=+ssh-rsa patrick@192.168.101.39
```

## Privilege Escalation

To gain privilege escalation the answer is as easy as gaining access as `patrick`. By typing `sudo -l` we discover that patrick can use any command as sudo. Thus, we impersonate root with the use of `sudo su`, gaining root of the machine.