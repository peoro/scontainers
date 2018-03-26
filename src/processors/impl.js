
const assert = require('assert');

const symbols = require('../symbols');

const {
	from, nth, nthKVN, setNth, nToKey, keyToN, get, getKVN, set, hasKey, has, add, len, reverse, clear, kvIterator,
	kvReorderedIterator, forEach, whileEach, untilEach, count, isEmpty, only, first, last, random, swapNs, swapKeys, swap,
	reduce, reduceFirst, sum, avg, min, max, every, some, find, findLast, toString, collect, consume, keys, values,
	entries, properties, ownProperties, enumerate, filter, uniq, slice, chunk, map, mapKey, cache, iter, reordered,
	flatten, flattenDeep, concat, skipWhile, takeWhile, skip, take, groupBy, cow, remap, kvMap, unmap, unmapKeys, sort,
	shuffle, permute, groupWhile, allProperties, assign, defaults, collectInto, repeat, loop, iterator
} = symbols;

const util = require('../util.js');
const {implementSymbolsFromFactory, extractKeys, assignProtocolFactories, assignProtocols} = util;
const {propertiesSymbol} = require('./properties');

const {ReorderedIterator} = require('./reordered_iterator.js');

const toStr = util.toString;


function implementDerivedProtocols() {
	assert( this, `implementDerivedProtocols() must be called on an object` );

	const Collection = this;
	const proto = Collection.prototype;

	// running a quick validity check on `this`
	{
		if( proto.*nth && proto.*nToKey ) {
			assert( proto.*nToKey, `${Collection.name} misses .\*nToKey()` );
			assert( proto.*len, `${Collection.name} misses .\*len()` );
			// assert( proto.*get, `${Collection.name} misses .\*get()` );
		}
		//assert( proto.*kvIterator || proto.*kvReorderedIterator, `${Collection.name} is not iterable` );
	}

	proto::implementSymbolsFromFactory({
	});

	proto::implementSymbolsFromFactory({
		iterator() {
			if( proto.*nth || proto.*has ) {
				return function() {
					return this.*values().*iterator();
				};
			}

			if( proto.*kvIterator ) {
				return function() {
					return this.*kvIterator();
				};
			}
		},
	});
}






function deriveCoreProtocols() {
	assert( this, `deriveCoreProtocols() must be called on an object` );

	const Collection = this;
	const proto = Collection.prototype;

	symbols::assignProtocolFactories( proto, {
		nth() {
			if( proto.*nthKVN ) {
				return function( n ) {
					const kvn = this[nthKVN]( n );
					if( kvn ) {
						return kvn.value;
					}
				}
			}
		},
		get() {
			if( proto.*getKVN ) {
				return function( key ) {
					const kvn = this[getKVN]( key );
					if( kvn ) {
						return kvn.value;
					}
				}
			}
		},
		iterator() {
			if( proto.*kvIterator ) {
				return function iterator() {
					return this.*kvIterator();
				}
			}
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
		},
	});

}

