
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
							if( ! next ) {
								return;
							}

							const {key, value, n} = next;
							if( ! this.fn(value, key, n) ) {
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
