
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	const proto = Type.prototype;

	/*
	if( ! proto.*get ) {
		return;
	}
	*/

	class Filter {
		constructor( coll, fn ) {
			this.wrapped = coll;
			this.fn = fn;
		}

		get() {
			if( proto.*get ) {
				return function get( key ) {
					if( this.wrapped.*hasKey(key) ) {
						const value = this.wrapped.*get( key );
						if( this.fn( value, key, this ) ) {
							return value;
						}
					}
				};
			}
		}
		set() {
			if( proto.*set ) {
				return function set( key, value ) {
					const oldValue = this.wrapped.*get( key );
					if( this.fn( oldValue, key, this ) ) {
						return this.wrapped.*set( key, value );
					}
				};
			}
		}
		hasKey() {
			if( proto.*hasKey ) {
				return function hasKey( key ) {
					if( this.wrapped.*hasKey(key) ) {
						const value = this.wrapped.*get( key );
						return !! this.fn( value, key, this );
					}
					return false;
				};
			}
		}
		has() {
			if( proto.*has ) {
				return function has( key ) {
					if( this.wrapped.*has(key) ) {
						return !! this.fn( value, undefined, this );
					}
					return false;
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
						while( true ) {
							const next = this.it.next();
							if( next.done ) {
								return next;
							}

							const [key, value] = next.value;
							if( this.fn(value, key, this.collection) ) {
								return {
									done: false,
									value: [key, value]
								};
							}
						}
					}
				};
			};
		}
		*/
		reverse() {
			if( proto.*reverse ) {
				return this.wrapped.*reverse().*filter( this.fn );
			}
		}

		toString( ) {
			return `${this.wrapped}.filter(⋯)`;
		}
	}
	Filter.Propagator = {
		parentCollection() { return this.wrapped; },
		next( kv ) {
			if( this.fn(kv.value, kv.key) ) {
				return kv;
			}
		},
		alwaysPropagate: false,
		propagateMulti: false,
		needState: false,
		reorder: false
	};

	return Filter;
});
