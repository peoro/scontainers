
'use strict';

const {defineProperties, compileProtocolsForRootType, deriveProtocolsForRootType} = require('../processors/index.js')
const {assignProtocols, KVN, toString} = require('../util.js');
const symbols = require('../symbols');
const {forEach, entries, map, collect} = symbols;

symbols::assignProtocols( Map, {
	from( collection ) {
		if( collection.*entries ) {
			return Map.from( collection.*entries() );
		}
		else if( collection.*forEach ) {
			const map = new Map();
			collection.*forEach( (value, key)=>void map.set(key, value) );
			return map;
		}
		assert( false );
	}
});

Map::defineProperties({
	argKeys: []
});

Map::compileProtocolsForRootType({
	getKVN( key ) {
		return new KVN( key, this.self.member(`get`).call( key ) );
	},
	len( compiler ) {
		return this.self.member(`size`);
	},
});

Map::deriveProtocolsForRootType({
	len() { return this.size; },
	getUnchecked( key ) { return this.get( key ); },
	hasKey( key ) { return this.has( key ); },
	set( key, value ) { this.set( key, value ); },
	clear() { this.clear(); },

	kvIterator() {
		return this[Symbol.iterator]();
	},
	entries() { return this; },
	forEach( fn ) { this.forEach( fn ); },

	toString() {
		return `Map{${this.*map( (value, key)=>`${key::toString()}:${value::toString()}` ).*collect(Array).join(', ')}}`;
	}
});

module.exports = Map;
