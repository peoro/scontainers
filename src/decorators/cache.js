
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

/*
TODO: Just like `cow`, `cache` should specialize on `CacheType`
*/

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	const proto = Type.prototype;

	class Cache {
		constructor( coll, CacheType=Map ) {
			this.wrapped = coll;
			this.cache = new CacheType();
		}

		len() {
			if( proto.*len ) {
				return function len() {
					return this.*len();
				};
			}
		}
		nth() {
			if( proto.*nth ) {
				return function nth( n ) {
					const key = this.*nthKey( n );
					return this.*get( key );
				};
			}
		}
		get() {
			if( proto.*get && proto.*hasKey ) {
				return function get( key ) {
					if( this.cache.has(key) ) {
						return this.cache.get( key );
					}
					if( this.wrapped.*hasKey(key) ) {
						const value = this.wrapped.*get( key );
						this.cache.set( key, value );
						return value;
					}
				};
			}
		}
		hasKey() {
			if( proto.*hasKey ) {
				return function hasKey( key ) {
					return this.cache.has( key ) || this.wrapped.*hasKey( key );
				};
			}
		}

		kvIterator() {
			return function kvIterator() {
				return this.wrapped.*kvIterator();
			};
		}
		reverse() {
			if( proto.*reverse ) {
				return this.wrapped.*reverse().*cache();
			}
		}

		toString( ) {
			return `${this.wrapped}.cache(⋯)`;
		}
	}
	Cache.Propagator = {
		parentCollection() { return this.wrapped; },
		nToParentN( n ) { return n; },
	};

	return Cache;
});