function deriveProtocols() {
	assert( this, `deriveProtocols() must be called on an object` );

	const Collection = this;
	const proto = Collection.prototype;

	// checking that the collection is OK
	{
	}

	symbols::assignProtocolFactories( proto, {
		forEach() {
			if( proto.*kvIterator ) {
				return function forEach( fn ) {
					const it = this.*kvIterator();
					let next = it.next();
					while( ! next.done ) {
						const [value, key, n] = next;
						fn( value, key, n );
						next = it.next();
					}
				};
			}
			if( proto.*kvReorderedIterator ) {
				return function forEach( fn ) {
					const rit = this.*kvReorderedIterator();
					rit.onNext( ({key, value, n})=>void fn(value, key, n) );
					rit.proceed();
				};
			}
		},
		whileEach() {
			if( proto.*kvIterator ) {
				return function forEach( fn ) {
					const it = this.*kvIterator();
					let next = it.next();
					while( ! next.done ) {
						const [value, key, n] = next.value;
						if( ! fn( value, key, n ) ) {
							return next.value;
						}
						next = it.next();
					}
				};
				if( proto.*kvReorderedIterator ) {
					return function whileAny( fn ) {
						let result;
						{
							const rit = this.*kvReorderedIterator();
							rit.onNext( ({key, value})=>{
								if( ! fn(value, key, n) ) {
									result = new KVN(key, value, n);
									rit.stop();
								}
							});
							rit.proceed();
						}
						return result;
					};
				}
			}
		},
		untilEach() {
			if( proto.*whileEach ) {
				return function untilEach( fn ) {
					return this.*whileEach( (value, key)=>! fn(value, key, this) );
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
			if( proto.*nthKVN ) {
				return function only() {
					assert( this.*len() === 1, `${this}.only()'s collection has ${this.*len()} items` );
					return this.*nthKVN( 0 );
				};
			}
			if( proto.*len ) {
				return function only() {
					assert( this.*len() === 1, `${this}.only()'s collection has ${this.*len()} items` );
					return this.*kvIterator().next();
				};
			}
			return function only() {
				const it = this.*kvIterator();
				let next = it.next();
				assert( ! next.done, `${this}.only()'s collection is empty` );
				assert( it.next().done, `${this}.only()'s collection has multiple items` );
				return next;
			};
		},
		first() {
			if( proto.*nthKVN ) {
				return function first() {
					return this.*nthKVN( 0 );
				};
			}
			if( proto.*kvIterator ) {
				return function first() {
					return this.*kvIterator().next();
				};
			}
		},
		last() {
			if( proto.*nthKVN ) {
				return function last() {
					const n = this.*len() - 1;
					return this.*nthKVN( n );
				};
			}
			else if( proto.*reverse ) {
				return this.*reverse().*first();
			}
		},
		random() {
			if( proto.*nthKVN ) {
				return function random() {
					const n = Math.floor( Math.random()*this.*len() );
					return this.*nthKVN( n );
				};
			}
		},

		swapNs() {
			if( proto.*nth && proto.*setNth ) {
				return function( n1, n2 ) {
					const value1 = this.*nth( key1 );
					this.*setNth( n1, this.*nth(key2) );
					this.*setNth( n2, value1 );
				};
			}
		},
		swapKeys() {
			if( proto.*get && proto.*set ) {
				return function( key1, key2 ) {
					const value1 = this.*get( key1 );
					this.*set( key1, this.*get(key2) );
					this.*set( key2, value1 );
				};
			}
		},

		reduce() {
			if( proto.*forEach ) {
				return function reduce( fn, start ) {
					let state = start;
					this.*forEach( (value, key)=>{
						state = fn( state, value, key, this );
					});
					return state;
				};
			}
		},
		reduceFirst() {
			if( proto.*kvIterator ) {
				return function reduceFirst( fn ) {
					const it = this.*kvIterator();
					let next = it.next();
					let state = next.value[1];

					while( ! next.done ) {
						const [value, key, n] = next;
						state = fn( state, value, key, n );
						next = it.next();
					}

					return state;
				};
			}
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
						.*forEach( (value)=>this.*add(value) );
				};
			}
			if( proto.*set ) {
				return function assign( ...collections ) {
					return collections
						.*flatten()
						.*forEach( (value, key)=>this.*set(key, value) );
				};
			}
		},
		defaults() {
			if( proto.*set ) {
				return function defaults( ...collections ) {
					return collections
						.*flatten()
						.*forEach( (value, key)=>{
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
					const out = this.*map( (value)=>value::toStr() ).*collect( Array );
					return `*[${out.join(', ')}]`;
				};
			}
			if( proto.*forEach && proto.*has ) {
				return function toString() {
					const out = this.*map( (item)=>item::toStr() ).*collect( Array );
					return `*{${out.join(', ')}}`;
				}
			}
			if( proto.*forEach ) {
				return function toString() {
					const out = this
						.*map( (value, key)=>`${key::toStr()}:${value::toStr()}` )
						.*collect( Array );
					return `*{${out.join(', ')}}`;
				}
			}
			console.warn( `${Collection.name} not printable` );
		},

		consume() {
			return function consume( TargetCollection ) {
				assert( TargetCollection.*from, `No ${TargetCollection.name}.*from()` );
				return TargetCollection.*from( this );
			};
		},
		collect() {
			return function collect( TargetCollection ) {
				assert( TargetCollection.*from, `No ${TargetCollection.name}.*from()` );
				return TargetCollection.*from( this );
			};
		},
	});


	function decorator( decoratorFactory ) {
		if( decoratorFactory.canProduce(Collection) ) {
			return {
				factory() {
					const Decorator = decoratorFactory.factory ?
						decoratorFactory.factory( Collection ) :
						decoratorFactory( Collection );
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
	function requireDecorator( moduleName ) {
		return decorator( require(`../decorators/${moduleName}.js`) );
	}

	symbols::assignProtocolFactories( proto, {
		keys() {
			return function keys() {
				return this.*map( (value, key)=>key ).*values();
			};
		},
		values: requireDecorator('values'),
		entries: requireDecorator('entries'),
		enumerate() {
			return function enumerate() {
				TODO();
				let count = 0;
				return this.*map( (value)=>[count++, value] );
			};
		},
		/*
		ownProperties: requireDecorator('object_own_properties'),
		properties: requireDecorator('object_enumerable_properties'),
		*/
		filter: requireDecorator('filter'),
		slice: requireDecorator('slice'),
		chunk: requireDecorator('chunk'),
		map: requireDecorator('map'),
		mapKey: requireDecorator('map_key'),
		cache: requireDecorator('cache'),
		iter: requireDecorator('iter'),
		reordered: requireDecorator('reordered'),
		groupBy: requireDecorator('group_by'),
		cow: requireDecorator('cow'),
		flatten: requireDecorator('flatten'),
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
		skipWhile: requireDecorator('skip_while'),
		takeWhile: requireDecorator('take_while'),
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









function deriveProtocolsForRootType( configuration={} ) {
	assert( this, `deriveProtocolsForRootType() must be called on an object` );
	const check = (cond, err)=>{
		assert( cond, `${this.name}.compileProtocolsForTransformation(): ${err}` );
	};

	// taking the non-protocol data from `configuration` (e.g.  `nStage` and `stage`)
	let {nthUnchecked, getUnchecked} = configuration::extractKeys( Object.keys({ nthUnchecked:null, getUnchecked:null }) );
	// deriving the missing non-protocol functions we can derive
	{
		if( nthUnchecked ) {
			check( !getUnchecked, `either supply \`nthUnchecked\` or \`getUnchecked\`` );
			getUnchecked = function( key ) {
				const n = this[keyToN]( key );
				return nthUnchecked( n );
			}
		}
	}

	// everything in `compilerConfiguration` should be protocol generator factories: assigning them to `this`
	symbols::assignProtocols( this.prototype, configuration );

	// deriving the other core protocol generator factories we can derive from the non-protocol data
	{
		symbols::assignProtocols( this.prototype, {
			hasKey() {
				if( nthUnchecked ) {
					return function( key ) {
						const n = this[keyToN]( key );
						return Number.isInteger(n) && n >= 0 && n < this[len]();
					}
				}
			},

			nthKVN() {
				if( nthUnchecked ) {
					return function( n ) {
						return new KVN( this[nToKey]( n ), this::nthUnchecked( n ), n );
					}
				}
			},
			getKVN() {
				if( getUnchecked ) {
					return function( key ) {
						if( this::hasKey( key ) ) {
							return new KVN( key, this::getUnchecked( key ), this[keyToN]( key ) );
						}
					}
				}
			},

			nth() {
				if( nthUnchecked ) {
					return function( n ) {
						assert( Number.isInteger(n), `${Collection.name}.nth(${n}): ${n} not valid` );
						if( n >= 0 && n < this[len]() ) {
							return this::nthUnchecked( n );
						}
					}
				}
			},
			get() {
				if( getUnchecked && hasKey ) {
					return function( key ) {
						if( ! this[hasKey]( key ) ) {
							return;
						}
						return this::getUnchecked( key );
					}
				}
			},

			kvIterator() {
				if( nthUnchecked ) {
					return function kvIterator() {
						return {
							collection: this,
							i: 0,
							next() {
								const coll = this.collection;
								if( this.i < coll.*len() ) {
									const n = this.i ++;
									return new KVNArr( coll.*nToKey(n), coll::nthUnchecked(n), n );
								}
								return new Done();
							}
						};
					};
				}
			},
		});
	}

	// deriving all the remaining protocol generators
	this::deriveCoreProtocols();

	// deriving non-core protocols from our protocol generators
	this::deriveProtocols();
}


function deriveProtocolsForTransformation( configuration={} ) {
	assert( this, `deriveProtocolsForTransformation() must be called on an object` );
	const check = (cond, err)=>{
		assert( cond, `${this.name}.compileProtocolsForTransformation(): ${err}` );
	};

	const Collection = this;
	const proto = this;
	const ParentCollection = this[propertiesSymbol].ParentType;
	check( ParentCollection, `need to specify the ParentType` );
	const parentProto = ParentCollection.prototype;
	const parentKey = this[propertiesSymbol].parentCollectionKey;

	// TODO: `stage` (and its specializations) could be improved...
	// most collections don't do anything *before* `stage` returns from recursion.
	// it would be more efficient (and easier to write) if we had a `stageEnd` that doesn't recurse, like the old `propagator.next`.

	// taking the non-protocol data from `configuration` (e.g.  `nStage` and `stage`)
	let {stage, nStage, kStage, indexToParentIndex, nToParentN, keyToParentKey} =
		configuration::extractKeys( Object.keys({
			stage:null, nStage:null, kStage:null, indexToParentIndex:null, nToParentN:null, keyToParentKey:null
		}) );
	// deriving the missing non-protocol functions we can derive
	{
		check( !!stage === !!indexToParentIndex && !!nStage === !!nToParentN && !!kStage === !!keyToParentKey,
			`\`*Stage\` needs to match \`*ToParent*\`` );

		if( stage ) {
			check( !nStage && !kStage, `either supply \`stage\` or \`nStage\` or \`kStage\`` );
			nStage = stage;
			kStage = stage;
		}

		if( indexToParentIndex ) {
			check( !nToParentN && !keyToParentKey, `either supply \`indexToParentIndex\` or  \`nToParentN\` or \`keyToParentKey\`` );
			nToParentN = indexToParentIndex;
			keyToParentKey = indexToParentIndex;
		}
	}

	// all the remaining stuff in `compilerConfiguration` should be protocol generator factories: assigning them to `this`
	symbols::assignProtocolFactories( this.prototype, configuration );

	// deriving the other core protocol factories we can derive from the non-protocol data
	{
		symbols::assignProtocolFactories( this.prototype, {
			nToKey() {
				if( nToParentN && parentProto[nToKey] ) {
					return function( n ) {
						const parentN = this::nToParentN( n );
						return this[parentKey][nToKey]( parentN );
					}
				}
			},
			keyToN() {
				if( keyToParentKey && parentProto[keyToN] ) {
					return function( key ) {
						const parentKey = this::keyToParentKey( key );
						return this[parentKey][keyToN]( parentKey );
					}
				}
			},

			nthKVN() {
				if( nStage && parentProto[nthKVN] ) {
					return function( n ) {
						const parentN = this::nToParentN( n );
						const parentKVN = this[parentKey][nthKVN]( parentN );
						if( parentKVN ) {
							return this::nStage( parentKVN );
						}
					}
				}
			},
			getKVN() {
				if( kStage && parentProto[getKVN] ) {
					return function( key ) {
						const parentKey = this::keyToParentKey( key );
						const parentKVN = this[parentKey][getKVN]( parentKey );
						if( parentKVN ) {
							return this::nStage( parentKVN );
						}
					}
				}
			},

			hasKey() {
				if( kStage && parentProto[nth] ) {
					return function( key ) {
						return this::kStage( (c)=>{
							this[parentKey][nth]( c, c.key );
						});
						return true;
					}
				}
			},

			kvIterator() {
				if( parentProto[kvIterator] ) {
					return function() {
						const self = this;
						const parentCollection = this[parentKey];

						const it = parentCollection[kvIterator]();
						return {
							next() {
								const next = it.next();
								if( next.done ) {
									return next;
								}

								const [key, value] = next.value;
								const parentKV = new ReorderedIterator.KV( key, value );
								const kv = self::kStage( parentKV );
								if( ! kv ) {
									return this.next();
								}

								if( false ) {
									TODO(`handle the situation wehn ${kv} is an iterator`);
								}

								return {
									done: false,
									value: [kv.key, kv.value]
								};
							}
						};
					};
				}
			}
		});
	}

	// deriving all the remaining core protocols
	this::deriveCoreProtocols();

	// deriving non-core protocols
	this::deriveProtocols();
}

module.exports = {
	deriveProtocolsForRootType,
	deriveProtocolsForTransformation,
	deriveCoreProtocols,
	deriveProtocols,
};
