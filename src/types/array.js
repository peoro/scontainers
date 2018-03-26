
'use strict';

const assert = require('assert');
const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

const {KVN} = require('../util');

/*
module.exports = subminus.implementForExistingType( Array, class ArrayWrapper {
	static from( collection ) {
		// TODO: this function should be specialized, just like the rest of what this lib does...
		if( collection.*forEach ) {
			return Array.from( collection.*values() );
		}
		else if( collection.*forAny ) {
			const array = new Array();
			collection.*forAny( (value)=>void array.push(value) );
			return array;
		}
		assert( false, `${collection} not iterable` );
	}
	constructor( arr ) {
		this.wrapped = arr;
	}

	toString() {
		return `[${this.*map( (value)=>subminus.toString(value) ).*collect(Array).join(', ')}]`;
	}
});
*/

const {defineProperties, compileProtocolsForRootType, implementCoreProtocols} = require('../processors/index.js')
const {implementSymbols} = require('../util.js');

Array::implementSymbols({
	from( collection ) {
		// TODO: this function should be specialized, just like the rest of what this lib does...
		if( collection.*forEach ) {
			return Array.from( collection.*values() );
		}
		else if( collection.*forAny ) {
			const array = new Array();
			collection.*forAny( (value)=>void array.push(value) );
			return array;
		}
		assert( false, `${collection} not iterable` );
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

Array.prototype::implementSymbols({
	len() { return this.length; },
	get( n ) { return this[n]; },
	nth( n ) { return this[n]; },
	hasKey( n ) {
		// TODO: check that `n` is integer
		return n >= 0 && n < this.*len();
	},
	nToKey( n ) { return n; },
	keyToN( key ) { return key; },
	setNth( n, value ) { this[n] = value; },
	add( value ) { this.push(value); },
	clear() { this.length = 0; },

	forEach( fn ) { this.forEach( fn ); },
});

Array::implementCoreProtocols();


module.exports = subminus.implementForExistingType( Array, function(){} );

// module.exports = Array; // subminus.implementForExistingType( Array );
