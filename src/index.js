
'use strict';

const assert = require('assert');
const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const coreSymbols = protocols.core;

const symbols = new protocols.util.Protocol();
use protocols from symbols;


// a function to print collections
function toString( obj ) {
	if( obj === undefined ) {
		return `undefined`;
	}
	if( obj.*toString ) {
		return obj.*toString();
	}
	return obj.toString();
}
const toStr = toString;

function identity( arg ) {
	return arg;
}


// collection protocols
{
	// static methods
	symbols[utilSymbols.defineAndAssign]( {}, {
		from( collection ){},	// return a new instance of the collection constructed from `collection`
		fromReorderedIterator( reorderedIterator ) {},
	});
	// core protocols: a collection should explicitely implement them
	symbols[utilSymbols.defineAndAssign]( {}, {
		// associativy collections (Map, Array)
		get( key ){},	// return the value of key ${key} - O(1)
		set( key, value ){},	// set ${value} as value for ${key} - O(1)
		hasKey( key ){},	// return true if ${this} has a key ${key}, false otherwise - O(1)

		//
		// delete( ? ){},	// deletes

		// unindexed collections (Set)
		has( item ){},	// return true or false depending on whether ${item} is in ${this} - O(1)

		// naturally-indexed collections (Array)
		nth( n ){},	// return the ${n}-th element - O(1)
		setNth( n, value ){},
		hasNth( n ){},
		nthKey( n ){},	// return the key associated to the ${n}-th element (${get( nthKey(n) ) === nth(n)})

		// collections without a key, or with automatic key (Set, Array)
		add( value ){},	// adds ${value} to ${this} - O(1)

		// collections with known size
		len(){},	// return the number of elements in the collection - O(1)

		// iterable
		kvIterator(){}, // identical to [Symbol.iterator], except the returned value is always in the form [key, value]
		kvReorderedIterator(){},
		kvAsyncIterator(){},

		// reverse
		reverse(){},	// reverse iteration order - O(1)

		// clearable collection
		clear(){},	// removes every item from ${this} - O(n)
	});

	// derived protocols, automatically implemented
	symbols[utilSymbols.defineAndAssign]( {}, {
		forEach( fn ){},	// call ${fn(value, key, this)} for every item in ${this} - O(n)
		whileEach( fn ){},
		untilEach( fn ){},
		forAny( fn ){},	// like `forEach`, but also works with reordered iterators
		whileAny( fn ){},
		untilAny( fn ){},

		count(){},	// return the number of elements in the collection - any cost, often O(n)
		isEmpty(){},	// return true if the collection is empty, false otherwise - O(1)

		only(){},	// return the only item in ${this} - O(1)
		first(){},	// return the first item in ${this} - O(1)
		last(){},	// return the last item in ${this} - O(1)
		random(){},	// return a random item in ${this} - O(n) // TODO: or O(1) ?

		swap( k1, k2 ){},
		reduce( fn ){},
		reduceFirst( fn ){},
		sum(){},
		avg(){},
		min(){},
		max(){},
		assign( ...collections ){},
		defaults( ...collections ){},
		every( fn ){},
		some( fn ){},
		// TODO: the following still need to be implemented
		find( fn ){},
		findLast( fn ){},

		toString(){},
		collect( TargetType ){},
		consume( TargetType ){},	// like `collect`, but might modify (and even return) `this`

		// stream functions
		keys(){},
		values(){},
		entries(){},
		properties(){}, // iterable: it's the enumerable properties
		ownProperties(){}, // the own properties of `this`
		enumerate(){},
		filter( fn ){},
		uniq(){},
		slice( begin, end ){},
		chunk( n ){},
		map( fn ){},
		mapKey(){},
		cache( CacheType ){},	// cache values resulting from `get()`, `nth()` etc. NOTE: it doesn't cache iteration!
		iter(){}, // removes other properties
		reordered(){}, // removes other properties
		flatten(){},
		flattenDeep(){},
		concat( ...collections ){},
		skipWhile( fn ){},
		takeWhile( fn ){},
		skip( n ){},
		take( n ){},
		groupBy( fn ){},
		cow( CopyType ){},	// copy on write: collects() as soon as you try to modify it
		// TODO: the following still need to be implemented
		remap( fn ){}, // [k:v]::remap( fn(v,k)->(k':v') ) -> [k':v']
		kvMap( fn ){}, // [k:v]::kvMap( fn(v,k)->v' ) -> [(k,v):v'] // .*mapKey( (v,k)=>{k,v} ).*map( (v,{k})=>fn(v,k) )
		unmap( fn ){}, // [(k,v)]::unmap() -> [k:v]
		unmapKeys( fn ){}, // .*keys().*unmap()
		sort(){},
		shuffle(){},
		permute(){},
		groupWhile(){},
		allProperties(){}, // not iterable - manages all properties, owned or not, enumerable or not
	});

	symbols.iterator = Symbol.iterator;
}
// symbols.isInteger = coreSymbols.isInteger;

