
global.id = function( strings ) {
	return strings[0];
}

module.exports = Object.assign( {},
	require('./properties.js'),
	require('./compiler.js'),
	require('./propagator.js'),
	require('./impl.js'),
	require('./reordered_iterator.js')
);
