
const assert = require('assert');
const symbols = require('./symbols.js');

function toString() {
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

function identity( x ) { return x; }
function functionalIf( test, a, b ) {
	return test ? a : b;
}

function hasSymbols( ...syms ) {
	return syms.every( (s)=>!! this[s] );
}

// return a function factory for the decorator `decoratorFactory` built on `this`
function decorate( decoratorFactory ) {
	const Type = this;
	assert( this, `decorator() must be called on an object` );

	if( decoratorFactory.canProduce(Type) ) {
		return {
			factory() {
				const Decorator = decoratorFactory( Type );
				assert( Decorator, `${decoratorFactory.name} can be produced, but go no decorator factory?!` );
				return function() {
					const args = [this, ...arguments];
					return Reflect.construct( Decorator, args );
				};
			}
		};
	}
}

function forEachCollectionSymbol( fn ) {
	assert( this, `forEachValidSymbol() must be called on an object` );

	for( let symName in this ) {
		if( ! this.hasOwnProperty(symName) ) {
			console.log(`Unexpected prototype's enumerable property ${symName}`);
			continue;
		}

		const sym = symbols.hasOwnProperty(symName) && symbols[symName];
		if( ! sym ) {
			console.log(`Unknown symbol ${symName}`);
			continue;
		}

		const value = this[symName];
		if( ! value ) {
			console.log(`Symbol ${symName} has no value O,o`);
			continue;
		}

		fn( value, sym, symName );
	}
}

function implementSymbols( src ) {
	assert( this, `implementSymbols() must be called on an object` );

	src::forEachCollectionSymbol( (srcFn, sym, symName)=>{
		if( this.hasOwnProperty(sym) ) {
			return; // this symbol is already implemented
		}

		this[sym] = srcFn;
		this[sym].factory = ()=>srcFn;
	});
}

// take the keys of `src`  as names for symbols, and its values as either functions or function factories.
// if `this` lacks (some of) those symbols, set them using the provided functions.
function implementSymbolsFromFactory( src ) {
	assert( this, `implementSymbolsFromFactory() must be called on an object` );

	const dest = this;

	src::forEachCollectionSymbol( (srcFn, sym, symName)=>{
		if( dest.hasOwnProperty(sym) ) {
			return; // this symbol is already implemented
		}

		const fnFactory = srcFn.factory ? ::srcFn.factory : srcFn;

		// functions (not factories!) may return null...
		if( srcFn === fnFactory ) {
			if( ! srcFn() ) {
				return;
			}
		}

		if( srcFn.assignImmediately ) {
			const fn = fnFactory();
			dest[sym] = fn;
			this[sym].factory = ()=>fn;
		}
		else {
			dest[sym] = function() {
				const fn = dest[sym].factory();
				return fn.apply( this, arguments );
			};
			dest[sym].factory = function() {
				const fn = fnFactory();
				assert( fn, `${dest.constructor.name}.${symName}'s factory returned null` );
				dest::replaceSymbol( sym, fn );
				return fn;
			};
		}

		if( srcFn.compiler ) {
			dest[sym].compiler = srcFn.compiler;
		}
	});
}

/*
function factoryFn( dest, sym, symName ) {
	const compiler = dest[sym].compiler();
	compiler.body.pushStatement(
		compiler.value.return()
	);

	const fn = compiler.toFunction();
	assert( fn, `${dest.constructor.name}.${symName}'s factory returned null` );
	dest::replaceSymbol( sym, fn );
	return fn;
}
function setSymbolCompilers( src ) {
	assert( this, `setSymbolCompilers() must be called on an object` );

	const dest = this;

	src::forEachCollectionSymbol( (compiler, sym, symName)=>{
		if( ! dest.hasOwnProperty(sym) ) {
			dest[sym] = function() {
				const fn = dest[sym].factory();
				return fn.apply( this, arguments );
			};
			dest[sym].factory = ()=>factoryFn( dest, sym, symName );
		}
		else if( dest[sym].compiler ) {
			return; // this symbol's compiler is already implemented
		}

		dest[sym].compiler = compiler;
	});
}
*/

// replaces `this[sym]` with `fn`
function replaceSymbol( sym, fn ) {
	assert( this, `replaceSymbol() must be called on an object` );
	assert( fn );

	const oldFn = this[sym];

	if( ! fn.compiler && oldFn.compiler ) {
		fn.compiler = oldFn.compiler;
	}
	fn.factory = ()=>fn;
	this[sym] = fn;
}

module.exports = {
	identity,
	functionalIf,
	toString,
	hasSymbols,
	decorate,
	implementSymbols,
	implementSymbolsFromFactory
};