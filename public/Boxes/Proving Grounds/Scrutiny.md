#box

*Created: 1/18/2026*

### Step 1

**Tags:** #Credentials-Leak #SSH_Key_Authentication #JohnTheRipper #RCE #ssh2john #TeamCity

🔗 **URL/Link:** https://raw.githubusercontent.com/Stuub/RCity-CVE-2024-27198/refs/heads/main/RCity.py

**Command:**
```bash
# Create an user through Authentication bypass
python3 RCity.py -t http://teams.onlyrands.com/

# Convert the private key retrieve into a john hash and then crack it
ssh2john id_rsa > hash
john hash --wordlist=/usr/share/wordlists/rockyou.txt
```

*Port: 80 | 💎 GEM*

> 
> The machine exposes on port 80 a website. By investigating the source code we discover the website has a link pointing at `teams.onlyrands.com`. Adding this to our `/etc/hosts` permit us to reach a TeamCity instance verso 2023.05.4.  Using [CVE-2024-27198](https://raw.githubusercontent.com/Stuub/RCity-CVE-2024-27198/refs/heads/main/RCity.py) we authenticate and discover an `id_rsa` leftover. We download it, adjust it and then crack it with `ssh2john` to discover the key password to authenticate with the user `marcot`
> 
> That version of TeamCity is vulnerable to Unauthenticated RCE [CVE-2024-27198](https://raw.githubusercontent.com/Stuub/RCity-CVE-2024-27198/refs/heads/main/RCity.py). This exploit permits us to create an account and authenticate inside the web service but not to execute arbitrary code on a shell. Inside the webservice, we realize that an user, Marco Tillman has mistakenly uploaded a private key `id_rsa` to a repository and then deleted it. Git history though kept it.
> We download the private key, change it to `600` as octal permission and then we get the 4 users shown inside the service and use [username-anarchy](https://github.com/urbanadventurer/username-anarchy) to generate a list of possible usernames. Retrieving the pattern to be name+(first letter of surname) we authenticate with `marcot` and the private key retrieved. However, the authentication still asks for a password.
> We use `ssh2john` to convert the key into a hash and then proceed to crack it with `rockyou.txt` finding that the key password is `cheer`

---

### Step 2

**Tags:** #mail #Credentials-Leak

**Command:**
```bash
mail
```

> 
> Once authenticated in SSH we discover the presence of an email (the SSH prompts us that 'we have emails' at the end of the welcome message). By doing `mail` we access the email prompt and on the first email we discover the presence of a clear-text password for the user `matthewa`
> 
> It usually shall be a good hint to check for emails when the system has a SMTP port open (either on the outside and locally)

---

### Step 3

**Tags:** #Hydra #Credentials-Leak

**Command:**
```bash
# Get the password
cat /home/matthewa/.~

# Bruteforce to check whose password this is
hydra -L confirmed_users.txt -p RefriedScabbedWasting502 -f 192.168.184.91 ssh
```

> 
> Once authenticated as `matthewa` inside his home folder we discover a file `.~` containing a clear-text password that has been leaked from another user, a certain `dach`

---

### Step 4

**Tags:** #systemd #less

🔗 **URL/Link:** https://nvd.nist.gov/vuln/detail/cve-2023-26604

**Command:**
```bash
sudo /usr/bin/systemctl status teamcity-server.service
# once in less we do the following and gain a root shell
!sh
```

> 
> Once discovered the user was `briand` we authenticate with that user and discover he can executes as sudo `/usr/bin/systemctl status teamcity-server.service`. We leverage  [CVE-2023-26604](https://nvd.nist.gov/vuln/detail/cve-2023-26604) a vulnerability involving `systemd` versions <= 247 that permits us to gain a root shell through less command execution

---

