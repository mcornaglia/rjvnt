#box #vhost #dolibarr #PHPCommandInjection #credentials  #suid #enlightenment-binary #UnknownSUIDBinary

1. We discover that `board.htb` is the hostname of the given IP through the source code finding `info@board.htb`
2. We enumerate vhosts discovering `crm.board.htb`
3. On `crm.board.htb` we discover an application named `Dolibarr` and its version is `17.0.0`
4. This version is vulnerable to PHP Code Injection https://github.com/nikn0laty/Exploit-for-Dolibarr-17.0.0-CVE-2023-30253/tree/main
5. We couldn't manage to gain a shell even though the execution was identical to the walkthrough. We skipped that part and read that once on the machine as `www-data` we manage to look for the configuration file of `Dolibarr 17.0.0` that, by googling online it's located at `htdocs/conf/conf.php`.
6. Inside the file we discvover the credentials for what it seems to be the database user:
```text
$dolibarr_main_db_user='dolibarrowner';
$dolibarr_main_db_pass='serverfun2$2023!!';
```
7. After we opt to try that password against the user having a shell with `cat /etc/passwd | grep sh` which is `larissa`  and discover we can have a session with `larissa:serverfun2$2023!!`
8. Once on `larissa` we discover, through the help of WinPEAS, a mysterious binary named `/usr/lib/x86_64-linux-gnu/enlightenment/modules/cpufreq/linux-gnu-x86_64-0.23.1/freqset`
![[attachments/boardlight-1.png]]
9. By searching online for `freqset` we don't find anything, however, looking for `enlightenment` discovers us a potential 0day vulnerability for that https://security.snyk.io/vuln/SNYK-UNMANAGED-ENLIGHTENMENT-3025431
10. We download the following PoC https://github.com/d3ndr1t30x/CVE-2022-37706/blob/main/exploit.sh
11. And proceed to run it gaining root of the machine

## TIL

* Unusual SUID binaries might reveal something more
* Always track down users and try passwords discovered against them.
* If a specific SUID isn't found, try search for some naming in its path or try to `cat` it to understand what it's about
