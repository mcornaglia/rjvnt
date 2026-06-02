#box #IRC #RCE #suid #service-binary-hijacking 
1. The machine exposes a few ports, one of which allow us to perform a banner grabbing, port 65534. The port clearly shows that the service running is `Unreal3.2.8.1`. With a quick online research, we discover that the service is vulnerable to a Backdoor Command Execution. The vulnerability can be exploited within metasploit, but finding an exploit on github permits us to exploit it through Python https://github.com/Ranger11Danger/UnrealIRCd-3.2.8.1-Backdoor
2. Once download, we can run it to gain a shell with:
```sh
python3 exploit.py -payload python 10.129.11.198 65534
```
3. After landing on the machine as the user `ircd` we discover the presence of a suspicious binary with a SUID set named `/usr/bin/viewuser`
```sh
find / -perm /4000 -ls 2>/dev/null
```
4. By downloading it on our machine, we open it with `Ghidra` to discover what this binary is doing and discover that the command has 3 stages. The first, executes the binary `who` as the current user, the it sets the UID to 0, finally it expects to find a binary in `/tmp` named `listusers`. 
![[attachments/irked-1.png]]
5. We craft a malicious binary that sets the SUID to the `/bin/bash` binary and execute again `viewuser` binary
```sh
echo -e '#!/bin/bash\nchmod 4777 /bin/bash' > /tmp/listusers; chmod +x /tmp/listusers
```
6. Finally, we execute again the `viewuser` binary, obtaining a shell as `root`/