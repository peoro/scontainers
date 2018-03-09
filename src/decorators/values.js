
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

const {implementCoreProtocolsFromPropagator} = require('../processors/index.js');

use protocols from subminus.symbols;

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	const proto = Type.prototype;

	class Values {
		constructor( coll ) {
			this.wrapped = coll;
		}

		// TODO: most of these functions can be easily optimized by returning a `{factory:...}` instead of a function
		len() {
			if( proto.*len ) {
				return function len() {
					return this.wrapped.*len();
				};
			}
		}
		nth() {
			if( proto.*nth ) {
				return function nth( n ) { return this.wrapped.*nth( n ); };
			}
		}
		get() {
			if( proto.*get ) {
				return function get( key ) { return this.wrapped.*get( key ); };
			}
		}
		hasKey() {
			if( proto.*hasKey ) {
				return function hasKey( key ) { return this.wrapped.*hasKey( key ); };
			}
		}
		has() {
			if( proto.*has ) {
				return function has( item ) { return this.wrapped.*has( item ); };
			}
		}

		/*
		kvIterator() {
			if( proto.*kvIterator ) {
				return function kvIterator( ) { return this.wrapped.*kvIterator(); };
			}
		}
		*/
		iterator() {
			if( proto.*kvIterator ) {
				return function iterator( ) {
					return {
						it: this.wrapped.*kvIterator(),
						next() {
							const next = this.it.next();
							if( next.done ) {
								return next;
							}

							const [key, value] = next.value;
							return { value, done:false };
						}
					};
				};
			}
		}
		reverse() {
			if( proto.*reverse ) {
				return this.wrapped.*reverse().*values();
			}
		}

		toString( ) {
			return `${this.wrapped}.values()`;
		}
	}

	Values::implementCoreProtocolsFromPropagator( Type, {
		parentCollection() { return this.wrapped; },
		nToParentN( n ) { return n; },
		next( kv ) { return kv; },
		alwaysPropagate: true,
		propagateMulti: false,
		needState: false,
		reorder: false
	});

	return Values;
});
