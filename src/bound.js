
const {symbols} = require('./');

function bindSymbol( sym, symName ) {
	const f = function() {
		if( this === undefined ) {
			throw new Error(`${symName} called on undefined`);
		}
		if( ! this[sym] ) {
			throw new Error(`${symName} called on ${this} (${this::toString()}), that doesn't implement it.`);
		}
		return this[sym].apply( this, arguments );
	};
	f.factory = function() {
		TODO();
		// return new Function(`function ${symName}(){  }`);
	};
	// f.name = symName;
	f.symbol = sym;
	return f;
};

module.exports = symbols[symbols.ownProperties]()
	[symbols.map]( bindSymbol )
	[symbols.collect]( Object );

module.exports.toString = function( ) {
	switch( this ) {
		case null: return `null`;
		case undefined: return `undefined`;
	}
	if( this[symbols.toString] ) {
		return this[symbols.toString]();
	}
	throw new Error(`Nothing, besides null and undefined, should lack ::toString()...`);
	if( this.toString ) {
		return this.toString();
	}
	return `unknown`;
}

const {every} = module.exports;

function hasSymbols( ...syms ) {
	return syms::every( (s)=>!! this[s] );
}

if( require.main === module ) {
	const {Range} = require('./');
	const {map, filter, toString, collect, ownProperties} = module.exports;

	function log( ) {
		console.log( this::toString() );
	}

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
