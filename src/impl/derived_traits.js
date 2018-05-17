
const {assert, traits, toStr} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;

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

	traits.scontainers.*addTraitFactories( proto, {
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
			if( proto.*whileEach ) {
				return function every( fn ) {
					return ! this.*whileEach( fn );
				};
			}
		},
		some() {
			if( proto.*untilEach ) {
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

	traits.scontainers.*addTraitFactories( proto, {
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
			if( proto.*map ) {
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

module.exports = {deriveProtocols};
