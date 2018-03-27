
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	const proto = Type.prototype;

	return class Flatten {
		constructor( coll ) {
			this.wrapped = coll;
		}

		count() {
			// NOTE: might throw if one of the elements of the collections of `this.wrapped` isn't countable
			if( proto.*map ) {
				return function count() {
					return this.wrapped
						.*map( (value)=>value.*count ? value.*count() : 1 )
						.*sum();
				};
			}
		}

		kvIterator() {
			return function kvIterator() {
				// NOTE: might throw if one of the elements of the collections of `this.wrapped` isn't iterable
				return {
					it: this.wrapped.*kvIterator(),
					jt: null,
					processJt() {
						if( ! this.jt ) {
							return;
						}
						return this.jt.next();
					},
					processIt() {
						const iNext = this.it.next();
						if( ! iNext ) {
							return iNext;
						}

						const {value} = iNext;
						if( value.*kvIterator ) {
							this.jt = value.*kvIterator();
							return this.next();
						}
						return iNext;
					},
					next() {
						const next = this.processJt();
						if( ! next ) {
							return this.processIt();
						}
						return next;
					}
				};
			};
		}
		/*
		whileEach() {
			// NOTE: might throw if one of the elements of the collections of `this.wrapped` isn't iterable
			//if( proto.*whileEach ) {
				return function whileEach( fn ) {
					return this.wrapped.*whileEach( (value, key)=>{
						if( value.*whileEach ) {
							return ! value.*whileEach( (v,k)=>fn(v, k, this) );
						}
						else {
							return fn(value, key, this);
						}
					});
				};
			//}
		}
		*/
		reverse() {
			// NOTE: might throw if one of the elements of the collections of `this.wrapped` isn't reversable
			if( proto.*reverse ) {
				return function reverse() {
					return new Flatten(
						this.*wrapped
							.*reverse()
							.*map( (value)=>value.*count ? value.*reverse() : value )
						);
				};
			}
		}

		toString( ) {
			return `${this.wrapped}.flatten()`;
		}
	};
});
