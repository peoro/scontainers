
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

module.exports = subminus.implementForExistingType( Map, class MapWrapper {
	static from( collection ) {
		if( collection.*kvIterator && collection.*entries ) {
			return Map.from( collection.*entries() );
		}
		else if( collection.*kvReorderedIterator ) {
			const map = new Map();
			collection.*forAny( (value, key)=>void map.set(key, value) );
			return map;
		}
		assert( false );
	}
	constructor( map ) {
		this.wrapped = map;
	}

	len() { return this.size; }
	get( key ) { return this.get( key ); }
	set( key, value ) { this.set( key, value ); }
	hasKey( key ) { return this.has(key); }
	clear() { this.clear(); }

	kvIterator() {
		return this[Symbol.iterator]();
	}

	entries() { return this; }
	forEach( fn ) {
		this.forEach( fn );
	}

	toString() {
		return `Map{${this.*map( (value, key)=>`${subminus.toString(key)}:${subminus.toString(value)}` ).*collect(Array).join(', ')}}`;
	}
});
