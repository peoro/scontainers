
'use strict';

const {symbols, Range} = require('./');
use protocols from symbols;

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

	print( new Range(7, 21).*uniq() );
	// console.log( new Range(7, 21).*uniq().*len() );
	console.log( new Range(7, 21).*uniq().*count() );
}
