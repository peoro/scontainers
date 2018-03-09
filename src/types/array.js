
'use strict';

const assert = require('assert');
const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

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

	len() { return this.length; }
	get( n ) { return this[n]; }
	nth( n ) { return this[n]; }
	hasNth( n ) {
		// TODO: assert that `n` is integer
		return n >= 0 && n < this.*len();
	}
	hasKey( n ) {
		// TODO: check that `n` is integer
		return n >= 0 && n < this.*len();
	}
	nthKey( n ) { return n; }
	setNth( n, value ) { this[n] = value; }
	add( value ) { this.push(value); }
	clear() { this.length = 0; }

	forEach( fn ) {
		this.forEach( fn );
	}

	toString() {
		return `[${this.*map( (value)=>subminus.toString(value) ).*collect(Array).join(', ')}]`;
	}
});
