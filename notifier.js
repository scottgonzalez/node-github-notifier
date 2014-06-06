var http = require( "http" ),
	querystring = require( "querystring" ),
	util = require( "util" ),
	EventEmitter2 = require( "eventemitter2" ).EventEmitter2;

function Notifier() {
	var notifier = this;
	this.server = http.createServer(function( request, response ) {
		var data = "";
		request.setEncoding( "utf8" );
		request.on( "data", function( chunk ) {
			data += chunk;
		});
		request.on( "end", function() {
			try {
				data = querystring.parse( data );
				data = JSON.parse( data.payload );
			} catch( error ) {
				// Invalid data, stop processing
				response.writeHead( 400 );
				response.end();
				notifier.emit( "error", error );
				return;
			}

			// Accept the request and close the connection
			response.writeHead( 202 );
			response.end();

			try {
				notifier.process( data );
			} catch ( error ) {
				notifier.emit( "error", error );
			}
		});
	});

	EventEmitter2.call( this, {
		wildcard: true,
		delimiter: "/"
	});
}
util.inherits( Notifier, EventEmitter2 );

Notifier.prototype.listen = function() {
	this.server.listen.apply( this.server, arguments );
	return this;
};

Notifier.prototype.process = function( raw ) {
	if (!raw || raw.zen) {
		return;
	}
	var refParts = raw.ref.split( "/" ),
		type = refParts[ 1 ],
		owner = raw.repository.owner.name,
		repo = raw.repository.name,
		data = {
			commit: raw.after,
			owner: owner,
			repo: repo,
			raw: raw
		},
		eventName = owner + "/" + repo + "/" + raw.ref.substr( 5 );

	if ( type === "heads" ) {
		// Handle namespaced branches
		data.branch = refParts.slice( 2 ).join( "/" );
	} else if ( type === "tags" ) {
		data.tag = refParts[ 2 ];
	}

	this.emit( eventName, data );
};

exports.Notifier = Notifier;
exports.createServer = function() {
	return new Notifier();
};
