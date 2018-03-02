
'use strict';

const assert = require('assert');
const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	const proto = Type.prototype;

	if( ! proto.*nth ) {
		// TODO: improve error logging :F
		// console.log( new Error(`No slice for ${Type}`) );
		// it's ok: `Filter` won't have no `.slice()`
		return;
	}

	class Slice {
		constructor( coll, begin, end ) {
			this.wrapped = coll;
			if( begin !== undefined ) {
				this.begin = begin;
			}
			if( end !== undefined ) {
				Object.defineProperties( this, {
					end: {
						configurable: true,
						enumerable: true,
						writable: true,
						value: end
					}
				});
			}

			assert( this.begin >= 0 && this.end >= 0 && this.end >= this.begin );
		}

		get end() { return this.wrapped.*len(); }

		len() {
			return function len() { return this.end - this.begin; };
		}

		nth() {
			return function nth( n ) {
				assert( this.*hasNth(n), `Can't get elements outside of a Slice` );
				return this.wrapped.*nth( this.begin+n );
			};
		}
		setNth() {
			if( proto.*setNth ) {
				return function setNth( n, value ) {
					assert( this.*hasNth(n), `Can't set elements outside of a Slice` );
					return this.wrapped.*setNth( this.begin+n, value );
				};
			}
		}

		whileEach() {
			return function whileEach( fn ) {
				for( let i = this.begin; i < this.end; ++i ) {
					const value = this.wrapped.*nth( i );
					if( ! fn(value, i, this) ) {
						return [i, value];
					}
				}
			};
		}

		toString() {
			return `${this.wrapped}[${this.begin}:${this.end}]`;
		}
	}
	Slice.Propagator = {
		parentCollection() { return this.wrapped; },
		nToParentN( n ) { if( n >= 0 && n < this.*len() ) { return this.begin + n; } },
	};

	return Slice;
});
