
'use strict';

const traits = require('../symbols.js');
const utils = require('../util.js');
const {assignProtocolFactories} = utils;

use traits * from utils;
use traits * from traits;


Object.*implScontainer({
	from( collection ) {
		// TODO: this function should be specialized, just like the rest of what this lib does...
		if( collection.*forEach ) {
			const object = {};
			collection.*forEach( (value, key)=>void (object[key] = value) );
			return object;
		}
		assert( false );
	}
});

traits::assignProtocolFactories( Object.prototype, {
	ownProperties: Object.*wrapScontainer( require('./object_own_properties') ),
	properties: Object.*wrapScontainer( require('./object_enumerable_properties') ),
});
