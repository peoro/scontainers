
'use strict';

const assert = require('assert');

const symbols = require('./symbols');
use protocols from symbols;

const {ReorderedIterator, implementCoreProtocols, implementDerivedProtocols} = require('./processors/index.js');


function identity( arg ) {
	return arg;
}


// a function to extend collections, implementing all the derivable protocols
function extendCollection( Type, ParentType ) {
	const {deriveCoreProtocols, deriveProtocols} = require('./processors/impl.js');
	const {propertiesSymbol, defineProperties} = require('./processors/properties');

	Type::defineProperties({
		argKeys: [],
		ParentType,
		parentCollectionKey: ParentType ? `wrapped` : null,
	});

	Type::deriveCoreProtocols();
	Type::deriveProtocols();
}


// functions to implement decorators (e.g. the result of `.map()` )
// `Decoratee` is the type `Decorator` is built on top of
function implementDecorator( Decorator, Decoratee ) {
	if( ! Decorator ) {
		return;
	}

	const proto = Decorator.prototype;

	Object.getOwnPropertyNames( proto )
		.forEach( (fnName)=>{
			const sym = symbols.hasOwnProperty(fnName) && symbols[fnName];

			if( fnName === 'toString' ) {
				return;
			}

			if( sym ) {
				const fnFactory = proto[fnName];
				if( fnFactory() ) {
					proto[sym] = proto[fnName] = function() {
						const fn = fnFactory();
						proto[sym] = proto[fnName] = fn;
						return fn.apply( this, arguments );
					};
				}
			}
		});

	extendCollection( Decorator, Decoratee );
}
function makeDecoratorFactory( factory ) {
	const factoryCache = new Map();

	const factoryFn = function( Type ) {
		if( factoryCache.has(Type) ) {
			return factoryCache.get(Type);
		}

		const Decorator = factory( Type );
		Decorator.fullName = `${Type.fullName || Type.name}::${Decorator.name}`
		implementDecorator( Decorator, Type );
		factoryCache.set( Type, Decorator );
		return Decorator;
	};

	factoryFn.canProduce = function( Type ) {
		if( factoryCache.has(Type) ) {
			return !! factoryCache.get(Type);
		}

		const Decorator = factory( Type );
		return !! Decorator;
	};

	return factoryFn;
}
function takeProtocol( sym ) {
	assert( this.hasOwnProperty(sym) );
	return this[sym].factory ? this[sym].factory() : this[sym];
}
function aliasFunctionFactory( proto, sym ) {
	if( ! proto.hasOwnProperty(sym) ) {
		return;
	}

	return {
		factory() {
			return proto::takeProtocol(sym);
		}
	};
}


// functions to implement collection for types (e.g. `Array` )
function implementForNewType( Type ) {
	extendObjectWithCollectionSymbols( Type, Type );
	extendObjectWithCollectionSymbols( Type.prototype, Type.prototype );
	extendCollection( Type );
	return Type;
}
function implementForExistingType( Type, Wrapper ) {
	extendObjectWithCollectionSymbols( Type, Wrapper );
	extendObjectWithCollectionSymbols( Type.prototype, Wrapper.prototype );
	extendCollection( Type );
	return Wrapper;
}
function extendObjectWithCollectionSymbols( dest, src ) {
	Object.getOwnPropertyNames( src )
		.forEach( (fnName)=>{
			const sym = symbols.hasOwnProperty(fnName) && symbols[fnName];
			if( fnName === 'toString' ) {
				return;
			}

			if( sym && ! dest.hasOwnProperty(sym) ) {
				// console.log(`Extending ${fnName}`);
				dest[sym] = src[fnName];
			}
			else if( ! sym ) {
				console.log(`Unknown symbol \`${fnName}\` for ${dest.name || dest.constructor.name}`);
			}
		});
}
function extendObjectWithCollectionFactories( dest, src ) {
	Object.getOwnPropertyNames( src )
		.forEach( (fnName)=>{
			const sym = symbols.hasOwnProperty(fnName) && symbols[fnName];

			if( ! sym ) {
				console.log(`Unknown symbol \`${fnName}\` for ${dest.name}`);
				return;
			}

			if( ! dest.hasOwnProperty(sym) ) {
				const fnFactory = src[fnName];
				if( ! fnFactory ) {
					return;
				}

				let fn;
				if( fnFactory.factory ) {
					fn = fnFactory.factory;
				}
				else {
					fn = fnFactory;
				}

				if( fnFactory.factory ) {
					if( fnFactory.assignImmediately ) {
						dest[sym] = fnFactory.factory();
					}
					else {
						dest[sym] = function() {
							const fn = fnFactory.factory();
							assert( fn, `${fnName}'s factory returned null` );
							dest[sym] = fn;
							return fn.apply( this, arguments );
						};
						dest[sym].factory = fnFactory.factory;
					}
				}
				else if( fnFactory() ) {
					dest[sym] = function() {
						const fn = fnFactory();
						assert( fn, `${fnName}'s factory returned null` );
						dest[sym] = fn;
						return fn.apply( this, arguments );
					};
					dest[sym].factory = fnFactory;
				}
			}
		});
}

module.exports = {
	DEBUG: true,
	symbols,
	implementForNewType, implementForExistingType, makeDecoratorFactory,
	extendCollection,
	ReorderedIterator,
};

{
	Object.assign( module.exports, {
		// Object: require('./types/object'),
		Array: require('./types/array'),
		Map: require('./types/map'),
		get Range() {
			return require('./types/range');
		}
		/*
		Map: require('./types/map'),
		Set: require('./types/set'),
		get Range() {
			return require('./types/range');
		}
		*/
	});
}


const {toString, decorate, KVN, Done} = require('./util.js');
const decorator = decorate;

const toStr = toString;

Object.assign( module.exports, {
	toString, KVN, Done
});

require('./types/object.js');
