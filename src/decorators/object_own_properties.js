
'use strict';

const assert = require('assert');
const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');
const {KVN} = require('../util.js');

use protocols from subminus.symbols;

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	assert( Type === Object, `ObjectOwnProperties is only needed by Object...` );
	const proto = Type.prototype;

	class OwnProperties {
		constructor( coll ) {
			this.wrapped = coll;
		}

		get() {
			return function get( key ) {
				return this.*hasKey(key) && this.wrapped[key];
			};
		}
		set() {
			return function set( key, value ) {
				// return Object.defineProperty( this.wrapped, key, {value, writable:true, enumerable:true, configurable:true} ); // no need for this - unless `this.wrapper[key]` is a getter :x
				this.wrapped[key] = value;
			};
		}
		hasKey() {
			return function hasKey( key ) {
				return this.wrapped.hasOwnProperty( key );
			};
		}

		kvIterator() {
			return function* kvIterator() {
				for( let key in this.wrapped ) {
					if( this.*hasKey(key) ) {
						yield new KVN( key, this.wrapped[key] );
					}
				}
			};
		}
		iterator() {
			return function* iterator() {
				for( let key in this.wrapped ) {
					if( this.*hasKey(key) ) {
						yield [ key, this.wrapped[key] ];
					}
				}
			};
		}
		kvIterator() {
			return function kvIterator() {
				return {
					it: this.*iterator(),
					next() {
						const next = this.it.next();
						if( ! next.done ) {
							return new KVN( next.value[0], next.value[1] );
						}
					}
				};
			}
		}

		toString( ) {
			return `${this.wrapped.*toString()}.ownProperties()`;
		}
	}
	/*
	OwnProperties.Propagator = {
		parentCollection() { return this.wrapped; },
		next( kv ) {
			if( ! this.*hasKey(kv.key) ) {
				kv.skip = true;
			}
		},
		alwaysPropagate: false,
		propagateMulti: false,
		needState: false,
		reorder: false
	};
	*/

	return OwnProperties;
});
