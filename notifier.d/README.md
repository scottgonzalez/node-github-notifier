Each .js file in this directory should export a function that takes a notify server and a 
function to call when it wants to execute the shell file of the same name

Examples:

## notifier.js
```javascript
module.exports = function( server, exec ) {
  server.on( "scottgonzalez/node-git-notifier/heads/master", exec );
};
```

## notifier.sh
```shell
#!/bin/bash
cd /usr/local/notifier
git fetch origin
echo "Checking out $1"
git checkout --force $1
npm install
nohup /etc/init.d/notify-server restart &
```
