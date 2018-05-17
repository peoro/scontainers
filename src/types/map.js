
const {traits, semantics, toStr, id, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

Map.*implScontainer({
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

Map.*describeScontainer({
	argKeys: []
});

Map.*implCoreGenerators({
	getUnchecked( key ) {
		return this.self.*member(`get`).*call( key );
	},
	hasKey( key ) {
		return this.self.*member(`has`).*call( key );
	},
	len( compiler ) {
		return this.self.*member(`size`);
	},

	loop() {
		const it = this.createUniqueVariable(`it`);
		const next = this.createUniqueVariable(`next`);

		this.body
			.*declare(
				it,
				this.self.*member(
					semantics.id(`Symbol`).*member(`iterator`),
					true
				).*call(),
				`var`
			)
			.*declare( next, undefined, `var` )
			// .*declare( next, it.*member(`next`).call() )
			.*while( next.*[ traits.semantics.assign ]( it.*member(`next`).*call() ).*member(`done`).*not(),
				this.body = semantics.block()
			);

		return new KVN(
			next.*member(`value`).*member(0, true),
			next.*member(`value`).*member(1, true)
		);
	},
});

Map.*implCoreTraits({
	len() { return this.size; },
	getUnchecked( key ) { return this.get( key ); },
	hasKey( key ) { return this.has( key ); },
	set( key, value ) { this.set( key, value ); },
	clear() { this.clear(); },

	kvIterator() {
		return {
			it: this[Symbol.iterator](),
			next() {
				const next = this.it.next();
				if( ! next.done ) {
					return new KVN( next.value[0], next.value[1] );
				}
			}
		};
	},
	entries() { return this; },
	forEach( fn ) { this.forEach( fn ); },

	toString() {
		return `Map{${this.*map( (value, key)=>`${key::toStr()}:${value::toStr()}` ).*collect(Array).join(', ')}}`;
	}
});

module.exports = Map;
