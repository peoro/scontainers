
const assert = require('assert');
const straits = require('straits');
const {id} = require('../utils_light.js');

use traits * from straits.core;
use traits * from straits.utils;

const utilTraits = straits.utils.TraitSet.fromKeys({
	extractKeys( keys ){},
	defaultGet( key, defaultConstructor ){},

	addTraits( target, implementationObj ){},
	addTraitFactories( target, factoryObj ){},
	implScontainer( implementationObj ){},
	wrapScontainer( decoratorFactoryFactory ){}, // return a function factory for the decorator `decoratorFactory` built on `this`

	describeScontainer(){},
	implCoreGenerators(){},
	implCoreTraits( ){},
	deriveTraits( ){},
});

utilTraits.*borrowTraits( straits.utils, [id`asFreeFunction`, id`asMethod`, id`impl`, id`implTraits`] );
utilTraits.*borrowTraits( straits.common, [id`toString`] );


use traits * from utilTraits;


// remove all the `keys` from `this`, and return an object made of all the removed keys and their values.
Object.prototype.*extractKeys = function( keys ) {
	const result = {};
	keys.forEach( key=>{
		result[key] = this[key];
		delete this[key];
	});
	return result;
};
Map.prototype.*defaultGet = function( key, defaultConstructor ) {
	if( this.has(key) ) {
		return this.get( key );
	} else {
		const value = defaultConstructor( key );
		this.set( key, value );
		return value;
	}
};

// like `implTraits`, but without overriding already implemented traits
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

class Factory {
	constructor( factory, target ) {
		this.target = target;

		if( ! factory ) {
			this.factory = function(){ throw new Error(`No factory`); };
			this.assignImmediately = false;
			this.canProduce = ()=>false;
		}
		else if( typeof factory === 'function' ) {
			this.factory = factory;
			this.assignImmediately = false;
			this.canProduce = function(){ return target::this.factory() !== undefined; };
		}
		else {
			this.factory = factory.factory;
			this.assignImmediately = factory.assignImmediately || false;
			this.canProduce = factory.canProduce || (()=>true);
		}
	}

	produce( ) {
		const {target} = this;
		const fn = target::this.factory();
		assert( fn !== undefined, `A factory didn't produce anything` );
		fn.factory = function(){ return fn; };
		return fn;
	}
}

// `factoryObj` has symbol names as traits and factories as
Object.prototype.*addTraitFactories = function( target, factoryObj ) {
	for( let name in factoryObj ) {
		const factory = new Factory( factoryObj[name], target );
		if( ! factory.canProduce() ) {
			// factory can't produce anything
			continue;
		}

		const sym = this[name];
		assert( typeof sym === 'symbol', `No trait \`${name}\`` );

		if( target.hasOwnProperty(sym) ) {
			// trait already implemented; skipping
			continue;
		}

		if( factory.assignImmediately ) {
			const fn = factory.produce();
			sym.*impl( target, fn );
		}
		else {
			const lazyFn = function() {
				const fn = factory.produce();
				sym.*impl( target, fn );
				return this[sym]( ...arguments );
			};
			lazyFn.factory = function() {
				const fn = factory.produce();
				sym.*impl( target, fn );
				return fn;
			};

			sym.*impl( target, lazyFn );
		}
	}
};

module.exports = utilTraits;

if( require.main === module ) {
	const traits = new straits.utils.TraitSet('a', 'b', 'c', 'x', 'y', 'z');
	use traits * from traits;

	const logs = [];
	function log( arg ) {
		logs.push( arg );
	}
	// checks and clears logs
	function checkLogs( ...expectedLogs ) {
		assert.deepStrictEqual( logs, expectedLogs );
		logs.length = 0;
	}

	const obj = {};
	const factoryObj = {
		a() {
			log( `a factory` );
			return function() {
				log( `a` );
			}
		},
		b() {
			log( `b factory` );
		},
		c: null,

		x: {
			assignImmediately: true,
			factory() {
				log( `x factory` );
				return function() {
					log( `x` );
				}
			},
		},
		y: {
			factory() {
				log( `y factory` );
				return function() {
					log( `y` );
				}
			},
		},
		z: {
			factory() {
				log( `z factory` );
				return function() {
					log( `z` );
				}
			},
			canProduce() {
				log( `z can produce` );
				return false;
			}
		},
	};

	// nothing was logged until now
	checkLogs();

	// so far the non-object factories were just tested to see whether they're valid
	traits.*addTraitFactories( obj, factoryObj );
	checkLogs(
		`a factory`,
		`b factory`,
		`x factory`,
		`z can produce`,
	);

	obj.*a();
	checkLogs( `a factory`, `a` );
	obj.*a();
	checkLogs( `a` );

	assert.throws( ()=>obj.*b() );
	assert.throws( ()=>obj.*c() );

	obj.*x();
	checkLogs( `x` );

	obj.*y();
	checkLogs( `y factory`, `y` );
	obj.*y();
	checkLogs( `y` );

	assert.throws( ()=>obj.*z() );
}
