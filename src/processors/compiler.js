
const assert = require('assert');

const straits = require('js-protocols');
const es5 = require('esast/dist/es5.js');
const semantics = es5.semantics;

const symbols = require('../symbols');
const generatorSymbols = require('../generator_symbols');
const properties = require('./properties');
const {extractKeys, assignProtocolFactories, KVN} = require('../util.js');

use traits * from straits.utils;
use traits * from require('esast/dist/semantics.js');
use traits * from properties;


function defaultGet( key, defaultConstructor ) {
	if( this.has(key) ) {
		return this.get( key );
	} else {
		const value = defaultConstructor( key );
		this.set( key, value );
		return value;
	}
}

class CompilationFrame {
	constructor( compiler, Type,  ) {
		const frame = this;

		this.compiler = compiler;
		this.Type = Type;

		// inner: the CompilationFrame for our InnerType
		const InnerType = Type.*InnerCollection;
		if( InnerType ) {
			this.inner = new CompilationFrame( compiler, InnerType, this.typeArgMapFn );
		}

		// self: Expression representing the instance of `Type` we're working on
		Object.defineProperties( this, {
			self: {
				get(){
					return frame.typeArgMapFn( compiler.getSelf(Type) );
				}
			}
		});

		// args
		this.args = {}
		Type.*argKeys.forEach( argKey=>{
			Object.defineProperty( this.args, argKey, {
				get(){
					return frame.typeArgMapFn( compiler.getArg(Type, argKey) );
				}
			});
		});

		// .* generatorSymbols
		for( let symName in generatorSymbols ) {
			const genSym = generatorSymbols[symName];
			const sym = symbols[symName];

			const compilationFrame = this;
			this.*[sym] = this.*[genSym] = function( ...args ) {
				const Type = this.Type;
				if( Type.*[genSym] ) {
					return this::Type.*[genSym]( ...args );
				}

				const symVar = this.compiler.registerConstant( sym, `${symName}Sym` );
				//return compiler.getSelf( Type ).*member( symVar, true ).*call( ...args );
				return compilationFrame.self.*member( symVar, true ).*call( ...args );
			}
		}
	}

	get typeArgMapFn() { return this.compiler.typeArgMapFn; }
	set typeArgMapFn( val ) { return this.compiler.typeArgMapFn = val; }
	get ast() { return this.compiler.ast; }
	get mainFunction() { return this.compiler.mainFunction; }
	get body() { return this.compiler.body; }
	set body( val ) { return this.compiler.body = val; }
	createVariable( ...args ) { return this.compiler.createVariable( ...args ); }
	createUniqueVariable( ...args ) { return this.compiler.createUniqueVariable( ...args ); }
	registerConstant( ...args ) { return this.compiler.registerConstant( ...args ); }
	registerConstants( ...args ) { return this.compiler.registerConstants( ...args ); }
	registerParameter( ...args ) { return this.compiler.registerParameter( ...args ); }
	registerParameters( ...args ) { return this.compiler.registerParameters( ...args ); }
	assert( ...args ) { return this.compiler.assert( ...args ); }
	debug( ...args ) { return this.compiler.debug( ...args ); }
	log( ...args ) { return this.compiler.log( ...args ); }
}


class NewCompiler extends es5.Compiler {
	constructor( Type, functionName, params=[] ) {
		super();

		this.Type = Type;
		this.typeArgMapFn = arg=>arg.variable;

		// type arguments
		this.typeArguments = new Map();

		// AST manipulation
		this.frame = new CompilationFrame( this, this.Type );

		this.body = semantics.block();
		this.mainFunction = semantics.function(
			`${Type.name.replace(/\W+/g, '_')}_${functionName}`,
			params,
			this.body
		);
		this.ast.*return( this.mainFunction );
	}

	registerParameter( name ) {
		const variable = this.createUniqueVariable( name );
		this.mainFunction.params.push( variable );
		return variable;
	}

	// type arguments
	// return an expression for `memberExpr` as member of `TragetType`
	// e.g.: in the hierarchy `Array::Map::Filter`...
	//  makeVarRelative( Array::Map::Filter, 'filterFn' ) = AST::parse( `this.filterFn` )
	//  makeVarRelative( Array::Map, 'mapFn' ) = AST::parse( `this.wrapped.mapFn` )
	//  makeVarRelative( Array ) = AST::parse( `this.wrapped.wrapped` )
	makeVarRelative( TargetType, memberExpr ) {
		let Type = this.Type;
		let expr = semantics.this();

		while( Type !== TargetType ) {
			const parentKey = Type.*innerCollectionKey;

			Type = Type.*InnerCollection;
			expr = expr.*member( parentKey );
		}

		if( memberExpr ) {
			return expr.*member( memberExpr );
		}
		return expr;
	}

