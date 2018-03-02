
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

module.exports = subminus.implementForExistingType( Set, class SetWrapper {
	static from( collection ) {
		return Set.from( collection.*values() );
	}
	constructor( set ) {
		this.wrapped = set;
	}

	len() { return this.size; }
	has( item ) { return this.has( item ); }
	add( item ) { return this.add( item ); }
	clear() { this.clear(); }

	entries( fn ) {
		return this.wrapped[Symbol.iterator]();
	}
	forEach( fn ) {
		this.forEach( fn );
	}

	toString() {
		return `Set{${this.*map( (value)=>subminus.toString(value) ).*collect(Array).join(', ')}}`;
	}
});
