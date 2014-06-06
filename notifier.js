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
				if ( request.headers[ "content-type" ] === "application/x-www-form-urlencoded" ) {
					data = querystring.parse( data );
					data = data.payload;
				}
				data = JSON.parse( data );
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

			notifier.process( data );
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
};

Notifier.prototype.process = function( raw ) {
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
