
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	const proto = Type.prototype;

	return class TakeWhile {
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
							if( this.fn(value, key, this.collection) ) {
								return next;
							}

							this.next = function next() { return {done:true}; };
							return {done:true};
						}
					}
				};
			};
		}
		reverse() {
			if( proto.*reverse ) {
				return this.wrapped.*reverse().*takeWhile( this.fn );
			}
		}

		toString( ) {
			return `${this.wrapped}.skipWhile(⋯)`;
		}
	};
});
