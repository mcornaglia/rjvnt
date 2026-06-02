#box #keepass  #puttygen #ssh-key-authentication 
The box involves an authentication discovery and then a process of discovery throughout the request tracker. Once achieve the user's password it's possible to connect to the machine. On the machine a zip file will contain a dump of a Keepass database and the database itself. Dumping the password from the memory leveraging [CVE-2023-32784](https://nvd.nist.gov/vuln/detail/cve-2023-32784). When the password is discovered by deriving the partially extracted password (The first character is missing due to the nature of the CVE) to its full password (googling the leftover of the password extracted) it's then possible to authenticate to the keepass db within kpcli. In the database a putty private key is contained and can be converted within `puttygen` to a openssh-private key to authenticate as root within ssh.

## Nmap

```nmap
Starting Nmap 7.95 ( https://nmap.org ) at 2025-03-21 22:18 UTC
Nmap scan report for keeper.htb (10.129.229.41)
Host is up (0.083s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 35:39:d4:39:40:4b:1f:61:86:dd:7c:37:bb:4b:98:9e (ECDSA)
|_  256 1a:e9:72:be:8b:b1:05:d5:ef:fe:dd:80:d8:ef:c0:66 (ED25519)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
|_http-server-header: nginx/1.18.0 (Ubuntu)
|_http-title: Site doesn't have a title (text/html).
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 10.45 seconds
```
## Common Credentials Auth

Reaching port 80 we read a message that redirects us to `tickets.keeper.htb`. We map also this combination to our hosts file and then reach the other subdomain.
We discover an authentication panel. We try with Common Credentials and discover the combination `root:password`
## RT Investigation

After some in-depth investigation we discover that in the panel `Admin > Users > Select` we can consult the existing user, finding another user other than root called `lnorgaard`. Inside its profile a password is written in clear in the comments about the user, `Welcome2023!`.
Alongside this discovery, `Search > Tickets > Recently Viewed` shows ticket `#300000`. By navigating into we discover that somebody has uploaded a dump file that has then been removed for security reasons.
## SSH Auth as the user

We try to authenticate in ssh with `ssh lnorgaard@keeper.htb` with the password discovered above `Welcome2023!` and succeed, obtaining the first flag:
User: `c15b231efda46c145b32f7e8a9fcf3f4`
By looking at the current folder we discover a `RT30000.zip` file. We copy it to our machine with `scp lnorgaard@keeper.htb:RT30000.zip ./` and `unzip` it
Once unzipped, we gain a  `.kbdx` password-protected by its master password and a `.dmp` file.
## Dumping the Password from the dump file and opening the .kbdx

By looking online for "keepass dump read" we swiftly discover the existence of [CVE-2023-32784](https://nvd.nist.gov/vuln/detail/cve-2023-32784). The CVE has its basis on the fact that whenever a password is written in the master password, each character is written in memory and persisted in it. This enables the discovery of the whole password except for the first character (the memory is persisted because whenever the password is typed the latest character is kept in sight. This doesn't happen with the first character which is automatically substituted by the password iconic dot character • [more on that here](The flaw exploited here is that for every character typed, a leftover string is created in memory. Because of how .NET works, it is nearly impossible to get rid of it once it gets created. For example, when "Password" is typed, it will result in these leftover strings: •a, ••s, •••s, ••••w, •••••o, ••••••r, •••••••d. The POC application searches the dump for these patterns and offers a likely password character for each position in the password.))
To extract the dump we can use the PoC specified [here](https://github.com/vdohney/keepass-password-dumper). It requires dotnet, and dotnet 7.0 to be precise. To make it work we proceeded with the following, by downloading the SDK, accessing the PoC folder and using dotnet to run the script on the dump file:

```bash title:'Memory Dump preparation'
wget https://builds.dotnet.microsoft.com/dotnet/Sdk/7.0.410/dotnet-sdk-7.0.410-linux-x64.tar.gz
tar -xzvf dotnet-sdk-7.0.410-linux-x64.tar.gz
../dotnet run KeePassDumpFull.dmp ./pwdlist.txt
```

The execution will extract us the following file:
```txt
•ødgrød med fløde
•Ïdgrød med fløde
•,dgrød med fløde
•ldgrød med fløde
•`dgrød med fløde
•-dgrød med fløde
•'dgrød med fløde
•]dgrød med fløde
•§dgrød med fløde
•Adgrød med fløde
•Idgrød med fløde
•:dgrød med fløde
•=dgrød med fløde
•_dgrød med fløde
•cdgrød med fløde
•Mdgrød med fløde
```

The `•` character is hidden due to the CVE nature. We can either enumerate the first character by crafting a file with all the available characters and try that combination within john on the .kbdx file or try to look up online since it feels a finnish name. By searching for the available characters we obtain the following [name](https://www.google.com/search?client=firefox-b-d&q=%C3%B8dgr%C3%B8d+med+fl%C3%B8de). We then try to add a `r` in front of the string `rødgrød med fløde` and try to authenticate to the .kbdx with kpcli, succeeding.

```bash title:'Authenticate to the keepass db'
kpcli
open passcodes.kbdx
```
## Converting Putty private key to openssh-private key

Navigating the database we discover in the `/Network` folder two files. We execute the `show -f` command to also unhide the password from the database. In the first file, `keeper.htb (Ticketing Server)` we discover the existence of a password related to root and a PuTTy private key.
By looking online, we discover that we can try to convert that putty key into an openssh-private key within `puttygen`, but puttygen must be 0.7.5 due to the version of the PuTTY-User-Key-File-3.
We copy the content of the note in the keepass file and paste it into a new file. In order to make puttygen work we need to strip all the empty characters in front of our password. To do so we can use vim and strip the spaces accordingly:

```vim
%s       //g # The spaces is the amount of spaces to strip
```

Once we have the putty private key file properly set up, we can run the following command:

```bash title:'Generating openssh-private key from puttygen ppk'
puttygen priv_key.ppk -O private-openssh -o id_rsa
```

Once we obtained the `id_rsa` key we first have to `chmod 600 id_rsa` to set its execution permission correctly, then we can authenticate as root with:
```bash
ssh -i id_rsa root@keeper.htb
```

And catch the final flag
Root: `eea479a47ed2ca54b8a89592d4b2bbda`