# node-git-notifier

An EventEmitter built on top of GitHub post-receive hooks.

Support this project by [donating on Gittip](https://www.gittip.com/scottgonzalez/).

## Installation

```sh
npm install git-notifier
```

## Usage

```js
var server = require( "git-notifier" ).createServer();
server.listen( 8000 );

server.on( "scottgonzalez/node-git-notifier/heads/**", function( data ) {
	console.log( "New commit: " + data.commit );
});
```

## API

All events follow a simple format: `{username}/{repo}/{refspec}`

The server is an EventEmitter2 instance and therefore supports namespacing,
which makes the notifier quite powerful and flexible.

### Event Data

All events receive a single data parameter with the following properties:

* `commit`: The SHA of the last commit.
* `owner`: The owner of the repo.
* `repo`: The name of the repo.
* `raw`: The raw post-receive data.

### Listen for commits on a branch

*Note: Commits to a branch contain a `branch` property in the data.*

Listen for commits on the master branch:

```js
server.on( "scottgonzalez/node-git-notifier/heads/master", function( data ) {
	console.log( "New commit on master: " + data.commit );
});
```

Listen for commits on a namespaced branch:

```js
server.on( "scottgonzalez/node-git-notifier/heads/some/deep/branch", function( data ) {
	console.log( "New commit on some/deep/branch: " + data.commit );
});
```

Listen for commits on any branch in a specific namespace:

```js
server.on( "scottgonzalez/node-git-notifier/heads/ns/**", function( data ) {
	console.log( "New commit on " + data.branch + ": " + data.commit );
});
```

Listen for commits on any branch:

```js
server.on( "scottgonzalez/node-git-notifier/heads/**", function( data ) {
	console.log( "New commit on " + data.branch + ": " + data.commit );
});
```

### Listen for new tags

*Note: Commits to a tag contain a `tag` property in the data.*

```js
server.on( "scottgonzalez/node-git-notifier/tags/*", function( data ) {
	console.log( "Created new tag: " + data.tag );
});
```

### Listen to any commit or tag

```js
server.on( "scottgonzalez/node-git-notifier/**", function( data ) {
	console.log( "More activity on node-git-notifier..." );
});
```

### Listen to any commit or tag on any repo for a specific user

```js
server.on( "scottgonzalez/**", function( data ) {
	console.log( "More activity on " + data.repo + "..." );
});
```

### Listen to any commit or tag on any repo for any user

```js
server.on( "**", function( data ) {
	console.log( "More activity on " + data.owner + "/" + data.repo + "..." );
});
```

## License

Copyright Scott González. Released under the terms of the MIT license.

---

Support this project by [donating on Gittip](https://www.gittip.com/scottgonzalez/).
