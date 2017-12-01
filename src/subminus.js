
'use strict';

const assert = require('assert');

const protocols = require('js-protocols');

const symbols = new protocols.util.Protocol();
symbols.getPrototypeOf = protocols.core.getPrototypeOf;

const {set, defineAndAssign} = protocols.util.symbols;

function identity( x ) { return x; }
function negate( fn ) { return function(){ return ! fn.apply(this, arguments) }; }

// setting some basic useful functions for types
{
	symbols;

	symbols[defineAndAssign]( Object.prototype, {
		create( propertiesObject ) {
			return Object.create(this, propertiesObject);
		},
		clone() {
			return this[symbols.collect]();
		}
	});

	// redefining `create` for Exotic Objects
	[
		//Function	// no point
		Array,
		//String,	// no point
		// Proxy,

		// Generator,
		//Boolean,	// no point
		Error,
		//Number,	// no point
		Date,
		RegExp,
		Map,
		Set,
		WeakMap,
		// WeaskSet,
		ArrayBuffer,
		DataView,
		Promise,
		// ObjectCreate,
		// ListIterator,
		// Arguments,
		Int32Array.prototype[symbols.getPrototypeOf]().constructor,
		// StringIterator,
		// ArrayIterator,
		// MapIterator,
		// SetIterator,
	].forEach( (exoticType, i)=>{
		assert( !! exoticType, `exoticType[${i}] is undefined` );
		assert( !! exoticType.prototype, `exoticType[${i}] has no prototype` );
		symbols.create[set]( exoticType.prototype, function(propertiesObject){
			return new exoticType();
		});
	});
}

// setting some basic building blocks for collections used by the other algorithms
{
	protocols.util.symbols;
	protocols.core;

	symbols[defineAndAssign]( Object.prototype, {
		has( key ) {
			return this[protocols.core.get || protocols.util.symbols.get]( key ) !== undefined;
		},
		get( key ) {
			return this[key];
		},
		set( key, value ) {
			this[key] = value;
		},
		addValue( value, key ) {
			this[key] = value;
		},
		forEach( fn ) {
			for( let prop in this ) {
				fn( this[prop], prop, this );
			}
		},
		whileEach( fn ) {
			for( let prop in this ) {
			 	if( ! fn(this[prop], prop, this) ) {
					return [prop, this[prop]];
				}
			}
		},
		first( ) {
			const [, first] = whileEach( ()=>false );
			return first;
		},
		nth( n ) {
			let count = 0;

			const [, nth] = whileEach( (v)=>{
				if( count <  n ) {
					++ count;
					return true;
				}
				else {
					return false;
				}
			});
			return nth;
		},
		last( ) {
			let value;
			forEach( (v)=>{ value = v; } );
			return value;
		},
		len( ) {
			return this[protocols.core.reduce || protocols.util.symbols.reduce]( (count)=>count+1, 0 );
		}
	});

	symbols.get
		[protocols.core.set || protocols.util.symbols.set]( Array.prototype, function(key){ assert( key[protocols.core.isNumber || protocols.util.symbols.isNumber](), `Trying to access an Array using \`${key}\` as a key` ); return this[key]; } )
		[protocols.core.set || protocols.util.symbols.set]( Map.prototype, function(key){ return this.get(key); } )
		[protocols.core.set || protocols.util.symbols.set]( Set.prototype, function(key){ if( this.has(key) ) { return key; }; } );

	symbols.set
		[protocols.core.set || protocols.util.symbols.set]( Array.prototype, function(key, value){ assert(key[protocols.core.isNumber || protocols.util.symbols.isNumber](), `Trying to access an Array using \`${key}\` as a key`); this[key] = value; } )
		[protocols.core.set || protocols.util.symbols.set]( Map.prototype, function(key, value){ this.set(key, value); } )
		[protocols.core.set || protocols.util.symbols.set]( Set.prototype, function(key, value){ assert(key === value, `Trying to add a key \`${key}\` and a different value \`${value}\` to a set`); this.add(value); } );

	symbols.addValue
		[protocols.core.set || protocols.util.symbols.set]( Array.prototype, function(value, key){ this.push(value); } )
		[protocols.core.set || protocols.util.symbols.set]( Map.prototype, function(value, key){ this.set(key, value); } )
		[protocols.core.set || protocols.util.symbols.set]( Set.prototype, function(value, key){ this.add(value); } );

	symbols.forEach
		[protocols.core.set || protocols.util.symbols.set]( Array.prototype, function(fn){ this.forEach(fn); } )
		[protocols.core.set || protocols.util.symbols.set]( Map.prototype, function(fn){ this.forEach(fn); } )
		[protocols.core.set || protocols.util.symbols.set]( Set.prototype, function(fn){ this.forEach(fn); } );

	symbols.whileEach
		[protocols.core.set || protocols.util.symbols.set]( Array.prototype, function(fn){
			for( let i = 0; i < this.length; ++i ) {
			 	if( ! fn(this[i], i, this) ) {
					return;
				}
			}
		})
		[protocols.core.set || protocols.util.symbols.set]( Map.prototype, function(fn){
			for( let [key, value] of this ) {
			 	if( ! fn(value, key, this) ) {
					return;
				}
			}
		})
		[protocols.core.set || protocols.util.symbols.set]( Set.prototype, function(fn){
			for( let value of this ) {
			 	if( ! fn(value, value, this) ) {
					return;
				}
			}
		});

	symbols.first
		[protocols.core.set || protocols.util.symbols.set]( Array.prototype, function(){ return this[0]; } );

	symbols.nth
		[protocols.core.set || protocols.util.symbols.set]( Array.prototype, function(n){ return this[ n ]; } );

	symbols.last
		[protocols.core.set || protocols.util.symbols.set]( Array.prototype, function(){ return this[ this.length-1 ]; } );

	symbols.len
		[protocols.core.set || protocols.util.symbols.set]( Array.prototype, function(){ return this.length; } )
		[protocols.core.set || protocols.util.symbols.set]( Map.prototype, function(){ return this.size; } )
		[protocols.core.set || protocols.util.symbols.set]( Set.prototype, function(){ return this.size; } );
}

