
const {deriveProtocols} = require('./derived_traits.js');
const {assert, traits, ReorderedIterator, KVN, KVIt, Done} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.descriptors;
use traits * from traits.scontainers;

Object.prototype.*implCoreTraits = function( compilerConfiguration ) {
	if( this.*InnerCollection ) {
		this::deriveProtocolsForTransformation( compilerConfiguration );
	}
	else {
		this::deriveProtocolsForRootType( compilerConfiguration );
	}

	// deriving all the core protocols again, in case something depends on the newly added iterators...
	this::deriveCoreProtocols();

	// deriving non-core protocols
	this::deriveProtocols();
}

function deriveProtocolsForRootType( configuration={} ) {
	assert( this, `deriveProtocolsForRootType() must be called on an object` );
	const check = (cond, err)=>{
		assert( cond, `${this.name}.compileProtocolsForTransformation(): ${err}` );
	};

	// taking the non-protocol data from `configuration` (e.g.  `nStage` and `stage`)
	let {nthUnchecked, getUnchecked} = configuration.*extractKeys( Object.keys({ nthUnchecked:null, getUnchecked:null }) );
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

		traits.scontainers.*addTraitFactories( this.prototype, {
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
}

function deriveProtocolsForTransformation( configuration={} ) {
	assert( this, `deriveProtocolsForTransformation() must be called on an object` );
	const check = (cond, err)=>{
		assert( cond, `${this.name}.compileProtocolsForTransformation(): ${err}` );
	};

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
		configuration.*extractKeys( Object.keys({
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
	traits.scontainers.*addTraitFactories( this.prototype, configuration );

	// deriving the other core protocol factories we can derive from the non-protocol data
	traits.scontainers.*addTraitFactories( this.prototype, {
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
	traits.scontainers.*addTraitFactories( this.prototype, {
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
}

function deriveCoreProtocols() {
	assert( this, `deriveCoreProtocols() must be called on an object` );

	const Collection = this;
	const proto = Collection.prototype;

	traits.scontainers.*addTraitFactories( proto, {
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
