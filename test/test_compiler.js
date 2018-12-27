
Error.stackTraceLimit = Infinity;

const scontainers = require('../src/index.js');
const {Range} = scontainers;

const {toStr} = require('../src/util.js');

use traits * from scontainers;

function log() {
	console.log( this::toStr() );
}

function square( n ) { return n*n; }
function isEven( n ) { return n%2 === 0; }
function sumFn( a, b ) { return a+b; }

{
	{
		const collection =
			//({a:3, b:5, c:7}).*ownProperties()
			new Map([ ['a',7], [32,32], [false,'baobab'] ])
			// new Range( 10 )
				.*filter( (v,k)=>!Number.isInteger(k) )
				.*map( x=>`(${x})` );

		console.log( collection.*toString() );
		collection.*get( `a` )::log();
		collection.*forEach( ::console.log );
		console.log();

		//process.exit( 0 );
	}

	{
		const collection = new Range(3, 12).*map( square );
		collection.*get( 3 )::log();

		for( const kv of collection ) {
			console.log( kv );
		}
		for( let kv of new Range(3).*map(n=>n+1).*iter().*map(n=>n*n) ) {
			console.log( kv );
		}

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
		collection.*len()::log();

		const it = collection.*kvIterator();
		let next = it.next();
		while( next ) {
			console.log( next.value );
			next = it.next();
		}
		collection.*len()::log();

		console.log();
	}

	{
		console.log();
		const collection = new Range(3, 12).*map( square );
		const it = collection.*kvIterator();
		let next = it.next();
		while( next ) {
			console.log( next.value );
			next = it.next();
		}
		collection::log();
		console.log();

		collection.*forEach( (n, k)=>console.log(`  ${k}: ${n}`) );

		console.log();
	}

	{
		console.log();
		const collection = [7, 3, 5, 0, 2].*map( square );
		const it = collection.*kvIterator();
		let next = it.next();
		while( next ) {
			console.log( next.value );
			next = it.next();
		}
		collection::log();
		collection.*len()::log();

		console.log();
	}

	{
		console.log();
		const collection = [7, 3, 5, 0, 2];
		const it = collection.*kvIterator();
		let next = it.next();
		while( next ) {
			console.log( next.value );
			next = it.next();
		}
		collection::log();
		console.log( collection.*len() );

		console.log();
	}

	{
		console.log();
		const collection = new Range(3, 12).*map( square ).*filter( isEven );
		const it = collection.*kvIterator();
		let next = it.next();
		while( next ) {
			console.log( next.value );
			next = it.next();
		}
		collection::log();
		console.log();

		collection.*forEach( (n, k)=>console.log(`  ${k}: ${n}`) );

		console.log();

		collection.*sum()::log();
	}

	{
		console.log();
		const collection = new Range(3, 12).*filter( isEven ).*map( square ).*filter( isEven );
		collection.*sum()::log();

		const range = new Range(10000);
		range.*filter( isEven ).*map( square ).*sum()::log();
		range.*filter( isEven ).*map( square ).*reduce( sumFn, 0 )::log();
		// range.*collect( Array ).*filter( isEven ).*map( square ).*reduce( sumFn, 0 )::log();
	}
}
