
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

module.exports = subminus.implementForNewType( class Range {
		constructor( begin, end ) {
			if( end !== undefined ) {
				if( begin !== undefined ) {
					this.begin = begin;
				}
				this.end = end;
			}
			else if( begin !== undefined ) {
				this.end = begin;
				this.begin = 0;
			}
			else {
				this.end = Infinity;
				this.begin = 0;
			}
		}

		len() {
			return this.end - this.begin;
		}

		nth( n ) {
			if( ! this.*hasNth(n) ) { return; }
			return this.begin + n;
		}
		hasNth( n ) {
			// TODO: assert that `n` is integer
			return n >= 0 && n < this.*len();
		}
		nthKey( n ) { return n; }

		toString( ) {
			return `${this.begin}..${this.end}`;
		}

		// optimization
		sum() { return ( this.begin + this.end-1 ) * this.len() / 2; }
		slice( begin, end ) { return new Range(this.begin+begin, this.begin+end) }
	});
