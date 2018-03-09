
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

const {defineProperties, compileProtocolsForRootType, implementCoreProtocols} = require('../processors/index.js')
const {implementSymbols} = require('../util.js')

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
	args: {
		begin(){ return this.begin; },
		end(){ return this.end; }
	}
});

Range::compileProtocolsForRootType({
	nth( compiler, {begin, end}, n ) {
		return n.plus(begin);
	},
	nToKey( compiler, {begin, end}, n ) {
		return n;
	},
	keyToN( compiler, {begin, end}, key ) {
		return key;
	},
	// add: nope
	len( compiler, {begin, end} ) {
		return end.minus(begin);
	},
	// reverse: from nth+len
	// clear: nope

	/*
	iterator( compiler, {begin, end} ) {
		const value = compiler.createUniqueVariable(`value`);

		compiler.body.push(
			compiler.loop = semantics.for(
				value.declare( begin ),
				value.lt( end ),
				value.increment(),

				compiler.body = new semantics.Block(
				)
			)
		);

		compiler.value = value;
		compiler.key = value.minus( begin );
	},
	*/
});

Range.prototype::implementSymbols({
	get( n ) {
		if( ! this.*hasKey(n) ) { return; }
		return this.begin + n;
	},
	nth( n ) {
		if( ! this.*hasNth(n) ) { return; }
		return this.begin + n;
	},
	hasNth( n ) {
		// TODO: assert that `n` is integer
		return n >= 0 && n < this.*len();
	},
	hasKey( n ) {
		// TODO: check that `n` is integer
		return n >= 0 && n < this.*len();
	},
	nthKey( n ) { return n; },

	/*
	iteratorCompiler() {
		console.log( Compiler );
		const compiler = new Compiler();

		const begin = compiler.cretaeArgumentVariable(`begin`);
		const end = compiler.cretaeArgumentVariable(`end`);
		const key = compiler.createUniqueVariable(`k`);
		const n = compiler.createUniqueVariable(`n`);

		compiler.code.pushStatement(
			compiler.loop = semantics.for(
				n.declare( begin ),
				n.lt( end ),
				n.increment(),
				compiler.body = new semantics.Block(
					key.declare( n.minus(begin) )
				)
			)
		);

		compiler.key = key;
		compiler.value = n;

		return compiler;
	},
	*/

	// optimization
	sum() { return ( this.begin + this.end-1 ) * this.len() / 2; },
	slice( begin, end ) { return new Range(this.begin+begin, this.begin+end) },
});

Range::implementCoreProtocols();

Range.Compiler = {
	declareArgs() {
		return { begin:this.begin, end:this.end };
	},

	get( compiler ) {
		const value = compiler.createUniqueVariable(`value`);
		const {begin, end} = compiler.registerArgumentVariables( this );

		compiler.body.pushStatement(
			compiler.assert( Compiler.isInteger(compiler.key) ),
			Compiler.if(
				Compiler.or( compiler.key.lt(begin), compiler.key.ge(end) ),
				compiler.skip()
			),
			mappedValue.declare( mapFn.call(compiler.value, compiler.key) )
		);

		compiler.value = mappedValue;
	},
	// set: nope
	hasKey( compiler ) {
		const {begin, end} = compiler.registerArgumentVariables( this );
		return
	},
	// has: nope
	// nth: from get+nthKey
	// setNth: from set+nthKey
	// hasNth: from hasKey+nthKey
	nthKey( compiler ) { return Type.Compiler.nthKey(compiler); },
	// add: nope
	len() { return Type.Compiler.len(compiler); },
	// reverse: from nth+len
	// clear: nope
};

module.exports = subminus.implementForNewType( Range );
