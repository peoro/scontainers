
'use strict';

const {defineProperties, compileProtocolsForRootType, deriveProtocolsForRootType} = require('../processors/index.js')
const {assignProtocols, KVN, toString} = require('../util.js');

const symbols = require('../symbols');
use protocols from symbols;


symbols::assignProtocols( Array, {
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

Array::defineProperties({
	argKeys: []
});

Array::compileProtocolsForRootType({
	nToKey( n ) {
		return n;
	},
	keyToN( key ) {
		return key;
	},
	nthKVN( n ) {
		return new KVN( n, this.self.member( n, true ), n );
	},
	// add: nope
	len( compiler ) {
		return this.self.member(`length`);
	},
	// reverse: from nth+len
	// clear: nope
	// iterator: from nth
});

Array::deriveProtocolsForRootType({
	len() { return this.length; },
	nthUnchecked( n ) { return this[n]; },
	nToKey( n ) { return n; },
	keyToN( key ) { return key; },
	setNth( n, value ) { this[n] = value; },
	add( value ) { this.push(value); },
	clear() { this.length = 0; },

	forEach( fn ) { this.forEach( fn ); },

	toString() {
		return `[${this.*map( value=>value::toString() ).*collect(Array).join(', ')}]`;
	}
});

module.exports = Array;
