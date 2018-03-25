
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');
const generatorSymbols = require('../generator_symbols');

use protocols from subminus.symbols;

const {defineProperties, compileProtocolsForRootType, implementCoreProtocols} = require('../processors/index.js');
const {implementSymbols} = require('../util.js');

const {Compiler, semantics} = require('../compiler/index.js');

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
		return `${this.begin}..${this.end}`;
	}
}

Range::defineProperties({
	argKeys: [id`begin`, id`end`]
});

Range::compileProtocolsForRootType({
	nToKey( compiler, n ) {
		const {begin} = compiler.getArgs( this );
		// return n.plus( begin ); // `key===value`
		return n; // `key===n`
	},
	keyToN( compiler, key ) {
		const {begin} = compiler.getArgs( this );
		// return key.minus( begin ); // `key===value`
		return key; // `key==n`
	},
	nth( compiler, n ) {
		const {begin} = compiler.getArgs( this );
		compiler.value = n.plus( begin );
		// compiler.key = compiler.value; // `key===value`
		compiler.key = this[generatorSymbols.nToKey]( compiler, n ); // `key==n`
		return compiler.value;
	},
	// add: nope
	len( compiler ) {
		const {begin, end} = compiler.getArgs( this );
		return end.minus(begin);
	},
	// reverse: from nth+len
	// clear: nope
	// iterator: from nth
});

Range.prototype::implementSymbols({
	get( n ) {
		if( ! this.*hasKey(n) ) { return; }
		return this.begin + n;
	},
	nth( n ) {
		if( n < 0 || n  ) { return; }
		return this.begin + n;
	},
	// keyToN( key ) { return n - this.begin; },
	// nToKey( n ) { return n + this.begin; },
	keyToN( key ) { return key; },
	nToKey( n ) { return n; },

	// optimization
	sum() { return ( this.begin + this.end-1 ) * this.len() / 2; },
	slice( begin, end ) { return new Range(this.begin+begin, this.begin+end) },
});

Range::implementCoreProtocols();

module.exports = subminus.implementForNewType( Range );
