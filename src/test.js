
'use strict';

const {symbols, Range} = require('./');
const {toString, properties, slice, map, filter, iter, reordered, chunk, flatten, groupBy, kvReorderedIterator, collect, sum, keys, values, nth, flattenDeep, cache, take, takeWhile, skipWhile, avg} = require('./bound.js');

Error.stackTraceLimit = 25;

function square( n ) { return n*n; }

{
	function print( str, coll ) {
		if( ! coll ) {
			coll = str;
			str = null;
		}
		if( str ) {
			console.log(str);
		}
		console.log( coll.toString() );
		console.log( coll::toString() );
		console.log();
	}

	print(
		[1, 2, 3]
	);

	print(
		new Range( 3, 12 )
	);

	print(
		{ a:1, b:'hey' }::properties()
	);

	print(
		[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
			::slice(3, 7)
	);

	print(
		new Range(11)
			::slice(3, 7)
	);

	print(
		new Range(21)
			::chunk(5)
	);

	print(
		new Range(21)
			::chunk(5)
			::flatten()
			::map( (x)=>x*x )
	);

	print(
		new Range(2, 5)::map( square )::map( square )::map( square )
	);

	/*
	print(
		new Range(10)
			::reordered()
			::mapKey( (v,k)=>10-k )
			::collect( Map )
	);
	process.exit( 0 );
	*/

	for( let kv of new Range(3)::map(n=>n+1)::iter()::map(n=>n*n) ) {
		console.log( kv, `...${kv[0]}: ${kv[1]}` );
	}
	console.log();

	const rit = new Range(3)::iter()::map(n=>n+1)::reordered()::map(n=>n*n)::kvReorderedIterator();
	rit.onNext( (kv)=>void console.log( kv, `...${kv.key}: ${kv.value}` ) )
		.proceed();
	console.log();

	{
		console.log( `GroupBy {` );
		const coll = new Range(1, 10)
			::map( square )
			::groupBy( (v,k)=>(v%2===0) + (v%3===0) );

		print( coll );

		{
			console.log( `${coll}:` );
			const rit = coll::kvReorderedIterator();
			rit.onNext( (kv)=>{
					const groupKey = kv.key;
					const group = kv.value;
					console.log( `  New group ${groupKey}` );

					const git = group
						// ::map( (v,k)=>v+k )
						::kvReorderedIterator();

					git.onNext( (kv)=>{
							console.log( `    ${kv.key}:${kv.value} => group ${groupKey}` );
						})
						.proceed();
				})
				.proceed();
		}
		console.log();

		{
			const res = coll::map( group=>{
				return group::collect( Array );
			})::collect( Map );

			console.log( res );
		}

		{
			const res = coll::map( group=>{
				return group::sum();
			})::collect( Map );

			console.log( res );
		}
		{
			const res = coll::map( group=>{
				return group::sum();
			})::sum()

			console.log( res );
		}
		console.log( `}` );
		console.log();
	}

	/*
	console.log(`yay`);
	process.exit( 0 );
	*/

	print( `0..21.chunk(5).flatten().map(x²).keys()`,
		new Range(21)
			::chunk(5)
			::flatten()
			::map( (x)=>x*x )
			::keys()
	);

	print( `0..21.chunk(5).flatten().map(x²).values()`,
		new Range(21)
			::chunk(5)
			::flatten()
			::map( (x)=>x*x )
			::values()
	);

	print( `0..21.chunk(5)[3]`,
		new Range(21)
			::chunk(5)
			::nth( 3 )
	);

	print(
		new Range(50)
			::map( (n)=>n*n )
			::slice(10, 40)
			::filter( (n)=>!(n%2) )
			::filter( (n)=>!(n%3) )
			::chunk( 3 )
	);

	print( `[...].flattenDeep().collect(Array)`,
		[ new Range(3), ['x', new Map([['x','x1'], ['y',['y2', 'y2b', 'y2c']], ['z','z3']]), 'z'], 'wow']
			::flattenDeep()
			::collect( Array )
	);

	const fib = new Range()
			::map( (i)=>{
				switch( i ) {
					case 0: return 0;
					case 1: return 1;
					default: return fib::nth(i-1) + fib::nth(i-2);
				}
			})
			::cache();

	print( `fib.take( 10 )`,
		fib::take( 10 )
	);

	print( `fib.takeWhile( x<100 )`,
		fib::takeWhile( (x)=>x<100 )
	);

	print( `fib.skipWhile( x<100 ).takeWhile( x<1000 )`,
		fib
			::skipWhile( (x)=>x<100 )
			::takeWhile( (x)=>x<1000 )
	);

	console.log();

	console.log( new Range(1e10+1)::avg(), new Range(1e10+1)::sum() );

	for( let r of new Range(5,10) ) {
		console.log( r );
	}
	for( let r of new Map([['x',1], [2,'y']])::values() ) {
		console.log( r );
	}


	console.log( fib::nth(70) );
}
