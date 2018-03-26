
'use strict';

Error.stackTraceLimit = Infinity;

const assert = require('assert');
const {symbols, Range} = require('./');
const {get, nthKVN, getKVN, toString, properties, slice, map, filter, iter, reordered, chunk, flatten, groupBy, kvReorderedIterator, collect, reduce, sum, keys, values, nth, flattenDeep, cache, take, takeWhile, skipWhile, avg, forEach, len} = require('./bound.js');

function log() {
	console.log( this::toString() );
}

function square( n ) { return n*n; }
function isEven( n ) { return n%2 === 0; }
function sumFn( a, b ) { return a+b; }

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


	{
		const collection = new Range(3, 12)::map( square );
		collection::get( 3 )::log();
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
		collection::len()::log();

		const it = collection[symbols.kvIterator]();
		let next = it.next();
		while( ! next.done ) {
			console.log( next.value );
			next = it.next();
		}
		collection::len()::log();

		console.log();
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
		collection::log();
		console.log();

		collection::forEach( (n, k)=>console.log(`  ${k}: ${n}`) );

		console.log();
	}

	{
		console.log();
		const collection = [7, 3, 5, 0, 2]::map( square );
		const it = collection[symbols.kvIterator]();
		let next = it.next();
		while( ! next.done ) {
			console.log( next.value );
			next = it.next();
		}
		collection::log();
		collection::len()::log();

		console.log();
	}

	{
		console.log();
		const collection = [7, 3, 5, 0, 2];
		const it = collection[symbols.kvIterator]();
		let next = it.next();
		while( ! next.done ) {
			console.log( next.value );
			next = it.next();
		}
		collection::log();
		console.log( collection[symbols.len]() );

		console.log();
	}

	{
		console.log();
		const collection = new Range(3, 12)::map( square )::filter( isEven );
		const it = collection[symbols.kvIterator]();
		let next = it.next();
		while( ! next.done ) {
			console.log( next.value );
			next = it.next();
		}
		collection::log();
		console.log();

		collection::forEach( (n, k)=>console.log(`  ${k}: ${n}`) );

		console.log();

		collection::sum()::log();
	}

	{
		console.log();
		const collection = new Range(3, 12)::filter( isEven )::map( square )::filter( isEven );
		collection::sum()::log();

		const range = new Range(10000);
		range::filter( isEven )::map( square )::sum()::log();
		range::filter( isEven )::map( square )::reduce( sumFn, 0 )::log();
		// range::collect( Array )::filter( isEven )::map( square )::reduce( sumFn, 0 )::log();
	}
}