{
	symbols;

	symbols[defineAndAssign]( Object.prototype, {
		map( fn ) {
			const out = this[symbols.getPrototypeOf]()[symbols.create]();
			this[symbols.forEach]( (value, key)=>{
				out[symbols.addValue]( fn(value, key, this), key );
			});
			return out;
		},
		filter( fn ) {
			const out = this[symbols.getPrototypeOf]()[symbols.create]();
			this[symbols.forEach]( (value, key)=>{
				if( fn(value, key, this) ) {
					out[symbols.addValue]( value, key );
				}
			});
			return out;
		},
		reduce( fn, initialValue ) {
			let v = initialValue;
			this[symbols.forEach]( (value, key)=>{
				v = fn( v, value, key, this );
			});
			return v;
		},
		reduce0( fn ) {
			return this[symbols.drop](1).reduce( fn, this[symbols.first]() );
		},

		some( fn ) {
			return this[symbols.whileEach]( negate(fn) );
		}

		zip( ...collections ) {
			const out = this[symbols.getPrototypeOf]()[symbols.create]();
			this[symbols.forEach]( (value, key)=>{
				const values = collections[symbols.map]( (collection)=>collection[symbols.get](key) );
				out[symbols.set]( key, values );
			});
			return out;
		},
		chunk( n ) {
			assert( n >= 1, `[symbols.chunk](n): n must be >=1, while it's \`${n}\`` );
			const out = [];

			let collection = this[symbols.getPrototypeOf]()[symbols.create]();
			out.push( collection );

			let count = 0;

			this[symbols.forEach]( (value, key)=>{
				collection[symbols.addValue]( value, key );

				++ count;
				if( count >= n ) {
					collection = this[symbols.getPrototypeOf]()[symbols.create]();
					out.push( collection );
					count = 0;
				}
			});

			return out;
		},

		drop( n=1 ) {
			assert( n >= 0, `[symbols.chunk](n): n must be >=0, while it's \`${n}\`` );
			const out = this[symbols.getPrototypeOf]()[symbols.create]();
			let count = 0;
			this[symbols.forEach]( (value, key)=>{
				if( count < n ) {
					++ count;
				}
				else {
					out[symbols.addValue]( value, key );
				}
			});
			return out;
		},
		dropWhile( test ) {
			const out = this[symbols.getPrototypeOf]()[symbols.create]();
			let dropping = true;
			this[symbols.forEach]( (value, key)=>{
				if( dropping ) {
					dropping = test(value, key, this);
					if( dropping ) {
						return;
					}
				}
				else {
					out[symbols.addValue]( value, key );
				}
			});
			return out;
		},

		defaults( ...sources ) {
			sources.forEach( (source)=>{
				source[symbols.forEach]( (value, key)=>{
					if( ! this[symbols.has](key) ) {
						this[symbols.set]( key, value );
					}
				});
			});
			return this;
		},
		assign( ...sources ) {
			sources.forEach( (source)=>{
				source[symbols.forEach]( (value, key)=>{
					this[symbols.set]( key, value );
				});
			});
			return this;
		},

		fromPairs( targetType=Object ) {
			const out = targetType.prototype[symbols.create]();
			this[symbols.forEach]( ([value, key])=>{
				out[symbols.set]( key, value );
			});
			return out;
		},

		keys( ) {
			const out = [];
			this[symbols.forEach]( (value, key)=>{ out[symbols.addValue](key); } );
			return out;
		},
		values( ) {
			const out = [];
			this[symbols.forEach]( (value, key)=>{ out[symbols.addValue](value); } );
			return out;
		},
		entries( ) {
			const out = [];
			this[symbols.forEach]( (value, key)=>{ out[symbols.addValue]([key, value]); } );
			return out;
		},

		collect( targetType ) {
			const targetProto = targetType === undefined ?
				this[symbols.getPrototypeOf]() :
				targetType.prototype;

			const out = targetProto[symbols.create]();
			this[symbols.forEach]( (value, key)=>{
				out[symbols.addValue]( value, key );
			});
			return out;
		},
	});
}

module.exports = symbols;

if( require.main === module ) {
	symbols;

	console.log( [1,5,7][symbols.clone]() );
	console.log( {a:7, b:5, c:1}[symbols.clone]() );
	console.log( new Map([[1,'a'], ['b',2]])[symbols.clone]() );
	console.log( {a:7, b:5, c:1}[symbols.collect]( Map )[symbols.clone]()[symbols.chunk](2) );
	console.log( [['a',7], ['b',5], ['c',1]][symbols.fromPairs]( Map )[symbols.clone]() );
	console.log( [7, 'bao', {x:0}][symbols.collect](Set)[symbols.clone]() );
}

