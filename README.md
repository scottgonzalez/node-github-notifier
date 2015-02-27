# node-git-notifier

An EventEmitter built on top of [GitHub Webhooks](https://developer.github.com/webhooks/).

Support this project by [donating on Gratipay](https://gratipay.com/scottgonzalez/).

## Installation

```sh
npm install git-notifier
```

## Usage

```js
var http = require( "http" );
var Notifier = require( "git-notifier" ).Notifier;
var notifier = new Notifier();
var server = http.createServer();
server.on( "request", notifier.handler );
server.listen( 8000 );

notifier.on( "scottgonzalez/node-git-notifier/push/heads/**", function( data ) {
	console.log( "New commit: " + data.commit );
});
```

## API

All events follow a simple format: `{username}/{repo}/{eventname}`

The notifier is an EventEmitter2 instance and therefore supports namespacing, which makes the notifier quite powerful and flexible. Notifiers have a `handler` method which is designed to be used as an HTTP request listener. In the basic usage above, the notifier will listen to all requests, however this can be controlled however you want since it is just a request listener. This also makes it very simple to integrate into an existing server.

The notifier supports both `application/x-www-form-urlencoded` and `application/json` payload formats and will detect the content type automatically.

### Events

All events receive a single data parameter with some common data and event-specific data.

Some events will also have additional levels of data in the event name in order to provide simpler customizations via wildcards. This is currently limited to `push` events, but may be extended by adding [additional processors](#processors) to the notifier.

#### Common Event Data

* `type`: The type of event. See [Webhook Events](https://developer.github.com/webhooks/#events) for a full list of possible events.
* `owner`: The owner of the repo.
* `repo`: The name of the repo.
* `payload`: The raw GitHub payload data. See [Event Types & Payloads](https://developer.github.com/v3/activity/events/types/) for detailed information on the payloads for each event type.

#### pull_request

Additional data:

* `pr`: The pull request number. This is the same as `payload.number`.
* `base`: The SHA of the base. This is the same as `payload.pull_request.base.sha`.
* `head`: The SHA of the head. This is the same as `payload.pull_request.head.sha`.
* `range`: The commit range for the pull request.

#### push

Push events add the refspec to the event name. For example, a push to the master branch of `scottgonzalez/node-git-notifier` will result in a `scottgonzalez/node-git-notifier/push/heads/master` event and a push that creates a `1.2.3` tag will result in a `scottgonzalez/node-git-notifier/push/tags/1.2.3` event.

Additional data:

* `commit`: The HEAD of the branch after the push. This is the same as `payload.after`.
* `branch`: The name of the branch, if a branch was pushed.
* `tag`: The name of the tag, if a tag was pushed.

### Processors

In order to provide event-specific customizations of data and event names, additional processors can be added to `Notifier.prototype.processors` (or on the `processors` property of a notifier instance). `processors` is just a hash of methods where the key is the event name and the value is a function with the following signature:

`function( payload )`
* `payload` (Object): The payload, containing the headers and data from the webhook.
  * `headers` (Object): A hash of the headers sent by GitHub.
  * `data` (Object): The actual payload sent by GitHub.
* return value: Object
  * `data` (Object): Additional data to include with the event.
  * `postfix` (String; optional): Additional levels of data to append to the event name.

## License

Copyright Scott González. Released under the terms of the MIT license.

---

Support this project by [donating on Gratipay](https://gratipay.com/scottgonzalez/).
