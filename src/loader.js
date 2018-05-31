
const path = require('path');
const scontainersPath = path.dirname( require.resolve('./utils.js') );
const logger = require('./logger.js')(`loader`);

function load( opts={} ) {
	const backupCache = {};

	logger.log();
	logger.log(`Cleaning require.cache`);
	logger.group();
	// clearing the require cache for scontainers' directories
	for( let modPath in require.cache ) {
		modPath = require.resolve(modPath);
		if( modPath.startsWith(scontainersPath) ) {
			logger.log( modPath );
			backupCache[modPath] = require.cache[modPath];
			delete require.cache[modPath];
		}
	}
	logger.groupEnd();

	logger.log(`Reloading scontainers`);
	logger.group();

	const options = require('./options.js');
	Object.assign( options, opts );

	const scontainers = require('./index.js');

	// restoring the older require cache
	Object.assign( require.cache, backupCache );

	logger.groupEnd();

	return scontainers;
}

module.exports = load;

if( require.main === module ) {
	const assert = require('assert');

	let getFn;

	{
		const scontainers = require('./index.js');
		use traits * from scontainers;
		assert( ! [].*iter );

		getFn = [].*map( x=>x ).*get.factory().toString();
		assert( getFn === [].*map( x=>x ).*get.factory().toString() );
	}

	{
		const scontainers = load( {debug:true, generation:false} );
		use traits * from scontainers;
		assert( !! [].*iter );

		assert( getFn !== [].*map( x=>x ).*get.factory().toString() );
	}

	{
		const scontainers = load();
		use traits * from scontainers;
		assert( ! [].*iter );

		assert( getFn === [].*map( x=>x ).*get.factory().toString() );
	}
}
