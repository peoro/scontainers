
const {assert, traits, toStr, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

traits.scontainers.*implTraits( Set, {
	from( collection ) {
		if( collection.*values ) {
			return Set.from( collection.*values() );
		}
		else if( collection.*forEach ) {
			const set = new Set();
			collection.*forEach( value=>void set.add(value) );
			return set;
		}
		assert.fail();
	}
});

Set.*describeScontainer({
	argKeys: []
});


Set.*implCoreTraits({
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
					return new KVN( undefined, next.value );
				}
			}
		};
	},
	values() { return this; },

	toString() {
		return `Set{${this.*map( value=>value::toStr() ).*collect(Array).join(', ')}}`;
	}
});
