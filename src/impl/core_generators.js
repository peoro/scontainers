
const {deriveProtocolsFromGenerators} = require('./derived_generators.js');
const {assert, traits, options, semantics, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.descriptors;
use traits * from traits.semantics;

Object.prototype.*implCoreGenerators = function( compilerConfiguration ) {
	if( ! options.generation ) {
		return;
	}

	if( this.*InnerCollection ) {
		this::compileProtocolsForTransformation( compilerConfiguration );
	}
	else {
		this::compileProtocolsForRootType( compilerConfiguration );
	}

	// deriving all the remaining protocol generators
	this::deriveCoreProtocolGenerators();

	// deriving non-core protocols from our protocol generators
	this::deriveProtocolsFromGenerators();
}

function compileProtocolsForRootType( compilerConfiguration ) {
	const Collection = this;
	assert( Collection, `compileProtocolsForRootType() must be called on an object` );
	const check = (cond, err)=>{
		assert( cond, `${Collection.name}.compileProtocolsForTransformation(): ${err}` );
	};

	// taking the non-protocol data from `configuration` (e.g.  `nStage` and `stage`)
	let {nthUnchecked, getUnchecked} = compilerConfiguration.*extractKeys( Object.keys({ nthUnchecked:null, getUnchecked:null }) );
	// deriving the missing non-protocol functions we can derive
	{
		use traits * from traits.generators;

		if( nthUnchecked ) {
			check( !getUnchecked, `either supply \`nthUnchecked\` or \`getUnchecked\`` );
			getUnchecked = function( key ) {
				const n = this.*keyToN( key );
				return this::nthUnchecked( n );
			}
		}
	}

	// everything in `compilerConfiguration` should be protocol generator factories: assigning them to `this`
	traits.generators.*implTraits( this, compilerConfiguration );

	// deriving the other core protocol generator factories we can derive from the non-protocol data
	{
		const proto = this.prototype;
		use traits * from traits.generators;

		traits.generators.*addTraitFactories( this, {
			nthKVN() {
				if( nthUnchecked ) {
					return function( n ) {
						/*
						this.body
							// .*statement( this.assert( semantics.id(`Number`).*member(`isInteger`).*call( n ) ) )
							// .*if( semantics.or( n.*lt( 0 ), n.*ge( this.*len() ) ),
							/*
							.*if( n.*lt( this.*len() ),
								// semantics.return()
								this.body = semantics.block()
									.*statement( semantics.lit(this.Type.name) )
							);
							*/

						return new KVN( this.*nToKey( n ), this::nthUnchecked( n ), n );
					}
				}
			},
			getKVN() {
				if( getUnchecked ) {
					if( Collection.*keyToN ) {
						return function( key ) {
							/*
							this.pushStatement(
								semantics.if( this.*hasKey(key).note(),
									semantics.return()
								)
							);
							*/
							return new KVN( key, this::getUnchecked( key ), this.*keyToN( key ) );
						}
					}
					else {
						return function( key ) {
							return new KVN( key, this::getUnchecked( key ) );
						}
					}
				}
			},
		});
	}
}


// implements collection protocols for the type `this` whose parent type is `ParentType`,
// generating functions using `compilerConfiguration`
function compileProtocolsForTransformation( compilerConfiguration ) {
	assert( this, `compileProtocolsForTransformation() must be called on an object` );
	const check = (cond, err)=>{
		assert( cond, `${this.name}.compileProtocolsForTransformation(): ${err}` );
	};

	const Collection = this;

	const ParentType = this.*InnerCollection;
	check( ParentType, `need to specify the ParentType` );

	// taking the non-protocol data from `compilerConfiguration` (e.g.  `nStage` and `stage`)
	/*
	// TODO: once the rest parameter syntax is standard, we should do this:
	let {stage, nStage, kStage, indexToParentIndex, nToParentN, keyToParentKey, ...compConf} = compilerConfiguration;
	compilerConfiguration = compConf;
	*/
	let {stage, nStage, kStage, indexToParentIndex, nToParentN, keyToParentKey} =
		compilerConfiguration.*extractKeys( Object.keys({
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
	traits.generators.*addTraitFactories( this, compilerConfiguration );

	// deriving the other core protocol generator factories we can derive from the non-protocol data
	{
		use traits * from traits.generators;

		traits.generators.*addTraitFactories( Collection, {
			len() {
				if( Collection.*mappingOnly && ParentType.*len ) {
					return function() {
						return this.inner.*len();
					}
				}
			},

			nToKey() {
				if( nToParentN && ParentType.*nToKey ) {
					return function( n ) {
						const parentN = this::nToParentN( n );
						return this.inner.*nToKey( parentN );
					};
				}
			},
			nthKVN() {
				if( nStage && ParentType.*nthKVN ) {
					return function( n ) {
						const parentN = this::nToParentN( n );
						const parentKVN = this.inner.*nthKVN( parentN );
						parentKVN.n = n;
						this.body.*comment(`n for ${Collection.name}: (${parentKVN.n.codegen()})==(${parentN.codegen()})==(${n.codegen()})`);
						return this::nStage( parentKVN );
					};
				}
			},
			getKVN() {
				if( kStage && ParentType.*getKVN ) {
					return function( key ) {
						const parentKey = this::keyToParentKey( key );
						const parentKVN = this.inner.*getKVN( parentKey );
						return this::kStage( parentKVN );
					};
				}
			},
			hasKey() {
				if( kStage && ParentType.*getKVN ) {
					return function( key ) {
						const parentKey = this::keyToParentKey( key );
						const parentKVN = this.inner.*getKVN( parentKey );
						this::kStage( parentKVN );
						return true;
					};
				}
			},
			keyToN() {
				if( keyToParentKey && ParentType.*keyToN ) {
					return function( key ) {
						const parentKey = this::keyToParentKey( key );
						return this.inner.*keyToN( parentKey );
					};
				}
			},
			loop() {
				if( ParentType.*loop ) {
					return function() {
						const kvn = this.inner.*loop();
						return this::kStage( kvn );
					};
				}
			},
		});
	}
}

function deriveCoreProtocolGenerators() {
	assert( this, `deriveCoreProtocolGenerators() must be called on an object` );

	const Type = this;

	use traits * from traits.generators;

	traits.generators.*addTraitFactories( this, {
		getKVN() {
			if( this.*nthKVN && this.*keyToN ) {
				return function( key ) {
					const n = this.*keyToN( key );
					return this.*nthKVN( n );
				}
			}
		},
		hasKey() {
			if( this.*keyToN ) {
				return function( key ) {
					const n = this.*keyToN( key );
					return semantics.and(
						semantics.id(`Number`).*member(`isInteger`).*call( n ),
						n.*ge( 0 ),
						n.*lt( this.*len() )
					);
				}
			}
		},
		set() {
			if( this.*setNth && this.*keyToN ) {
				return function( key, value ) {
					const n = this.*keyToN( key );
					return this.*setNth( n, value );
				}
			}
		},
		loop() {
			if( this.*nthKVN ) {
				return function( generator ) {
					const i = this.createUniqueVariable(`i`);
					const lenVar = this.*len();

					this.body
						.*for(
							semantics.declare( i, 0, `var` ),
							i.*lt( lenVar ),
							i.*increment(),

							this.body = semantics.block()
						);

					return this.*nthKVN( i );
				};
			}
		}
	});
}
