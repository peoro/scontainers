
const {traits, toStr, id, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

class Range {
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

	toString( ) {
		return `${this.begin}…${this.end}`;
	}
}

Range.*describeScontainer({
	argKeys: [id`begin`, id`end`]
});

Range.*implCoreGenerators({
	nToKey( n ) { return n.*plus( this.args.begin ); },
	keyToN( key ) { return key.*minus( this.args.begin ); },
	nthUnchecked( n ) { return n.*plus( this.args.begin ); },
	// add: nope
	len() {
		const {begin, end} = this.args;
		return end.*minus( begin );
	},
	// reverse: from nth+len
	// clear: nope
	// iterator: from nth
});

Range.*implCoreTraits({
	nthUnchecked( n ) { return this.begin + n; },
	keyToN( key ) { return key - this.begin; },
	nToKey( n ) { return n + this.begin; },
	len() { return this.len(); },

	// optimizations
	sum() { return ( this.begin + this.end-1 ) * this.len() / 2; },
	slice( begin, end ) { return new Range(this.begin+begin, this.begin+end) },
});

module.exports = Range;
