
'use strict';

const {symbols, Range} = require('../src/');
use traits * from symbols;

Error.stackTraceLimit = 25;

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
		console.log( coll.*toString() );
		console.log();
	}

	print( [1,2,3].*filter( x=>x%2===1 ) );
	print( [1,2,3].*filter( x=>x%2===1 ).*sum() );

	process.exit( 0 );

	// const coll = new Range(7, 21)
	const coll = [7, 3, 1, 5]
		.*slice( 1 )
		.*map( x=>x**2 );

	// print( new Range(7, 21).*uniq() );
	// print( coll.*map(x=>x**2) );
	print( coll );

	console.log( coll.*nth(1) );
	// console.log( new Range(7, 21).*uniq().*len() );
	// console.log( new Range(7, 21).*uniq().*count() );
}
