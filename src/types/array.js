
const {traits, toStr, id, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

traits.scontainers.*implTraits( Array, {
	from( collection ) {
		// TODO: this function should be specialized, just like the rest of what this lib does...
		if( collection.*values ) {
			return Array.from( collection.*values() );
		}
		else if( collection.*forEach ) {
			const array = new Array();
			collection.*forEach( (value)=>void array.push(value) );
			return array;
		}
		throw new Error( `${collection} not iterable` );
	}
});

Array.*describeScontainer({
	argKeys: []
});

Array.*implCoreGenerators({
	nToKey( n ) {
		return n;
	},
	keyToN( key ) {
		return key;
	},
	nthUnchecked( n ) {
		return this.self.*member( n, true );
	},
	// add: nope
	len( compiler ) {
		return this.self.*member(`length`);
	},
	// reverse: from nth+len
	// clear: nope
	// iterator: from nth
});

Array.*implCoreTraits({
	len() { return this.length; },
	nthUnchecked( n ) { return this[n]; },
	nToKey( n ) { return n; },
	keyToN( key ) { return key; },
	setNth( n, value ) { this[n] = value; },
	add( value ) { this.push(value); },
	clear() { this.length = 0; },

	forEach( fn ) { this.forEach( fn ); },

	toString() {
		return `[${this.*map( value=>value::toStr() ).*collect(Array).join(', ')}]`;
	}
});

module.exports = Array;
