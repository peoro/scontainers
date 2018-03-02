
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	const proto = Type.prototype;

	class MapKey {
		constructor( coll, fn ) {
			this.wrapped = coll;
			this.fn = fn;
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
							value: [this.fn(value, key, this.collection), value]
						};
					}
				};
			};
		}
		*/
		reverse() {
			if( proto.*reverse ) {
				return this.wrapped.*reverse().*mapKey( this.fn );
			}
		}

		toString( ) {
			return `${this.wrapped}.map(⋯)`;
		}
	}
	MapKey.Propagator = {
		parentCollection() { return this.wrapped; },
		next( kv ) {
			kv.key = this.fn( kv.value, kv.key );
			return kv;
		},
		alwaysPropagate: true,
		propagateMulti: false,
		needState: false,
		reorder: false
	};
	return MapKey;
});
