
require('../src/index.js'); // to implement some symbols, like `map`
require('../src/types/object.js'); // to generate some symbols, like Object[symbols.ownProperties]

const symbols = require('../src/symbols.js');
const {toString, hasSymbols} = require('../src/util.js');

function bindSymbol( sym, symName ) {
	const f = function() {
		if( this === undefined ) {
			throw new Error(`${symName} called on undefined`);
		}
		if( ! this[sym] ) {
			throw new Error(`${symName} called on ${this}, that doesn't implement it.`);
		}

		try {
			return this[sym].apply( this, arguments );
		}
		catch( err ) {
			console.log(`Error while calling ${this}.${symName}(${Array.from(arguments)})`);
			throw err;
		}
	};
	f.factory = function() {
		global.TODO();
		// return new Function(`function ${symName}(){  }`);
	};
	// f.name = symName;
	f.symbol = sym;
	return f;
}

const boundFunctions = {};
for( const symName in symbols ) {
	let sym = symbols[symName];
	boundFunctions[symName] = bindSymbol( sym, symName );
}
boundFunctions.toString = toString;

module.exports = boundFunctions;

if( require.main === module ) {
	const {Range} = require('./');
	const {map, filter, toString, collect, ownProperties} = module.exports;

	const log = function( ) {
		console.log( this::toString() );
	};

	{
		console.log();

		new Range(10)
			::filter( (n)=>n%2 )
			::map( (n)=>n*n )
			::log();
	}

	{
		console.log();

		null::log();
		undefined::log();
		([22, 7, -1])::log();
		({})::log();
		({a:1, b:2, c:3})::log();
		({a:1, b:2, c:3})::ownProperties()::collect( Map )::log();
		[]::log();
		7::log();
		NaN::log();
		false::log();
		(function(){})::log();
	}

	{
		console.log();

		const range = new Range(10);
		const mRange = range::map( (n)=>n**n );
		const fRange = range::filter( (n)=>n%2 );

		range::log();
		range::hasSymbols( symbols.nth )::log();
		range::hasSymbols( symbols.iterator )::log();
		range::hasSymbols( symbols.iterator, symbols.nth )::log();
		mRange::log();
		mRange::hasSymbols( symbols.nth )::log();
		mRange::hasSymbols( symbols.iterator )::log();
		mRange::hasSymbols( symbols.iterator, symbols.nth )::log();
		fRange::log();
		fRange::hasSymbols( symbols.iterator )::log();
		fRange::hasSymbols( symbols.nth )::log();
		fRange::hasSymbols( symbols.iterator, symbols.nth )::log();
	}
}