	// returns the member arguments for `Type`
	// e.g. getTipeArguments( Array::Map ) === 'mapFn' - check the object property `.*argKeys`
	getTypeArguments( Type ) {
		return this.typeArguments::defaultGet( Type, ()=>new Map() );
	}
	// get a member variable for `Type`. very similar to `makeVarRelative`, but returns an object...
	// e.g. for `Array::Map::Filter`:
	//   getArg( Array::Map, 'mapFn' ) {
	//     name: `mapFn`,
	//     variable: AST::parse( 'this.wrapped.mapFn' ), // same as `makeVarRelative(Array::Map, 'mapFn')`
	//     fn: this.wrapped.mapFn
	getArg( Type, argKey ) {
		const typeArgs = this.getTypeArguments( Type );

		const arg = typeArgs::defaultGet( argKey, ()=>({
			name: argKey,
			variable: this.makeVarRelative( Type, semantics.id(argKey) ),
			fn() { return this[argKey]; }
		}) );

		return arg
	}
	// like `getArg`, but operating on an array of args
	getArgs( Type, ...argKeys ) {
		return argKeys.map( argKey=>this.getArg(Type, argKey) );
	}
	// like `getArg`, but returning the parent for `Type`
	getParent( Type, parentKey ) {
		const ParentType = Type.*InnerCollection;
		const parent = this.getSelf( ParentType );

		const typeArgs = this.getTypeArguments( Type );
		typeArgs.parent = {
			name: parentKey,
			variable: parent.variable,
			fn() { return this[parentKey]; }
		};

		return parent;
	}
	// like `getArg`, but returning the instance of type `Type`
	getSelf( Type, parentKey ) {
		const typeArgs = this.getTypeArguments( Type );

		const varName = `self${Type.name.replace(/:/g, '')}`;

		const arg = typeArgs::defaultGet( '', ()=>({
			name: varName,
			variable: this.makeVarRelative( Type ),
			fn() { return this; }
		}) );

		return arg;
	}

	// returns an array with all the type arguments that were used:
	// all the stuff that was returned by `getArg`, `getArgs`, `getParent`, `getSelf`
	getTypeArgumentArray( ) {
		const getTypeArgRec = (Type)=>{
			if( ! Type ) { return []; }

			return [].concat(
				getTypeArgRec( Type.*InnerCollection ),
				Array.from( this.getTypeArguments(Type).values() ),
			);
		};

		return getTypeArgRec( this.Type );
	}
	// returns an array with the values of `instance` for every type argument that was used:
	// the value for all the stuff that was returned by `getArg`, `getArgs`, `getParent`, `getSelf`
	getTypeArgumentArrayValues( instance ) {
		const getTypeArgRec = (Type, instance)=>{
			if( ! Type ) { return []; }
			assert( instance instanceof Type, `${instance} is not a ${Type.name}` );

			const typeArgs = this.getTypeArguments(Type);

			// const parent = typeArgs.parent;
			const parentKey = Type.*innerCollectionKey;
			if( ! parentKey ) {
				return Array.from( typeArgs.values() ).map( arg=>instance::arg.fn() );
			}

			//const parentInstance = instance::parent.fn();
			const parentInstance = instance[parentKey];

			return [].concat(
				getTypeArgRec( Type.*InnerCollection, parentInstance ),
				Array.from( typeArgs.values() ).map( arg=>instance::arg.fn() ),
			);
		};

		return getTypeArgRec( this.Type, instance );
	}

	// compilation
	compile() {
		if( false ) {
			const constantNames = Array.from( this.constants.values() ).map( variable=>variable.name );
			console.log(`>>>>>>>>>>>>>>>>>>>>> ${this.mainFunction.id.name}(${constantNames}):`);
			// console.log( fnFactory.toString() );
			console.group();
			console.log( this.ast.codegen() );
			console.groupEnd();
			console.log(`<<<<<<<<<<<<<<<<<<<<<`);
		}

		const fnFactory = super.compile();

		return fnFactory();
	}

	// semantics
	assert( expr ) {
		const assertVar = this.registerConstant( assert, `assert` );
		return assertVar.*call( expr );
	}
	debug() {
		return this.log( semantics.lit(this.mainFunction.id.name), semantics.id(`arguments`) );
	}
	log( ...args ) {
		return semantics.id(`console`).*member(`log`).*call( ...args );
	}
}




