var querystring = require( "querystring" );
var util = require( "util" );
var crypto = require( "crypto" );
var EventEmitter2 = require( "eventemitter2" ).EventEmitter2;

function xHeader( str ) {
	str = str.substring( 2 );

	return str.replace( /-([a-z])/gi, function( all, letter ) {
		return letter.toUpperCase();
	});
}

function Notifier( options ) {
	EventEmitter2.call( this, {
		wildcard: true,
		delimiter: "/"
	});

	this.options = options || {};
	if ( !this.options.secrets ) {
		this.options.secrets = {};
	}

	this.handler = this.handler.bind( this );
}
util.inherits( Notifier, EventEmitter2 );

Notifier.prototype.handler = function( request, response ) {
	var notifier = this;
	var data = "";
	var headers = {};

	request.setEncoding( "utf8" );
	request.on( "data", function( chunk ) {
		data += chunk;
	});

	request.on( "end", function() {
		var payload;

		// Parse the payload into structured data
		try {
			payload = notifier.parseRequest({
				data: data,
				headers: request.headers
			});
		} catch( error ) {

			// Invalid data, stop processing
			response.writeHead( 400 );
			response.end();
			notifier.emit( "error", error );
			return;
		}

		// Verify signature if necessary
		if ( !notifier.validateSignature( payload ) ) {
			response.writeHead( 400 );
			response.end();
			notifier.emit( "error", new Error( "Invalid signature" ) );
			return;
		}

		// Accept the request and close the connection
		response.writeHead( 202 );
		response.end();

		// Process the hook
		notifier.process( payload );
	});
};

Notifier.prototype.parseRequest = function( payload ) {

	// Parse the headers
	var headers = {};
	Object.keys( payload.headers ).forEach(function( header ) {
		if ( /^x-/.test( header ) ) {
			headers[ xHeader( header ) ] = payload.headers[ header ];
		}
	});

	// Parse the data
	var data = payload.data;
	if ( payload.headers[ "content-type" ] === "application/x-www-form-urlencoded" ) {
		data = querystring.parse( data );
		data = data.payload;
	}
	data = JSON.parse( data );

	// Generate parsed payload
	payload = {
		rawData: payload.data,
		data: data,
		headers: headers
	};

	var repository = data.repository;
	if ( repository ) {

		// The standard property is login
		// For legacy reasons, push events use name instead
		payload.owner = repository.owner.login || repository.owner.name;
		payload.repo = repository.name;
	} else {
		payload.owner = data.organization.login;
	}

	return payload;
};

Notifier.prototype.validateSignature = function( payload ) {
	var signature = payload.headers[ "hubSignature" ];
	var secrets = this.options.secrets;
	var secret;

	if ( payload.repo ) {
		secret = secrets[ payload.owner + "/" + payload.repo ];
	}

	if ( secret === undefined ) {
		secret = secrets[ payload.owner + "/*" ] || secrets[ "*" ];
	}

	// Hook does not require a signature, so it's always valid
	if ( !secret ) {
		return true;
	}

	// Hook requires a signature but was not signed
	if ( !signature ) {
		return false;
	}

	var signatureParts = signature.split( "=" );
	var algorithm = signatureParts[ 0 ];
	var digest = signatureParts[ 1 ];
	var hmac = crypto.createHmac( algorithm, secret );
	hmac.update( payload.rawData );
	var computedDigest = hmac.digest( "hex" );

	return computedDigest === digest;
};

Notifier.prototype.process = function( payload ) {
	var eventType = payload.headers.githubEvent;
	var eventName = [];

	// Ignore ping events that are sent when a new webhook is created
	if ( eventType === "ping" ) {
		return;
	}

	// Handle event-specific processing
	var processor = this.processors[ eventType ] || this.processors._default;
	var eventInfo = processor( payload );
	var event = eventInfo.data;
	var prefix = eventInfo.prefix;

	// Handle common properties
	event.type = eventType;
	event.payload = payload.data;

	event.owner = payload.owner;
	eventName.push( event.owner );

	if ( payload.repo ) {
		event.repo = payload.repo;
		eventName.push( event.repo );
	}
	eventName.push( event.type );

	if ( eventInfo.postfix ) {
		eventName.push( eventInfo.postfix );
	}

	eventName = eventName.join( "/" );
	this.emit( eventName, event );
};

Notifier.prototype.processors = {};

Notifier.prototype.processors._default = function( payload ) {
	return {
		data: {}
	};
};

Notifier.prototype.processors.pull_request = function( payload ) {
	var pullRequest = payload.data.pull_request;
	var base = pullRequest.base.sha;
	var head = pullRequest.head.sha;

	return {
		data: {
			pr: payload.data.number,
			base: base,
			head: head,
			range: base + ".." + head
		}
	};
};

Notifier.prototype.processors.push = function( payload ) {
	var raw = payload.data;
	var refParts = raw.ref.split( "/" );
	var type = refParts[ 1 ];

	var data = { commit: raw.after };

	if ( type === "heads" ) {
		// Handle namespaced branches
		data.branch = refParts.slice( 2 ).join( "/" );
	} else if ( type === "tags" ) {
		data.tag = refParts[ 2 ];
	}

	return {
		postfix: raw.ref.substr( 5 ),
		data: data
	};
};

exports.Notifier = Notifier;
