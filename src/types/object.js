
const {traits, toStr, id, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

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

traits.scontainers.*addTraitFactories( Object.prototype, {
	ownProperties: Object.*wrapScontainer( require('./object_own_properties') ),
	properties: Object.*wrapScontainer( require('./object_enumerable_properties') ),
});
