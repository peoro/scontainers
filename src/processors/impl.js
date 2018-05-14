
const assert = require('assert');

const straits = require('js-protocols');
const symbols = require('../symbols');
const utils = require('../util.js');

use traits * from utils;
use traits * from symbols;


const {extractKeys, assignProtocolFactories, KVN, KVIt, Done} = utils;
const properties = require('./properties');

const {ReorderedIterator} = require('../reordered_iterator.js');

const toStr = utils.toString;


function deriveCoreProtocols() {
	assert( this, `deriveCoreProtocols() must be called on an object` );

	const Collection = this;
	const proto = Collection.prototype;

	symbols::assignProtocolFactories( proto, {
		nth() {
			if( proto.*nthKVN ) {
				return function( n ) {
					const kvn = this.*nthKVN( n );
					if( kvn ) {
						return kvn.value;
					}
				}
			}
		},
		get() {
			if( proto.*getKVN ) {
				return function( key ) {
					const kvn = this.*getKVN( key );
					if( kvn ) {
						return kvn.value;
					}
				}
			}
		},
		set() {
			if( proto.*setNth ) {
				return function( key, value ) {
					const n = this.*keyToN( key );
					this.*setNth( n, value );
				}
			}
		},
		kvIterator() {
			if( proto.*nthKVN ) {
				return function kvIterator() {
					return {
						collection: this,
						i: 0,
						next() {
							const coll = this.collection;
							if( this.i < coll.*len() ) {
								const n = this.i ++;
								const kvn = coll.*nthKVN( n );
								assert( kvn, `${Collection.name}.nth(${n}) not there?! :F` );
								return kvn;
							}
						}
					};
				};
			}
		},
		kvReorderedIterator() {
			if( proto.*kvIterator ) {
				return function kvReorderedIterator() {
					return new ReorderedIterator.FromIterator( this.*kvIterator() );
				};
			}
		},
		iterator() {
			if( proto.*nth || proto.*has ) {
				return function() {
					return this.*values().*iterator();
				};
			}
			if( proto.*kvIterator ) {
				return function iterator( ) {
					return {
						it: this.*kvIterator(),
						next() {
							const next = this.it.next();
							if( ! next ) {
								return new Done();
							}

							const {key, value} = next;
							return new KVIt( key, value );
						}
					};
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
		if( proto.*nth ) {
			assert( proto.*len, `${Collection.name} enumerable, but unknown \`len\`` );
		}
	}

	symbols::assignProtocolFactories( proto, {
		forEach() {
			if( proto.*kvIterator ) {
				return function forEach( fn ) {
					const it = this.*kvIterator();
					let next = it.next();
					while( next ) {
						const {value, key, n} = next;
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
					while( next ) {
						const {value, key, n} = next;
						if( ! fn( value, key, n ) ) {
							return next;
						}
						next = it.next();
					}
				};
			}
			if( proto.*kvReorderedIterator ) {
				return function( fn ) {
					let result;
					{
						const rit = this.*kvReorderedIterator();
						rit.onNext( (kvn)=>{
							if( ! fn(kvn.value, kvn.key, kvn.n) ) {
								result = kvn;
								rit.stop();
							}
						});
						rit.proceed();
					}
					return result;
				};
			}
		},
		untilEach() {
			if( proto.*whileEach ) {
				return function untilEach( fn ) {
					return this.*whileEach( (value, key, n)=>! fn(value, key, n) );
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
					if( ! next ) {
						return;
					}

					let state = next.value;
					next = it.next();
					while( next ) {
						const {value, key, n} = next;
						state = fn( state, value, key, n );
						next = it.next();
					}
					return state;
				};
			}
			if( proto.*reduce ) {
				return function reduceFirst( fn ) {
					let first = true;
					return this.*reduce( (state, value, key, n)=>{
						if( first ) {
							first = false;
							return value;
						}
						return fn( state, value, key, n );
					});
				};
			}
		},

		count() {
			if( proto.*len ) {
				return function count() { return this.*len(); };
			}
			if( proto.*reduce ) {
				return function count() { return this.*reduce( (n)=>n+1, 0 ); };
			}
		},
		isEmpty() {
			if( proto.*len ) {
				return function isEmpty() { return ! this.*len(); };
			}
			if( proto.*whileEach ) {
				return function isEmpty() { return ! this.*whileEach( ()=>false ); };
			}
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
			if( proto.*kvIterator ) {
				return function only() {
					const it = this.*kvIterator();
					let next = it.next();
					assert( next, `${this}.only()'s collection is empty` );
					assert( ! it.next(), `${this}.only()'s collection has multiple items` );
					return next;
				};
			}
			if( proto.*whileEach ) {
				return function only() {
					let count = 0;
					this.*whileEach( ()=>{
						assert( ! count, `${this}.only()'s collection has multiple items` );
						++count;
						return true;
					});
					assert( count === 1, `${this}.only()'s collection is empty` );

					return this.*whileEach( ()=>false );
				};
			}
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
			if( proto.*whileEach ) {
				return function first() {
					return this.*whileEach( ()=>false );
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
			if( this.*whileEach ) {
				return function every( fn ) {
					return ! this.*whileEach( fn );
				};
			}
		},
		some() {
			if( this.*untilEach ) {
				return function some( fn ) {
					return !! this.*untilEach( fn );
				};
			}
		},

		toString() {
			if( proto.*nth ) {
				return function toString() {
					//this.*map( (value)=>value::toStr() ).*collect( Array );
					// this.*iterator();
					// console.log( this.*len(), this.constructor.name );
					// console.log( this.*kvIterator.toString() );

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

	const Values = require('../decorators/values.js');
	const Entries = require('../decorators/entries.js');
	const Filter = require('../decorators/filter.js');
	const Slice = require('../decorators/slice.js');
	const Chunk = require('../decorators/chunk.js');
	const Map = require('../decorators/map.js');
	const MapKey = require('../decorators/map_key.js');
	const Cache = require('../decorators/cache.js');
	const Iter = require('../decorators/iter.js');
	const Reordered = require('../decorators/reordered.js');
	const GroupBy = require('../decorators/group_by.js');
	const Cow = require('../decorators/cow.js');
	const Flatten = require('../decorators/flatten.js');
	const SkipWhile = require('../decorators/skip_while.js');
	const TakeWhile = require('../decorators/take_while.js');

	symbols::assignProtocolFactories( proto, {
		keys() {
			return function keys() {
				return this.*map( function key(value, key){return key;} ).*values();
			};
		},
		values: Collection.*wrapScontainer(Values),
		entries: Collection.*wrapScontainer(Entries),
		enumerate() {
			return function enumerate() {
				TODO();
				let count = 0;
				return this.*map( (value)=>[count++, value] );
			};
		},
		filter: Collection.*wrapScontainer(Filter),
		slice: Collection.*wrapScontainer(Slice),
		chunk: Collection.*wrapScontainer(Chunk),
		map: Collection.*wrapScontainer(Map),
		mapKey: Collection.*wrapScontainer(MapKey),
		cache: Collection.*wrapScontainer(Cache),
		iter: Collection.*wrapScontainer(Iter),
		reordered: Collection.*wrapScontainer(Reordered),
		groupBy: Collection.*wrapScontainer(GroupBy),
		cow: Collection.*wrapScontainer(Cow),
		flatten: Collection.*wrapScontainer(Flatten),
		flattenDeep() {
			if( this.*map ) {
				return function() {
					return this.*map( (value)=>value.*flattenDeep ? value.*flattenDeep() : value ).*flatten();
				};
			}
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
		skipWhile: Collection.*wrapScontainer(SkipWhile),
		takeWhile: Collection.*wrapScontainer(TakeWhile),
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
				const n = this.*keyToN( key );
				return this::nthUnchecked( n );
			}
		}
	}

	// everything in `compilerConfiguration` should be protocol generator factories: assigning them to `this`
	this.prototype.*implScontainer( configuration );

	// deriving the other core protocol generator factories we can derive from the non-protocol data
	{
		const proto = this.prototype;

		symbols::assignProtocolFactories( this.prototype, {
			hasKey() {
				if( nthUnchecked ) {
					return function( key ) {
						const n = this.*keyToN( key );
						return Number.isInteger(n) && n >= 0 && n < this.*len();
					}
				}
			},

			nthKVN() {
				if( nthUnchecked ) {
					return function( n ) {
						return new KVN( this.*nToKey( n ), this::nthUnchecked( n ), n );
					}
				}
			},
			getKVN() {
				if( getUnchecked ) {
					if( proto.*keyToN ) {
						return function( key ) {
							if( this.*hasKey( key ) ) {
								return new KVN( key, this::getUnchecked(key), this.*keyToN(key) );
							}
						};
					}
					else {
						return function( key ) {
							if( this.*hasKey( key ) ) {
								return new KVN( key, this::getUnchecked(key) );
							}
						};
					}
				}
			},

			nth() {
				if( nthUnchecked ) {
					return function( n ) {
						assert( Number.isInteger(n), `${this.constructor.name}.nth(${n}): ${n} not valid` );
						if( n >= 0 && n < this.*len() ) {
							return this::nthUnchecked( n );
						}
					}
				}
			},
			get() {
				if( getUnchecked && proto.*hasKey ) {
					return function( key ) {
						if( ! this.*hasKey( key ) ) {
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
									return new KVN( coll.*nToKey(n), coll::nthUnchecked(n), n );
								}
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

	use traits * from properties;

	const Collection = this;
	const proto = this;
	const ParentCollection = this.*InnerCollection;
	check( ParentCollection, `need to specify the ParentType` );
	const parentProto = ParentCollection.prototype;
	const innerCollectionKey = this.*innerCollectionKey;

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
	symbols::assignProtocolFactories( this.prototype, {
		len() {
			if( Collection.*mappingOnly && parentProto.*len ) {
				return function() {
					return this[innerCollectionKey].*len();
				}
			}
		},

		nToKey() {
			if( nToParentN && parentProto.*nToKey ) {
				return function( n ) {
					const parentN = this::nToParentN( n );
					return this[innerCollectionKey].*nToKey( parentN );
				}
			}
		},
		keyToN() {
			if( keyToParentKey && parentProto.*keyToN ) {
				return function( key ) {
					const innerKey = this::keyToParentKey( key );
					return this[innerCollectionKey].*keyToN( innerKey );
				}
			}
		},

		nthKVN() {
			if( nStage && parentProto.*nthKVN ) {
				return function( n ) {
					const parentN = this::nToParentN( n );
					const parentKVN = this[innerCollectionKey].*nthKVN( parentN );
					if( parentKVN ) {
						return this::nStage( parentKVN );
					}
				}
			}
		},
		getKVN() {
			if( kStage && parentProto.*getKVN ) {
				return function( key ) {
					const innerKey = this::keyToParentKey( key );
					const parentKVN = this[innerCollectionKey].*getKVN( innerKey );
					if( parentKVN ) {
						return this::kStage( parentKVN );
					}
				}
			}
		},

		hasKey() {
			if( kStage && parentProto.*nth ) {
				return function( key ) {
					return this::kStage( (c)=>{
						this[innerCollectionKey].*nth( c, c.key );
					});
					return true;
				}
			}
			if( Collection.*mappingOnly && parentProto.*hasKey ) {
				return function( key ) {
					return this[innerCollectionKey].*hasKey( keyToParentKey(key) );
				}
			}
		},
	});

	// deriving all the remaining core protocols
	this::deriveCoreProtocols();

	// if there are no iterators, we can derived them starting from the parent collection...
	// TODO NOTE FIXME: BROKEN
	// 1. we have no way to say when to start and when to stop for `Slice`
	// get rid of the above `this::deriveCoreProtocols()` to see whether it's fixed
	symbols::assignProtocolFactories( this.prototype, {
		kvIterator() {
			if( Collection.*transformStream && parentProto.*kvIterator && kStage ) {
				return function() {
					const self = this;
					const parentCollection = this[innerCollectionKey];

					const it = parentCollection.*kvIterator();
					return {
						next() {
							const next = it.next();
							if( ! next ) {
								return;
							}

							const kvn = self::kStage( next );
							if( ! kvn ) {
								return this.next();
							}

							if( false ) {
								TODO(`handle the situation wehn ${kvn} is an iterator`);
							}

							return new KVN( kvn.key, kvn.value, kvn.n );
						}
					};
				};
			}
		},
		kvReorderedIterator() {
			if( parentProto.*kvReorderedIterator && kStage ) {
				return function() {
					const innerRIt = this[innerCollectionKey].*kvReorderedIterator();
					return new ReorderedIterator.MapReorderedIterator( innerRIt, this::kStage )
				};
			}
		},
	});

	// deriving all the core protocols again, in case something depends on the newly added iterators...
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
