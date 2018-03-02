
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	const proto = Type.prototype;

	return class SkipWhile {
		constructor( coll, fn ) {
			this.wrapped = coll;
			this.fn = fn;
		}

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
							if( ! this.fn(value, key, this.collection) ) {
								this.next = function next() { return this.it.next(); };
								return next;
							}
						}
					}
				};
			};
		}
		reverse() {
			if( proto.*reverse ) {
				return this.wrapped.*reverse().*skipWhile( this.fn );
			}
		}

		toString( ) {
			return `${this.wrapped}.skipWhile(⋯)`;
		}
	};
});