// a function to extend collections, implementing all the derivable protocols
function extendCollection( Type, ParentType ) {
	const protocols = {};

	const proto = Type.prototype;
	const parentProto = ParentType && ParentType.prototype;
	const propagator = Type.Propagator;

	const assertAllOrNone = ( ...protos )=>{
		const isDefined = (p)=>{
			return proto.hasOwnProperty(symbols[p]);
		};

		const count = protos.reduce( (count, p)=>count + (isDefined(p) ? 1 : 0), 0 );
		if( count !== 0 && count !== protos.length ) {
			const protoStr = protos.map( (p)=>isDefined(p) ? `${p}` : `!${p}` ).join(' ');
			throw new Error(`Only ${count} of the following ${protos.length} protocols are implemented for ${Type.name}, but they should all exist, or none: ${protoStr}`);
		}
	}

	function addProtocols( protocolObj ) {
		extendObjectWithCollectionFactories( proto, protocolObj );
	}
	function decorator( decoratorFactory ) {
		if( decoratorFactory.canProduce(Type) ) {
			return {
				factory() {
					const Decorator = decoratorFactory( Type );
					assert( Decorator, `${decoratorFactory.name} can be produced, but go no decorator factory?!` );
					return function() {
						const args = [this, ...arguments];
						return Reflect.construct( Decorator, args );
						// return Reflect.construct( Decorator, arguments );
					};
				}
			};
		}
	}

	const implementGet = ! proto.*get;

	// extending core protocols
	addProtocols({
		kvIterator() {
			if( proto.*nth ) {
				return function kvIterator() {
					return {
						collection: this,
						i: 0,
						next() {
							const coll = this.collection;
							if( this.i < coll.*len() ) {
								const n = this.i ++;
								return {
									value:[coll.*nthKey(n), coll.*nth(n)],
									done:false
								};
							}
							return { done:true };
						}
					};
				};
			}
		},
		iterator() {
			if( proto.*nth || proto.*has ) {
				return function iterator() {
					return this.*values().*iterator();
				};
			}

			if( proto.*kvIterator ) {
				return function iterator() {
					return this.*kvIterator();
				};
			}
		},

		/*
		reverse() {
			if( proto.*nth && Type[IS_FINITE] ) {
			}
		},
		*/

		hasNth() {
			if( proto.*nth && propagator && propagator.nToParentN && parentProto.*hasNth ) {
				return function hasNth( n ) {
					// TODO: check that `n` is integer
					const parentN = this::propagator.nToParentN(n);
					return parentN !== undefined && this::propagator.parentCollection().*hasNth( parentN );
				};
			}
		},
		nthKey() {
			if( proto.*nth && propagator && propagator.nToParentN && parentProto.*nthKey ) {
				return function nthKey( n ) {
					// TODO: check that `n` is integer
					const parentN = this::propagator.nToParentN(n);
					return parentN !== undefined &&  this::propagator.parentCollection().*nthKey( parentN );
				};
			}
		},

		// get, set, hasKey from `nthKey`
		get() {
			if( proto.*nth && implementGet ) {
				return function get( key ) { return this.*nth( key ); };
			}
		},
		set() {
			if( proto.*setNth && implementGet ) {
				return function set( key, value ) { return this.*setNth( key, value ); };
			}
		},
		hasKey() {
			if( proto.*nth && implementGet ) {
				return function hasKey( key ) { return this.*hasNth( key ); };
			}
		},
	});

	addProtocols( makeIterationProtocols(Type, ParentType) ); // iteration protocols

	// implementing derived protocols
	addProtocols({
		forEach() {
			if( proto.*nth ) {
				return function forEach( fn ) {
					for( let i = 0; i < this.*len(); ++i ) {
						fn(this.*nth(i), this.*nthKey(i), this);
					}
				};
			}
			else if( proto.*kvIterator ) {
				return function forEach( fn ) {
					for( let [key, value] of this.*entries() ) {
						fn( value, key, this );
					}
				};
			}
		},
		whileEach() {
			if( proto.*nth ) {
				return function whileEach( fn ) {
					for( let i = 0; i < this.*len(); ++i ) {
						const key = this.*nthKey( i );
						const value = this.*nth( i );
						if( ! fn(value, key, this) ) {
							return [key, value];
						}
					}
				};
			}
			if( proto.*kvIterator ) {
				return function whileEach( fn ) {
					for( let [key, value] of this.*entries() ) {
						if( ! fn(value, key, this) ) {
							return [key, value];
						}
					}
				};
			}
		},
		untilEach() {
			if( proto.*whileEach ) {
				return function untilEach( fn ) {
					return this.*whileEach( (value, key)=>! fn(value, key, this) );
				};
			}
		},
		forAny: {
			factory() {
				if( proto.hasOwnProperty(symbols.forEach) ) {
					return proto[symbols.forEach].factory ?
						proto[symbols.forEach].factory() :
						proto[symbols.forEach];
				}
				if( proto.*kvReorderedIterator ) {
					return function forAny( fn ) {
						const rit = this.*kvReorderedIterator();
						rit.onNext( ({key, value})=>void fn(value, key) );
						rit.proceed();
					};
				}
			}
		},
		/*
		forAny: aliasFunctionFactory( proto, symbols.forEach ),
		forAny() {
			if( proto.*forEach ) { assert( proto.*forAny ); }
			if( proto.*kvReorderedIterator ) {
				return function forAny( fn ) {
					const rit = this.*kvReorderedIterator();
					rit.onNext( ({key, value})=>void fn(value, key) );
					rit.proceed();
				};
			}
		},
		*/
		whileAny: aliasFunctionFactory( proto, symbols.whileEach ),
		whileAny() {
			if( proto.*kvReorderedIterator ) {
				return function whileAny( fn ) {
					let result;
					{
						const rit = this.*kvReorderedIterator();
						rit.onNext( ({key, value})=>{
							if( ! fn(value, key, this) ) {
								result = [key, value];
								rit.stop();
							}
						});
						rit.proceed();
					}
					return result;
				};
			}
		},
		untilAny: aliasFunctionFactory( proto, symbols.untilEach ),
		untilAny() {
			if( proto.*whileAny ) {
				return function untilAny( fn ) {
					return this.*whileAny( (value, key)=>! fn(value, key, this) );
				};
			}
		},

		count() {
			if( proto.*len ) {
				return function count() { return this.*len(); };
			}
			return function count() { return this.*reduce( (n)=>n+1, 0 ); };
		},
		isEmpty() {
			if( proto.*len ) {
				return function isEmpty() { return ! this.*len(); };
			}
			return function isEmpty() { return ! this.*whileAny( ()=>false ); };
		},

		only() {
			if( proto.*nth ) {
				return function only() {
					assert( this.*len() === 1, `.only() called on a ${this} with ${this.*len()} items` );
					return [this.*nthKey(0), this.*nth(0)];
				};
			}
			if( proto.*len ) {
				return function only() {
					assert( this.*len() === 1, `.only() called on a ${this} with ${this.*len()} items` );
					return this.*whileEach( ()=>false );
				};
			}
			return function only() {
				let res;
				this.*whileAny( (value, key)=>{
					assert( ! res, `only() called on a ${this} with multiple items` );
					res = [key, value];
					return true;
				});
				assert( res, `only() called on an empty ${this}`);
				return res;
			};
		},
		first() {
			if( proto.*nth ) {
				return function first() {
					return [this.*nthKey(0), this.*nth(0)];
				};
			}
			if( proto.*kvIterator ) {
				return function first() {
					return this.*kvIterator().next().value;
				};
			}
 			return function first() {
				return this.*whileAny( ()=>false );
			}
		},
		last() {
			if( proto.*nth ) {
				return function last() {
					const n = this.*len() - 1;
					return [this.*nthKey(n), this.*nth(n)];
				};
			}
			else if( proto.*reverse ) {
				return this.*reverse().*first();
			}
		},
		random() {
			if( proto.*nth ) {
				return function random() {
					const n = Math.floor( Math.random()*this.*len() );
					return [this.*nthKey(n), this.*nth(n)];
				};
			}
		},

		swap() {
			if( proto.*get && proto.*set ) {
				return function( key1, key2 ) {
					const value1 = this.*get( key1 );
					this.*set( key1, this.*get(key2) );
					this.*set( key2, value1 );
				};
			}
		},
		reduce() {
			if( proto.*forAny ) {
				return function reduce( fn, start ) {
					let result = start;
					this.*forAny( (value, key)=>{
						result = fn( result, value, key, this );
					});
					return result;
				};
			}
		},
		reduceFirst() {
			// TODO: if `proto.*nth`, this can be optimized
			return function reduceFirst( fn ) {
				let result;
				let first = true;
				this.*forAny( (value, key)=>{
					if( first ) {
						result = value;
						first = false;
						return;
					}
					result = fn( result, value, key, this );
				});
				return result;
			};
		},
		sum() {
			if( proto.*reduce ) {
				return function sum() { return this.*reduce( (sum, n)=>sum+n, 0 ); };
			}
		},
		avg() {
			if( proto.*len ) {
				return function avg() {
					return this.*sum() / this.*len();
				};
			}
			if( proto.*reduce ) {
				return function avg() {
					const [sum, count] = this.*reduce( ([sum, count], n)=>[sum+n, count+1], [0,0] );
					return sum / count;
				};
			}
		},
		min() {
			// TODO: `reduce` could be more performant in some cases...
			if( proto.*reduceFirst ) {
				return function () {
					return this.*reduceFirst( (min, n)=>Math.min(min, n) );
				};
			}
		},
		max() {
			// TODO: `reduce` could be more performant in some cases...
			if( proto.*reduceFirst ) {
				return function () {
					return this.*reduceFirst( (max, n)=>Math.max(max, n) );
				};
			}
		},
		assign() {
			if( proto.*add ) {
				return function assign( ...collections ) {
					return collections
						.*flatten()
						.*forAny( (value)=>this.*add(value) );
				};
			}
			if( proto.*set ) {
				return function assign( ...collections ) {
					return collections
						.*flatten()
						.*forAny( (value, key)=>this.*set(key, value) );
				};
			}
		},
		defaults() {
			if( proto.*set ) {
				return function defaults( ...collections ) {
					return collections
						.*flatten()
						.*forAny( (value, key)=>{
							if( ! this.*hasKey(key) ) {
								this.*set( key, value );
							}
						});
				};
			}
		},
		every() {
			return function every( fn ) {
				return ! this.*whileAny( fn );
			};
		},
		some() {
			return function some( fn ) {
				return !! this.*untilAny( fn );
			};
		},

		toString() {
			if( proto.*nth ) {
				return function toString() {
					const out = this.*map( (value)=>toStr(value) ).*collect( Array );
					return `*[${out.join(', ')}]`;
				};
			}
			if( proto.*forAny && proto.*has ) {
				return function toString() {
					const out = this.*map( (item)=>toStr(item) ).*collect( Array );
					return `*{${out.join(', ')}}`;
				}
			}
			if( proto.*forAny ) {
				return function toString() {
					const out = this
						.*map( (value, key)=>`${toStr(key)}:${toStr(value)}` )
						.*collect( Array );
					return `*{${out.join(', ')}}`;
				}
			}
			console.warn( `${Type.name} not printable` );
		},
		consume() {
			return function consume( TargetType ) {
				assert( TargetType.*from, `No ${TargetType.name}.*from()` );
				return TargetType.*from( this );
			};
		},
		collect() {
			return function collect( TargetType ) {
				assert( TargetType.*from, `No ${TargetType.name}.*from()` );
				return TargetType.*from( this );
			};
		},
	});

	// making sure that everything is fine
	{
		assert( proto.*count, `${Type.name} is uncountable` );
		try {
			assert( proto.*kvIterator || proto.*kvReorderedIterator, `${Type.name} is not iterable` );
			assert( proto.*forAny, `${Type.name} is not iterable` );
			if( proto.*nth && proto.*get ) { assert( proto.*nthKey, `${Type.name} keys aren't enumerable` ); }
		} catch(err) {}
		assertAllOrNone( ...Object.keys({ get:0, hasKey:0 }) );
		assertAllOrNone( ...Object.keys({ nth:0, hasNth:0 }) );
		if( proto.*nth ) {
			assert( proto.*len, `${Type.name} has .nth(), but no .len() ?!` );
			assert( proto.*hasNth, `${Type.name} has .nth(), but no .hasNth() ?!` );
			if( proto.*get ) {
				assert( proto.*nthKey, `${Type.name} has .nth() and .get(), but no .nthKey() ?!` );
			}
		}
		if( proto.*nth ) {
			assert( proto.*get, `${Type.name} has .nth() but no .get()?` );
		}
		// assertAllOrNone( ...Object.keys({ nth:0, len:0 }) ); // `Map` has no `.*nth`
	}

	addProtocols({
		keys() {
			return function keys() {
				return this.*map( (value, key)=>key ).*values();
			};
		},
		values: decorator( require('./decorators/values') ),
		entries: decorator( require('./decorators/entries') ),
		enumerate() {
			return function enumerate() {
				let count = 0;
				return this.*map( (value)=>[count++, value] );
			};
		},
		/*
		ownProperties: decorator( require('./decorators/object_own_properties') ),
		properties: decorator( require('./decorators/object_enumerable_properties') ),
		*/
		filter: decorator( require('./decorators/filter') ),
		slice: decorator( require('./decorators/slice') ),
		chunk: decorator( require('./decorators/chunk') ),
		map: decorator( require('./decorators/map') ),
		mapKey: decorator( require('./decorators/map_key') ),
		cache: decorator( require('./decorators/cache') ),
		iter: decorator( require('./decorators/iter') ),
		reordered: decorator( require('./decorators/reordered') ),
		groupBy: decorator( require('./decorators/group_by') ),
		cow: decorator( require('./decorators/cow') ),
		flatten: decorator( require('./decorators/flatten') ),
		flattenDeep() {
			return function flattenDeep() {
				return this.*map( (value)=>value.*count ? value.*flattenDeep() : value ).*flatten();
			};
		},
		concat() {
			return function concat( ...collections ) {
				return [this, ...collections].*flatten();
			}
		},
		uniq() {
			if( proto.*filter ) {
				return function uniq() {
					let last = NaN;
					return this.*filter( (value, key)=>{
						const result = ( last !== value );
						last = value;
						return result;
					});
				};
			}
		},
		skipWhile: decorator( require('./decorators/skip_while') ),
		takeWhile: decorator( require('./decorators/take_while') ),
		skip() {
			if( proto.*slice ) {
				return function skip( n ) { return this.*slice(n); };
			}
			return function skip( n ) {
				let counter = 0;
				return this.*skipWhile( ()=>{
					++ counter;
					return counter < n;
				});
			};
		},
		take() {
			if( proto.*slice ) {
				return function take( n ) { return this.*slice(0, n); };
			}
			return function take( n ) {
				let counter = 0;
				return this.*takeWhile( ()=>{
					++ counter;
					return counter < n;
				});
			};
		}
	});
}

