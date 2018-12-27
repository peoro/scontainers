
function logger( component ) {
	return getComponentLogger( component );
}
function noLogger( component ) {
	return getComponentLogger( component );
}

function getComponentLogger( component ) {
	switch( component ) {
		// case `loader`:
		case ``:
			return logger;
	}
	return noLogger;
}

for( let key in console ) {
	logger[key] = function() {
		return console[key].apply( console, arguments );
	};
}
for( let key in console ) {
	noLogger[key] = function() {};
}

module.exports = logger;
