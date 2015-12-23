# node-github-notifier

An EventEmitter built on top of [GitHub Webhooks](https://developer.github.com/webhooks/).

Support this project by [donating on Gratipay](https://gratipay.com/scottgonzalez/).

## Installation

```sh
npm install github-notifier
```

## Usage

```js
var http = require( "http" );
var Notifier = require( "github-notifier" ).Notifier;
var notifier = new Notifier();
var server = http.createServer();
server.on( "request", notifier.handler );
server.listen( 8000 );

notifier.on( "scottgonzalez/node-github-notifier/push/heads/**", function( data ) {
	console.log( "New commit: " + data.commit );
});
```

## API

### Overview

All events follow a simple format: `{username}/{repo}/{eventname}`

The notifier is an EventEmitter2 instance and therefore supports namespacing, which makes the notifier quite powerful and flexible. Notifiers have a `handler` method which is designed to be used as an HTTP request listener. In the basic usage above, the notifier will listen to all requests, however this can be controlled however you want since it is just a request listener. This also makes it very simple to integrate into an existing server.

The notifier supports both `application/x-www-form-urlencoded` and `application/json` payload formats and will detect the content type automatically.

### Notifier( options )

Creates a new notifier instance.

* `options` (Object): The options for configuring the notifier
  * `secrets` (Object): Which secrets to use for signing webhooks

#### Secrets

GitHub supports the use of secrets to [secure your webhooks](https://developer.github.com/webhooks/securing/). When using secrets, the notifier can verify that the webhook actually came from GitHub by validating the signature sent with the payload.

Secrets can be specified at the global, owner/organization, or repository level. The `secrets` option takes an object with the owner or repository as the keys and the secret as the value.

```js
var notifier = new Notifier({
	secrets: {
		"*": "applies to every webhook",
		"scottgonzalez/*": "applies to all webhooks with an owner of scottgonzalez",
		"scottgonzalez/node-git-notifier": "applies only to webhooks for scottgonzalez/node-git-notifier"
	}
});
```

More specific rules override more geric rules, so the above is a valid configuration. In the case that most, but not all, repositories from a single owner use the same secret, specifying the secret at the owner level, then overriding at the repo level may significantly simplify the configuration. In the case that you have such a setup, but have a repo that doesn't use a secret, you can set the secret for that repo to `null` to disable the check.

*NOTE: If you have GitHub configured to use a secret, but you don't have the notifier configured to use a secret, all requests will be allowed through. The notifier will only validate requests if a secret has been specified in its configuration options.*

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

Push events add the refspec to the event name. For example, a push to the master branch of `scottgonzalez/node-github-notifier` will result in a `scottgonzalez/node-github-notifier/push/heads/master` event and a push that creates a `1.2.3` tag will result in a `scottgonzalez/node-github-notifier/push/tags/1.2.3` event.

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