class ReorderedIterator {
	constructor( propagator ) {
		this.propagator = propagator;

		this.proceed = ()=>{ MUST_BE_IMPLEMENTED(); };
		this.resume = ()=>{ MUST_BE_IMPLEMENTED(); };
		this.stop = ()=>{ MUST_BE_IMPLEMENTED(); };
		this.onNextFn = ()=>{};
		this.onEndFn = ()=>{};

		{
			this.pushNext = ReorderedIterator.prototype.pushNext;
			if( propagator.propagateMulti ) {
				this.pushNext = function next( kv ) {
					TODO();
				};
			}
			else if( ! propagator.alwaysPropagate ) {
				this.pushNext = function next( kv ) {
					if( kv ) {
						this::ReorderedIterator.prototype.pushNext( kv );
					}
				};
			}
		}
	}
	// register handlers for some common events...
	onNext( fn ) {
		this.onNextFn = fn;
		return this;
	}
	onEnd( fn ) {
		this.onEndFn = fn;
		return this;
	}
	// sends the events above
	pushNext( kv ) {
		if( ! kv && ! this.propagator.propagateMulti && ! this.propagator.alwaysPropagate ) {
			// in this case `kv` is goig to be `undefined`...
		}

		assert( kv instanceof ReorderedIterator.KV, `${kv}` );
		this.onNextFn( kv );
		if( kv.done ) {
			this.stop();
		}
		return kv;
	}
	pushEnd() {
		this.onEndFn();
	}
}
ReorderedIterator.KV = class KV {
	constructor( key, value ) {
		this.key = key;
		this.value = value;
		this.skip = false;
		this.done = false;
	}
};