function deriveCoreProtocolGenerators() {
	assert( this, `deriveCoreProtocolGenerators() must be called on an object` );

	const Type = this;

	use traits * from generatorSymbols;

	generatorSymbols::assignProtocolFactories( this, {
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

function deriveProtocolsFromGenerators() {
	assert( this, `deriveProtocolsFromGenerators() must be called on an object` );

	const Type = this;

	// implementing core protocols from generators
	{
		use traits * from generatorSymbols;

		const proto = this.prototype;

		function deriveProtocols( protoObj ) {
			const factories = {};

			for( let key in protoObj ) {
				const factory = protoObj[key]();
				if( ! factory ) {
					continue;
				}

				factories[key] = {
					factory() {
						const compiler = new NewCompiler( Type, key );

						// compiler.body.*statement( compiler.debug() );

						const result = compiler.frame::factory();

						if( result ) {
							compiler.body.*return( result );
						}
						return compiler.compile();
					}
				};
			}

			return symbols::assignProtocolFactories( proto, factories )
		}

		// deriving core protocols from protocol generators
		deriveProtocols({
			nthKVN() {
				if( Type.*nthKVN ) {
					return function() {
						const KVNVar = this.registerConstant( KVN, `KVN` );
						const n = this.registerParameter(`n`);
						const kvn = this.*nthKVN( n );
						return KVNVar.*new( kvn.key, kvn.value, kvn.n );
					}
				}
			},
			getKVN() {
				if( Type.*getKVN ) {
					return function() {
						const KVNVar = this.registerConstant( KVN, `KVN` );
						const n = this.registerParameter(`n`);
						const kvn = this.*getKVN( n );
						return KVNVar.*new( kvn.key, kvn.value, kvn.n );
					}
				}
			},
			nth() {
				if( Type.*nthKVN ) {
					return function() {
						const n = this.registerParameter(`n`);

						this.body
							.*statement( this.assert( semantics.id(`Number`).*member(`isInteger`).*call( n ) ) )
							.*if( semantics.or( n.*lt( this.*len() ) ),
								semantics.return( this.*nthKVN(n).value )
							);
					}
				}
			},
			get() {
				if( Type.*getKVN && Type.*hasKey ) {
					return function() {
						const key = this.registerParameter(`key`);

						this.body.*comment( `${Type.name} GET KVN` );

						const kvn = this.*getKVN( key );

						/*
						this.body
							.*comment( semantics.lit(`HAS KEY`) )
							.*if( this.*hasKey(key),
								this.body = semantics.block()
							)
						*/

						this.body.*return( kvn.value )
					}
				}
			},
			len() {
				if( Type.*len ) {
					return function() {
						return this.*len();
					}
				}
			},
			kvIterator() {
				if( Type.*nthKVN ) {
					return function() {
						const fns = this.registerConstants({KVN});
						const Iterator = this.createUniqueVariable( `Iterator` );
						const thisI = semantics.this().*member( this.createUniqueVariable(`i`) );
						const thisLen = semantics.this().*member( this.createUniqueVariable(`len`) );
						const key = this.createUniqueVariable( `key` );
						const value = this.createUniqueVariable( `value` );

						let typeArgMapFn = this.typeArgMapFn;
						let body = this.body;
						const reset = ()=>{
							this.typeArgMapFn = typeArgMapFn;
							this.body = body;
						};

						{
							// will map all the type variables that are used to the variable member of `this`
							// `this.wrapped.mapFn` becomes:
							//  key:{name:mapFn, variable:this.wrapped.mapFn, fn:...}, value:this.mapFn
							const argVarMap = new Map();

							function rebase( variable ) {
								const rebaseRec = (variable)=>{
									if( variable.type === 'ThisExpression' ) {
										return this;
									}
									return rebaseRec( variable.object )
										.*member( variable.property, variable.computed );
								}
								return rebaseRec( variable );
							}

							// computing `Iterator.prototype.next` first
							{
								this.typeArgMapFn = function( arg ) {
									return argVarMap::defaultGet( arg, ()=>semantics.this().*member( this.createUniqueVariable(arg.name) ) );
								};

								// as that's the one doing the actual computations
								// after it's compiled, we'll know which type arguments are needed
								this.ast.body.unshift(
									semantics.statement(
										Iterator.*member('prototype').*member('next').*assign(
											semantics.function(null, [], semantics.block()
												.*if( thisI.*lt(thisLen),
													this.body = semantics.block()
												)
											)
										)
									)
								);

								const kvn = this.*nthKVN( thisI );

								this.body .*return( fns.KVN.*new(kvn.key, kvn.value, thisI.*increment(false)) )

								reset();
							}

							// defining `Iterator`
							{
								const collection = this.createUniqueVariable(`collection`);
								this.typeArgMapFn = function( arg ) {
									return collection::rebase( arg.variable );
								};

								this.ast.body.unshift(
									semantics.declareFunction( Iterator, [collection],
										this.body = semantics.block()
											.*statement( thisI.*assign(0) )
									)
								);

								// assigning `thisLen`
								this.body.*statement( thisLen.*assign(this.*len()) );

								// assignign all the other arg vars
								argVarMap.forEach( (thisVar, collectionVar)=>{
									this.body.*statement(
										thisVar.*assign( collection::rebase(collectionVar.variable) )
									);
								});

								reset();
							}

							/*
							this.ast
								IteratorConstructor,
								Iterator.member('prototype').member('next').assign( nextFunction )
							);
							*/
						}

						// the main function only instantiates a new `Iterator`
						this.body
							.*return( Iterator.*new( semantics.this() ) );
					};
				}
			},
		})

		// deriving derived protocols
		deriveProtocols({
			forEach() {
				if( Type.*loop ) {
					return function() {
						const forEachFn = this.registerParameter(`forEachFn`);

						const kvn = this.*loop();

						this.body.*statement(
							forEachFn.*call( kvn.value, kvn.key, kvn.n )
						);
					}
				}
			},
			reduce() {
				if( Type.*loop ) {
					return function() {
						const reduceFn = this.registerParameter(`reduceFn`);
						const initialValue = this.registerParameter(`initialValue`);

						const state = this.createUniqueVariable(`state`);

						const outsideLoop = this.body;
						this.body.*declare( state, initialValue, `var` );
						const kvn = this.*loop();
						this.body.*statement( state.*assign( reduceFn.*call(state, kvn.value, kvn.key, kvn.n) ) );

						this.body = outsideLoop;
						this.body.*return( state );
					}
				}
			},
		});
	}

}






function compileProtocolsForRootType( compilerConfiguration ) {
	const Collection = this;
	assert( Collection, `compileProtocolsForRootType() must be called on an object` );
	const check = (cond, err)=>{
		assert( cond, `${Collection.name}.compileProtocolsForTransformation(): ${err}` );
	};

	// taking the non-protocol data from `configuration` (e.g.  `nStage` and `stage`)
	let {nthUnchecked, getUnchecked} = compilerConfiguration::extractKeys( Object.keys({ nthUnchecked:null, getUnchecked:null }) );
	// deriving the missing non-protocol functions we can derive
	{
		use traits * from generatorSymbols;

		if( nthUnchecked ) {
			check( !getUnchecked, `either supply \`nthUnchecked\` or \`getUnchecked\`` );
			getUnchecked = function( key ) {
				const n = this.*keyToN( key );
				return this::nthUnchecked( n );
			}
		}
	}

	// everything in `compilerConfiguration` should be protocol generator factories: assigning them to `this`
	generatorSymbols.*implTraits( this, compilerConfiguration );

	// deriving the other core protocol generator factories we can derive from the non-protocol data
	{
		const proto = this.prototype;
		use traits * from generatorSymbols;

		generatorSymbols::assignProtocolFactories( this, {
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
					if( this.*keyToN ) {
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

	// deriving all the remaining protocol generators
	this::deriveCoreProtocolGenerators();

	// deriving non-core protocols from our protocol generators
	this::deriveProtocolsFromGenerators();
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
		compilerConfiguration::extractKeys( Object.keys({
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
	generatorSymbols::assignProtocolFactories( this, compilerConfiguration );

	// deriving the other core protocol generator factories we can derive from the non-protocol data
	{
		use traits * from generatorSymbols;

		generatorSymbols::assignProtocolFactories( Collection, {
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
						return this::nStage( parentKVN );
					};
				}
			},
			getKVN() {
				if( kStage && ParentType.*getKVN ) {
					return function( key ) {
						this.skip = semantics.return; // TODO: temporary - remove this line ASAP!
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

	// deriving all the remaining protocol generators
	this::deriveCoreProtocolGenerators();

	// deriving non-core protocols from our protocol generators
	this::deriveProtocolsFromGenerators();
}




module.exports = {
	compileProtocolsForTransformation,
	compileProtocolsForRootType
};





if( require.main === module ) {
	const compiler = new NewCompiler( Type, key, function(){
		// this.pushStatement( this.compiler.debug() );
		const result = this::factory();
		if( result ) {
			this.pushStatement( result.return() );
		}
	});
	console.log( compiler.compile() );
}
