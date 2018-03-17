
'use strict';

const assert = require('assert');
const {symbols, Range} = require('./');
const {toString, properties, slice, map, filter, iter, reordered, chunk, flatten, groupBy, kvReorderedIterator, collect, sum, keys, values, nth, flattenDeep, cache, take, takeWhile, skipWhile, avg} = require('./bound.js');

Error.stackTraceLimit = 25;

function log() {
	console.log( this::toString() );
}

function square( n ) { return n*n; }

{
	function compile( coll, sym ) {
		const fn = coll[sym];
		assert( fn.factory, `No compiler for ${coll.toString()}::${sym.toString()}` );

		const compiler = fn.factory();
		return compiler.toString();
	}

	function print( sym, str, coll ) {
		if( ! coll ) {
			coll = str;
			str = null;
		}
		if( str ) {
			console.log(str);
		}
		console.log( coll.toString() );
		console.log( coll::toString() );
		// console.log( compile(coll, sym) );
		console.log();
	}

	/*
	print( symbols.kvIterator,
		new Range( 3, 12 )
	);
	*/

	{
		//for( let [k,v] of new Range(3, 12) ) {
		//	console.log( `  ${k}: ${v}` );
		//}
		const collection = new Range(3, 12);
		const it = collection[symbols.kvIterator]();
		let next = it.next();
		while( ! next.done ) {
			console.log( next.value );
			next = it.next();
		}
	}

	{
		console.log();
		const collection = new Range(3, 12)::map( square );
		const it = collection[symbols.kvIterator]();
		let next = it.next();
		while( ! next.done ) {
			console.log( next.value );
			next = it.next();
		}

		console.log();
		collection::log();
	}
}
