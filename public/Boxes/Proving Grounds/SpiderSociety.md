#box

*Created: 1/27/2026*

### Step 1

**Tags:** #FFUF #Deep-Fuzzing

**Command:**
```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-lowercase-2.3-big.txt -u http://spidersociety.org/FUZZ -c -ic
```

*Port: 80*

> 
> On port 80 we discover the presence of a website with apparently a login button leading to a 404 page. After some consistent fuzzing, with the wordlist: `DirBuster-2007_directory-list-lowercase-2.3-big.txt` we discover the `/libspider` endpoint with a login page.

---

### Step 2

**Tags:** #ftp #Credentials-Leak

**Command:**
```bash
ftp ss_ftpbckuser@192.168.202.214 -p 2121
# With password: ss_WeLoveSpiderSociety_From_Tech_Dept5937!
```

*Port: 2121*

> 
> After authenticating with  `admin:admin` let us in and inside of it we find the credentials for the FTP on port 2121

---

### Step 3

**Tags:** #.env #Credentials-Leak #SSH

**Command:**
```bash
curl http://spidersociety.org/libspider/.fuhfjkzbdsfuybefzmdbbzdcbhjzdbcukbdvbsdvuibdvnbdvenv
```

*Port: 2121*

> 
> Once inside the FTP we notice a strange file. Downloading the whole content of the `libspider` folder tells us that this particular alphanumeric file is an env file. That file can be reached from the browser, exposing another set of credentials that can be used for the SSH Access

---

### Step 4

**Tags:** #systemd #systemctl #services

**Command:**
```bash
vim /etc/systemd/system/spiderbackup.service
```

> 
> Once authenticated we find out that our user can (as sudo) restart a service called `spiderbackup.service` and reload the systemctl daemon. We can overwrite the ExecStart script of the service and then restart the daemon and the service as sudo to obtain a shell as root.

---

