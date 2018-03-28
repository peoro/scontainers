
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

	if( typeof this === 'string' ) {
		return this
			.replace(/\\n/g, "\\n")
			.replace(/\\'/g, "\\'")
			.replace(/\\"/g, '\\"')
			.replace(/\\&/g, "\\&")
			.replace(/\\r/g, "\\r")
			.replace(/\\t/g, "\\t")
			.replace(/\\b/g, "\\b")
			.replace(/\\f/g, "\\f");
	}

	if( this.toString !== toString ) {
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
				return function( ...args ) {
					return new Decorator( this, ...args );
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
			dest[sym].factory = ()=>fn;
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



// TODO: this stuff should come from 'js-protocols/util'...
// `this` is an object made of symbols; keys of `symbolObj` are keys of `this`. assigns the protocols in `symbolObj` to `target`.
function assignProtocols( target, symbolObj ) {
	assert( symbolObj );
	for (let name in symbolObj) {
		const sym = this[name];
		assert( sym, `Trying to set non existing protocol \`${name}\` to \`${target}\`` );

		if( target.hasOwnProperty(sym) ) {
			// already implemented...
			continue;
		}

		const value = symbolObj[name];
		target[sym] = value;

		// TODO: this shouldn't happen here...
		if( target[sym] && typeof target[sym] === 'object' ) {
			target[sym].factory = ()=>value;
		}
	};
}

// like `assignProtocols`, but the values of `symbolObj` are protocol factories, rather than just protocols
function assignProtocolFactories( dest, symbolObj ) {
	for (let symName in symbolObj) {
		const srcFn = symbolObj[symName];
		const sym = this[symName];

		assert( sym, `No protocol \`${symName}\`` );

		if( dest.hasOwnProperty(sym) ) {
			// already implemented...
			continue;
		}

		if( ! srcFn ) {
			continue;
		}

		{
			const fnFactory = srcFn.factory ? ::srcFn.factory : srcFn;

			// functions (not factories!) may return null...
			if( srcFn === fnFactory ) {
				if( ! dest::srcFn() ) {
					continue;
				}
			}

			if( srcFn.assignImmediately ) {
				const fn = dest::fnFactory();
				dest[sym] = fn;
				dest[sym].factory = ()=>fn;
			}
			else {
				dest[sym] = function() {
					const fn = dest[sym].factory();
					return fn.apply( this, arguments );
				};
				dest[sym].factory = function() {
					const fn = dest::fnFactory();
					assert( fn, `${dest.constructor.name}.${symName}'s factory returned null` );
					dest::replaceSymbol( sym, fn );
					return fn;
				};
			}
		}
	};
}


// replaces `this[sym]` with `fn`
function replaceSymbol( sym, fn ) {
	assert( this, `replaceSymbol() must be called on an object` );
	assert( fn );

	const oldFn = this[sym];

	for( let key in oldFn ) {
		fn[key] = oldFn[key];
	}

	fn.factory = ()=>fn;
	this[sym] = fn;
}

// remove all the `keys` from `this`, and return an object made of all the removed keys and their values.
function extractKeys( keys ) {
	const result = {};
	keys.forEach( key=>{
		result[key] = this[key];
		delete this[key];
	});
	return result;
}


function KVN( key, value, n ) {
	this.key = key;
	this.value = value;
	this.n = n;
}

function KVArr( key, value ) {
	this.value = [key, value];
	this.done = false;
}
function KArr( value ) {
	this.value = value;
	this.done = false;
}
function Done() {
	this.done = true;
}

module.exports = {
	identity,
	functionalIf,
	toString,
	hasSymbols,
	decorate,
	implementSymbols,
	implementSymbolsFromFactory,
	replaceSymbol,
	extractKeys,
	assignProtocols, assignProtocolFactories,
	KVN, KVArr, KArr, Done,
};
