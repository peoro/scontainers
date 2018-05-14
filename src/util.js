
const assert = require('assert');
const straits = require('js-protocols');
const symbols = require('./symbols.js');
const scontainersTraits = symbols;


const utilTraits = Object.assign( {}, straits.utils, straits.utils.TraitSet.fromKeys({
	addTraits( target, implementationObj ){},
	implScontainer( implementationObj ){},
	wrapScontainer( decoratorFactoryFactory ){}, // return a function factory for the decorator `decoratorFactory` built on `this`
}) );

const {toString} = straits.common.methods;



use traits * from utilTraits;
use traits * from scontainersTraits;


Object.prototype.*addTraits = function( target, implementationObj ) {
	for( let name in implementationObj ) {
		const sym = this[name];
		assert( typeof sym === 'symbol', `No trait \`${name}\`` );

		if( target.hasOwnProperty(sym) ) {
			// trait already implemented; skipping
			continue;
		}

		sym.*impl( target, implementationObj[name] );
	};
}
Object.prototype.*implScontainer = function( implementationObj ) {
	return scontainersTraits.*addTraits( this, implementationObj );
}
Object.prototype.*wrapScontainer = function( decoratorFactoryFactory ) {
	const Container = this;

	const decoratorFactory = decoratorFactoryFactory( Container );
	if( ! decoratorFactory ) {
		// this decorator can't be implemented on `Type`
		return;
	}

	return {
		factory() {
			const Decorator = decoratorFactory( Container );
			assert( typeof Decorator === 'function', `${decoratorFactory.name} is broken.` );

			return function( ...args ) {
				return new Decorator( this, ...args );
			};
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
			const fnFactory = srcFn.factory ? srcFn.factory : srcFn;

			// functions (not factories!) may return null...
			if( srcFn === fnFactory ) {
				if( ! dest::srcFn() ) {
					continue;
				}
			}

			if( srcFn.assignImmediately ) {
				const fn = dest::fnFactory();
				sym.*impl( dest, fn );
				dest[sym].factory = ()=>fn;
			}
			else {
				sym.*impl( dest, function() {
					const fn = dest[sym].factory();
					return fn.apply( this, arguments );
				});
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
	sym.*impl( this, fn );
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

function KVIt( key, value ) {
	this.value = [key, value];
	this.done = false;
}
function VIt( value ) {
	this.value = value;
	this.done = false;
}
function Done() {
	this.done = true;
}


Object.assign( utilTraits, {
	toString,
	replaceSymbol,
	extractKeys,
	assignProtocolFactories,
	KVN, KVIt, VIt, Done,
});
module.exports = utilTraits;
