
'use strict';

const {defineProperties, compileProtocolsForRootType, deriveProtocolsForRootType} = require('../processors/index.js')
const {assignProtocols, KVN, toString} = require('../util.js');

const symbols = require('../symbols');
use protocols from symbols;


symbols::assignProtocols( Set, {
	from( collection ) {
		if( collection.*values ) {
			return Set.from( collection.*values() );
		}
		else if( collection.*forEach ) {
			const set = new Set();
			collection.*forEach( value=>void set.add(value) );
			return set;
		}
		assert( false );
	}
});

Set::defineProperties({
	argKeys: []
});


Set::deriveProtocolsForRootType({
	len() { return this.size; },
	has( item ) { return this.has( item ); },
	add( item ) { return this.add( item ); },
	clear() { this.clear(); },

	kvIterator() {
		return {
			it: this[Symbol.iterator](),
			next() {
				const next = this.it.next();
				if( ! next.done ) {
					return new KVN( next.value );
				}
			}
		};
	},
	values() { return this; },
	forEach( fn ) { this.forEach( fn ); },

	toString() {
		return `Set{${this.*map( value=>value::toString() ).*collect(Array).join(', ')}}`;
	}
});
