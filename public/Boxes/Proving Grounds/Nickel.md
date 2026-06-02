#box

*Created: 1/31/2026*

### Step 1

**Tags:** #HTTP-Verb-Tampering #Credentials-Leak

**Command:**
```bash
curl -X POST http://192.168.192.99:33333/list-running-procs -H "Content-Length: 0"
```

*Port: 8089 | 💎 GEM*

> 
> This machine hosts a service on port 8089. Once landed on this port 3 buttons reconduct us to a given endpoint with an unreachable IP. The endpoints however, if tried on our owned IP provides us a response. After some trial and error we discover that the endpoint `list-running-procs` exposes the list of processes running on the target machine, exposing a base64 credential that can be used to authenticate through SSH.

---

### Step 2

**Tags:** #pdf2john #Cracking

**Command:**
```bash
scp ariah@192.168.192.99:C:/ftp/Infrastructure.pdf ./
```

> 
> Obtained the credentials to SSH we can authenticate inside the machine through SSH. Inside `C:\ftp` we discover a PDF file, thus we proceed to download it on our end. The PDF is encrypted with a password so we convert the PDF file to John and crack its password.

---

### Step 3

**Tags:** #RCE #PowerShell #PowerShell-WebServer #Reverse-Shell

**Command:**
```bash
curl http://127.0.0.1/?whoami
```

*Port: 80 | 💎 GEM*

> 
> Once recovered the password for the PDF `ariah4168` we open it and discover that the pdf contains 3 URLs probably referring to the webservers running on the target machine. After some trials we understand that the first one pointing at `http://nickel/?` means that the `?` is basically being the input for our system command. We try to curl inside SSH at a basic URL to first point out that it works, finally, after finding out  that we're basically having Code Execution (this is basically a webshell to us), we prompt a reverse shell to get a shell as root.
> 
> `curl http://127.0.0.1/?backup`, that's simply a try-out call, but it returns the following message:
> 
```html
<!doctype html><html><body>dev-api started at 2025-12-07T05:30:22

        <pre>
Error while executing 'backup'

The term 'backup' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was in
cluded, verify that the path is correct and try again.</pre>
```
> 
> Recalls of something? That's the same error PowerShell gives us whenever we prompt a wrong command.
> This basically means the commands we're passing there are being passed directly to powershell. If the user running powershell is an Administrator or SYSTEM, we can basically get Command Execution as one of the machine owners.
> 
> In that specific scenario, we can basically say that this specific webserver is acting as a webshell to us.

---

