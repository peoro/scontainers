
'use strict';

const {defineProperties, compileProtocolsForRootType, deriveProtocolsForRootType} = require('../processors/index.js')
const utils = require('../util.js');
const {KVN, toString} = utils;

const es5 = require('esast/dist/es5.js');

// TODO: need this shit for `assign` :F implement `use traits *, assign from` ASAP...
const semantics = require('esast/dist/semantics.js');

use traits * from require('esast/dist/semantics.js');
use traits * from require('../symbols');
use traits * from utils;


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

Map::defineProperties({
	argKeys: []
});

Map::compileProtocolsForRootType({
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
		const s = es5.semantics;

		const it = this.createUniqueVariable(`it`);
		const next = this.createUniqueVariable(`next`);

		this.body
			.*declare(
				it,
				this.self.*member(
					s.id(`Symbol`).*member(`iterator`),
					true
				).*call(),
				`var`
			)
			.*declare( next, undefined, `var` )
			// .*declare( next, it.*member(`next`).call() )
			.*while(
				next[ semantics.assign ]( it.*member(`next`).*call() ).*member(`done`).*not(),

				this.body = s.block()
			);

		return new KVN(
			next.*member(`value`).*member(0, true),
			next.*member(`value`).*member(1, true)
		);
	},
});

Map::deriveProtocolsForRootType({
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
		return `Map{${this.*map( (value, key)=>`${key::toString()}:${value::toString()}` ).*collect(Array).join(', ')}}`;
	}
});

module.exports = Map;
