
'use strict';

const {defineProperties, compileProtocolsForRootType, deriveProtocolsForRootType} = require('../processors/index.js')
const {assignProtocols, KVN, toString} = require('../util.js');
const {semantics} = require('../compiler/index.js');

const symbols = require('../symbols');
use protocols from symbols;


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
	getUnchecked( key ) {
		return this.self.member(`get`).call( key );
	},
	hasKey( key ) {
		return this.self.member(`has`).call( key );
	},
	len( compiler ) {
		return this.self.member(`size`);
	},

	loop( generator ) {
		const it = this.createUniqueVariable(`it`);
		const next = this.createUniqueVariable(`next`);

		function skip() {
			return semantics.block(
				// next.assign( it.member(`next`).call() ),
				semantics.continue(),
			);
		}

		return [
			it.declare(
				this.self.member(
					semantics.id(`Symbol`).member(`iterator`), true
				).call()
			),
			next.declare(),
			// next.declare( it.member(`next`).call() ),
			semantics.while(
				next.assign( it.member(`next`).call() ).member(`done`).not(),

				this.block({skip}, function(){
					const kvn = new KVN(next.member(`value`).member(0, true), next.member(`value`).member(1, true));
					this.pushStatement(
						...this::generator( kvn ),
						// next.assign( it.member(`next`).call() ),
					);
				})
			)
		];
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
