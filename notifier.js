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
			if ( notifier.process( data ) ) {
				// Payload parsing successful
				response.writeHead( 202 );
			} else {
				// Unrecognized payload
				response.writeHead( 400 );
			}
			response.end();
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

Notifier.services = [
	/* github */
	function ( raw ) {
		if ( raw.ref )
		{
			return false;
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
		return true;
	},
	/* bitbucket */
	function ( raw ) {
		if ( raw.canon_url !== 'https://bitbucket.org' || 'undefined' === raw.repository ) {
			return false;
		}

		var commit,
			i,
		    repoParts = raw.repository.absolute_url.split( "/" ),
			owner = repoParts[ 1 ],
			repo = repoParts[ 2 ],
			data = {
				commit: null,
				owner: owner,
				repo: repo,
				raw: raw
			},
			nodes = [];

		for( i = 0; i < raw.commits.length; i++ ) {
			commit = raw.commits[ i ];

			if ( ( commit.branches && commit.branches.length )
				|| null != commit.branch) {

				if ( commit.branch != null)
				{
					data.branch = commit.branch
				}

				data.commit = commit.node;
				eventName = owner + "/" + repo + "/" + commit.node.substr( 5 );
				this.emit( eventName, data );
			}
		}

		return true;
	}
]

Notifier.prototype.process = function( raw ) {
	var i = Notifier.services.length - 1;

	for ( ; i >= 0; i-- ) {
		if ( Notifier.services[ i ].call( this, raw ) ) {
			return true;
		}
	}

	return false;
};

exports.Notifier = Notifier;
exports.createServer = function() {
	return new Notifier();
};