function makeIterationProtocols( Type, ParentType ) {
	const proto = Type.prototype;
	const parentProto = ParentType && ParentType.prototype;

	const propagator = Type.Propagator;

	return {
		kvIterator() {
			if( ! propagator ) { return; }
			if( propagator.reorder ) { return; }
			if( ! parentProto.*kvIterator ) { return; }

			return function kvIterator() {
				const self = this;
				const parentCollection = this::propagator.parentCollection();
				const it = parentCollection.*kvIterator();
				return {
					next() {
						const next = it.next();
						if( next.done ) {
							return next;
						}

						const [key, value] = next.value;
						const arg = new ReorderedIterator.KV( key, value );
						const kv = self::propagator.next( arg );

						if( propagator.propagateMulti ) {
							TODO();
						}
						else if( ! propagator.alwaysPropagate ) {
							if( kv ) {
								return {
									done: false,
									value: [kv.key, kv.value]
								};
							}
							else {
								return this.next();
							}
						}
						else {
							return {
								done: false,
								value: [kv.key, kv.value]
							};
						}
					}
				};
			};
		},
		kvReorderedIterator() {
			if( proto.*kvIterator ) {
				return function kvReorderedIterator() {
					const it = this.*kvIterator();
					const rit = new ReorderedIterator({
						alwaysPropagate: true,
						propagateMulti: false,
						needState: false,
						reorder: false
					});

					let next;
					rit.proceed = ()=>{
						next = it.next();
						rit.resume();
					};
					rit.resume = ()=>{
						while( ! next.done ) {
							const [key, value] = next.value;
							next = it.next();

							rit.pushNext( new ReorderedIterator.KV(key, value) );
						}
					};
					rit.stop = ()=>{
						next.done = true; // ugly hack just to spare an extra var and check, lol
					};

					return rit;
				};
			}

			if( ! propagator ) { return; }

			if( parentProto.*kvReorderedIterator ) {
				return function kvReorderedIterator() {
					const parentCollection = this::propagator.parentCollection();
					const prit = parentCollection.*kvReorderedIterator();
					const rit = new ReorderedIterator( propagator );

					rit.proceed = ()=>{
						let state = {};

						// onStart:
						if( propagator.start ) {
							rit.pushNext( this::propagator.start(state) );
						}

						// onNext:
						prit.onNext( (kv)=>{
								rit.pushNext( this::propagator.next(kv, state) );
							})
							.proceed();

						// onEnd:
						finish();
					};
					rit.resume = ()=>{
						prit.resume();
						finish();
					};
					rit.stop = ()=>{
						prit.stop();
					};

					let finished = false;
					const finish = ()=>{
						if( finished ) { return; } finished = true;

						if( propagator.end ) {
							rit.next( this::propagator.end(state) );
						}
					};

					return rit;
				};
			}
			else {
				console.log( `Uh, ${Type.name} doesn't support reordered iteration??` );
			}
		},
		/*
		kvAsyncIterator() {
		},
		*/
		iterator() {
			if( proto.*kvIterator ) {
				return function iterator() {
					return this.*kvIterator();
				}
			}
		}
	};
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
function aliasFunctionFactory( proto, sym ) {
	if( ! proto.hasOwnProperty(sym) ) {
		return;
	}

	return {
		factory() {
			return proto[sym].factory ? proto[sym].factory() : proto[sym];
		}
	};
}

function decorator( Type, decoratorFactory ) {
	if( decoratorFactory.canProduce(Type) ) {
		return {
			factory() {
				const Decorator = decoratorFactory( Type );
				assert( Decorator, `${decoratorFactory.name} can be produced, but go no decorator factory?!` );
				return function() {
					const args = [this, ...arguments];
					return Reflect.construct( Decorator, args );
					// return Reflect.construct( Decorator, arguments );
				};
			}
		};
	}
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
				console.log(`Unknown symbol ${fnName}`);
			}
		});
}
function extendObjectWithCollectionFactories( dest, src ) {
	Object.getOwnPropertyNames( src )
		.forEach( (fnName)=>{
			const sym = symbols.hasOwnProperty(fnName) && symbols[fnName];

			if( ! sym ) {
				console.log(`Unknown symbol ${fnName}`);
			}

			if( sym && ! dest.hasOwnProperty(sym) ) {
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
	ReorderedIterator,
	toString
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

{
	Object.*from = function from( collection ) {
		// TODO: this function should be specialized, just like the rest of what this lib does...
		if( collection.*forAny ) {
			const object = {};
			collection.*forAny( (value, key)=>void (object[key] = value) );
			return object;
		}
		assert( false );
	};
	extendObjectWithCollectionFactories( Object.prototype, {
		ownProperties: decorator( Object, require('./decorators/object_own_properties') ),
		properties: decorator( Object, require('./decorators/object_enumerable_properties') ),
		// TODO: override `toString`, but force its overriddance
		toString() {
			return function toString() {
				if( this.toString !== Object.prototype.toString ) {
					return this.toString();
				}

				const out = this.*properties()
					.*map( (value, key)=>`${toStr(key)}:${toStr(value)}` )
					.*collect( Array );
				return `{${out.join(', ')}}`;
			}
		}
	});
}
