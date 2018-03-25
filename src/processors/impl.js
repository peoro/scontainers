
const assert = require('assert');

const symbols = require('../symbols');

const {get, set, hasKey, has, nth, setNth, nToKey, keyToN, add, len, reverse, clear, kvIterator, kvReorderedIterator} = symbols
const {implementSymbolsFromFactory, extractKeys, assignProtocolFactories} = require('../util.js');
const {propertiesSymbol} = require('./properties');

const {ReorderedIterator} = require('./reordered_iterator.js');

// implements collection protocols for the type `this` whose parent type is `ParentType`,
// using the functions from `src`'s factories
function implementCoreProtocols( src={} ) {
	assert( this, `implementCoreProtocols() must be called on an object` );

	const Type = this;
	const proto = Type.prototype;

	proto::implementSymbolsFromFactory( src );

	proto::implementSymbolsFromFactory({
		get() {
			// must be provided
		},
		set() {
			// must be provided
		},
		hasKey() {
			// must be provided
		},
		has() {
			// must be provided
		},
		nToKey() {
			// must be provided
		},
		nth() {
			if( proto.*get && proto.*nToKey ) {
				return function( n ) {
					return this.*get( this.*nToKey(n) );
				};
			}
		},
		setNth() {
			if( proto.*set && proto.*nToKey ) {
				return function( n, value ) {
					return this.*set( this.*nToKey(n), value );
				};
			}
		},
		add() {
			// must be provided
		},
		len() {
			// must be provided
		},
		reverse() {
			// must be provided
		},
		clear() {
			// must be provided
		},

		nthKVN() {
			if( proto.*nth ) {
				assert( proto.*nToKey );
			}

			if( proto.*nth && proto.*nToKey ) {
				return function( n ) {
					return new KVN(
						this.*nToKey( n ),
						this.*nth( n ),
						n
					);
				}
			}
		},
		getKVN() {
			if( proto.*get && proto.*keyToN ) {
				return function( n ) {
					return new KVN( this.*keyToN( n ), this.*nth( n ), n );
				}
			}
			else if( proto.*get ) {
				assert( ! proto.*nth, `${Type.name} gettable, nthable, but no keyToN` );
				return function( key ) {
					return new KVN( key, this.*get(n) );
				}
			}
		},

		// iterable
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
									value:[coll.*nToKey(n), coll.*nth(n)],
									done:false
								};
							}
							return { done:true };
						}
					};
				};
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

const {values, iterator} = symbols;

function implementDerivedProtocols() {
	assert( this, `implementDerivedProtocols() must be called on an object` );

	const Type = this;
	const proto = Type.prototype;

	// running a quick validity check on `this`
	{
		if( proto.*nth && proto.*nToKey ) {
			assert( proto.*nToKey, `${Type.fullName} misses .\*nToKey()` );
			assert( proto.*len, `${Type.fullName} misses .\*len()` );
			// assert( proto.*get, `${Type.fullName} misses .\*get()` );
		}
		//assert( proto.*kvIterator || proto.*kvReorderedIterator, `${Type.name} is not iterable` );
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

function deriveProtocolsForTransformation( configuration ) {
	assert( this, `deriveProtocolsForTransformation() must be called on an object` );
	const check = (cond, err)=>{
		assert( cond, `${this.name}.compileProtocolsForTransformation(): ${err}` );
	};

	const Type = this;
	const proto = this;
	const ParentType = this[propertiesSymbol].ParentType;
	check( ParentType, `need to specify the ParentType` );
	const parentProto = ParentType.prototype;
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
		const {nthKVN, getKVN, nToKey, keyToN} = symbols;

		symbols::assignProtocolFactories( this.prototype, {
			nToKey() {
				if( nToParentN && parentProto[nToKey] ) {
					return function( n ) {
						const parentN = this::nToParentN( n );
						return this[parentKey][nToKey]( parentN );
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
			nth() {
				if( proto[nthKVN] ) {
					return function( n ) {
						const kvn = this[nthKVN]( n );
						if( kvn ) {
							return kvn.value;
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
			get() {
				if( proto[getKVN] ) {
					return function( key ) {
						const kvn = this[getKVN]( key );
						if( kvn ) {
							return kvn.value;
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
			keyToN() {
				if( keyToParentKey && parentProto[keyToN] ) {
					return function( key ) {
						const parentKey = this::keyToParentKey( key );
						return this[parentKey][keyToN]( parentKey );
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

	this::implementCoreProtocols();
}

module.exports = {
	implementCoreProtocols,
	implementDerivedProtocols,
	deriveProtocolsForTransformation
};
