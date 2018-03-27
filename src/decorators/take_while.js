
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');
const {KVN} = require('../util.js');

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
						const next = this.it.next();
						if( ! next ) {
							return;
						}

						const {key, value, n} = next;
						if( this.fn(value, key, n) ) {
							return next;
						}

						this.next = function next() {};
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
