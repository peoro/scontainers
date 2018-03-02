
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	const proto = Type.prototype;

	class Map {
		constructor( coll, fn ) {
			this.wrapped = coll;
			this.fn = fn;
		}

		len() {
			if( proto.*len ) {
				return function len() {
					return this.wrapped.*len();
				};
			}
		}
		nth() {
			if( proto.*nth ) {
				return function nth( n ) {
					const value = this.wrapped.*nth( n );
					return this.fn( value, n, this );
				};
			}
		}
		nthKey() {
			if( proto.*nthKey ) {
				return function nthKey( n ) {
					return this.wrapped.*nthKey( n );
				};
			}
		}
		get() {
			if( proto.*get && proto.*hasKey ) {
				return function get( key ) {
					if( this.wrapped.*hasKey(key) ) {
						const value = this.wrapped.*get( key );
						return this.fn( value, key, this );
					}
				};
			}
		}
		hasKey() {
			// return subminus.aliasFunctionFactory( proto.*hasKey ); // can't work as `this` must be `this.wrapper`
			if( proto.*hasKey ) {
				return function hasKey( key ) {
					return this.wrapped.*hasKey( key );
				};
			}
		}

		/*
		kvIterator() {
			return function kvIterator() {
				return {
					collection: this.wrapped,
					fn: this.fn,
					it: this.wrapped.*kvIterator(),
					next() {
						const next = this.it.next();
						if( next.done ) {
							return next;
						}

						const [key, value] = next.value;
						return {
							done: false,
							value: [key, this.fn(value, key, this.collection)]
						};
					}
				};
			};
		}
		*/
		reverse() {
			if( proto.*reverse ) {
				return this.wrapped.*reverse().*map( this.fn );
			}
		}

		toString( ) {
			return `${this.wrapped}.map(⋯)`;
		}
	}
	Map.Propagator = {
		parentCollection() { return this.wrapped; },
		nToParentN( n ) { return n; },
		next( kv ) {
			kv.value = this.fn( kv.value, kv.key );
			return kv;
		},
		alwaysPropagate: true,
		propagateMulti: false,
		needState: false,
		reorder: false
	};

	return Map;
});
