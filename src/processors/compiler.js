
const assert = require('assert');

const symbols = require('../symbols');
const generatorSymbols = require('../generator_symbols');

const compilerSymbol = Symbol('compiler');
const properties = require('./properties');
const {grammar, builders, semantics, codegen, FunctionCompiler} = require('../compiler/index.js');
const {extractKeys, assignProtocols, assignProtocolFactories, KVN} = require('../util.js');

const {InnerCollection, innerCollectionKey, argKeys, mappingOnly} = properties.symbols;


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
	constructor( compiler, Type, typeArgMapFn, body, parameters, outer, methods ) {
		this.compiler = compiler;

		this.Type = Type;
		if( outer ) {
			this.outer = outer;
			this.root = outer.root;
		}
		else {
			this.root = this;
			this.frameMap = new Map();
		}
		this.root.frameMap.set( Type, this );

		this.typeArgMapFn = typeArgMapFn;
		this.parameters = parameters;
		this.body = body;

		this.methods = methods;
		Object.assign( this, methods );

		// this.self = typeArgMapFn( compiler.getSelf(Type) );
		Object.defineProperties( this, {
			self: {
				get(){
					return typeArgMapFn( compiler.getSelf(Type) );
				}
			}
		});


		this.args = {}
		Type.*argKeys.forEach( argKey=>{
			// this.args[argKey] = typeArgMapFn( compiler.getArg(Type, argKey) );
			Object.defineProperty( this.args, argKey, {
				get(){
					return typeArgMapFn( compiler.getArg(Type, argKey) );
				}
			});
		});

		this.protocols = {};
		for( let symName in generatorSymbols ) {
			const genSym = generatorSymbols[symName];
			const sym = symbols[symName];

			const compilationFrame = this;
			this.protocols[symName] = function( ...args ) {
				const Type = compilationFrame.Type;
				if( Type[genSym] ) {
					return compilationFrame::Type[genSym]( ...args );
				}

				const symVar = compiler.registerConstant( sym, `${symName}Sym` );
				return compiler.getSelf( Type ).member( symVar, true ).call( ...args );
			}
		}

		const InnerType = Type.*InnerCollection;
		if( InnerType ) {
			this.inner = new CompilationFrame( compiler, InnerType, typeArgMapFn, body, parameters, this, methods ).protocols;
		}
	}

	// VarDB management
	createUniqueVariable( name ) {
		return this.compiler.createUniqueVariable( name );
	}
	registerParameter( name ) {
		const variable = this.createUniqueVariable( name );
		this.parameters.push( variable );
		return variable;
	}
	registerConstant( ...args ) {
		return this.compiler.registerConstant( ...args );
	}
	registerConstants( ...args ) {
		return this.compiler.registerConstants( ...args );
	}

	// AST manipulation
	pushStatement( ...statements ) {
		statements.forEach( statement=>{
			if( Array.isArray(statement) ) {
				return this.pushStatements( ...statement );
			}

			this.body.push( statement );
		});
	}

	// subclassing
	subclass( typeArgMapFn, body, parameters, methods ) {
		// return new CompilationFrame( this.compiler, this.Type, typeArgMapFn, body, parameters );
		const frameChain = new CompilationFrame( this.compiler, this.root.Type, typeArgMapFn, body, parameters, null, methods );
		const frame = frameChain.frameMap.get( this.Type );
		return frame;
	}

	mapArgs( typeArgMapFn ) {
		return this.subclass( typeArgMapFn, this.body, this.parameters, this.methods );
	}

	subFrame( newMethods, bodyFn, parameters=this.parameters ) {
		if( ! bodyFn ) {
			bodyFn = newMethods;
			newMethods = {};
		}
		const methods = Object.assign( {}, this.methods, newMethods );

		const frame = this.subclass( this.typeArgMapFn, [], parameters, methods );
		frame::bodyFn();
		return frame;
	}

	subFunction( id, params, methods, bodyFn ) {
		const frame = this.subFrame( methods, bodyFn, params );
		return semantics.function( id, frame.parameters, semantics.block(...frame.body) );
	}
	block( methods, bodyFn ) {
		const frame = this.subFrame( methods, bodyFn, [] );
		return semantics.block( ...frame.body );
	}

	call( bodyFn ) {
		this::bodyFn();
	}
}


class NewCompiler {
	constructor( Type, functionName, bodyFn ) {
		this.Type = Type;
		this.functionName = `${Type.name.replace(/:+/g, '_')}_${functionName}`;

		// VarDB management
		this.varDB = new semantics.VarDB();
		this.constantMap = new Map();

		// type arguments
		this.typeArguments = new Map();

		// AST manipulation
		this.rootFrame = new CompilationFrame( this, this.Type, arg=>arg.variable, [] );
		// this.mainFrame = new CompilationFrame( this, this.Type, arg=>arg.variable, [], [] );

		const compiler = this;
		this.mainFunction = this.rootFrame.subFunction( semantics.id(this.functionName), [], function(){
			compiler.mainFrame = this;
			this::bodyFn();
		});
	}

	// VarDB management
	createUniqueVariable( name ) {
		return this.varDB.createUniqueVariable( name );
	}
	// constants
	registerConstant( value, name ) {
		if( this.constantMap.has(value) ) {
			return this.constantMap.get( value );
		}

		const variable = this.createUniqueVariable( name );
		this.constantMap.set( value, variable );
		return variable;
	}
	registerConstants( args ) {
		const result = {};
		for( let key in args ) {
			result[key] = this.registerConstant( args[key], key );
		}
		return result;
	}

	// type arguments
	makeVarRelative( TargetType, memberExpr ) {
		let Type = this.Type;
		let expr = semantics.this();

		while( Type !== TargetType ) {
			const parentKey = Type.*innerCollectionKey;

			Type = Type.*InnerCollection;
			expr = expr.member( parentKey );
		}

		if( memberExpr ) {
			return expr.member( memberExpr );
		}
		return expr;
	}

	getTypeArguments( Type ) {
		return this.typeArguments::defaultGet( Type, ()=>new Map() );
	}
	getArg( Type, argKey ) {
		const typeArgs = this.getTypeArguments( Type );

		const arg = typeArgs::defaultGet( argKey, ()=>({
			name: argKey,
			variable: this.makeVarRelative( Type, semantics.id(argKey) ),
			fn() { return this[argKey]; }
		}) );

		return arg
	}
	getArgs( Type, ...argKeys ) {
		return argKeys.map( argKey=>this.getArg(Type, argKey) );
	}
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
	toFunction() {
		const constantIdentifiers = Array.from( this.constantMap.values() ).map( variable=>variable::semantics.ast().name );
		const constantValues = Array.from( this.constantMap.keys() );

		const mainFrame = this.mainFrame;
		const mainFunction = this.mainFunction::semantics.ast();

		const program = new semantics.Program(
			...this.rootFrame.body,
			semantics.return(
				semantics.function(
					mainFunction.id,
					[].concat(
						mainFrame.parameters,
					),
					semantics.block( ...mainFrame.body )
				)
			)
		)::semantics.ast();

		grammar.Program.check( program );

		const code = codegen( program );
		if( false ) {
			console.log(`>>>>>>>>>>>>>>>>>>>>> ${this.functionName}(${constantIdentifiers}):`);
			console.log( code );
			console.log(`<<<<<<<<<<<<<<<<<<<<<`);
		}

		const fFactory = new Function(
			...constantIdentifiers,
			code
		);
		const f = fFactory.apply( null, constantValues );
		return f;
	}

	// semantics
	assert( expr ) {
		const assertVar = this.registerConstant( assert, `assert` );
		return assertVar.call( expr );
	}
	debug() {
		return semantics.id(`console`).member(`log`).call( semantics.lit(this.functionName), semantics.id(`arguments`) );
	}
}




function deriveCoreProtocolGenerators() {
	assert( this, `deriveCoreProtocolGenerators() must be called on an object` );

	const Type = this;

	const {nthKVN, len, keyToN, nToKey, setNth, nToParentN} = generatorSymbols;

	generatorSymbols::assignProtocolFactories( this, {
		getKVN() {
			if( this[nthKVN] && this[keyToN] ) {
				return function( key ) {
					const n = this.protocols.keyToN( key );
					// return new KVN( key, this.protocols.nth(n), n );
					return this.protocols.nthKVN( n );
				}
			}
		},
		hasKey() {
			if( this[keyToN] ) {
				return function( key ) {
					const n = this.protocols.keyToN( key );
					return semantics.and(
						semantics.id(`Number`).member(`isInteger`).call( n ),
						n.ge( 0 ),
						n.lt( this.protocols.len() )
					);
				}
			}
		},
		set() {
			if( this[setNth] && this[keyToN] ) {
				return function( key, value ) {
					const n = this.protocols.keyToN( key );
					return this.protocols.setNth( n, value );
				}
			}
		},
		loop() {
			if( this[nthKVN] ) {
				return function( generator ) {
					this.skip = function() {
						return semantics.continue();
					};

					const i = this.createUniqueVariable(`i`);
					const lenVar = this.protocols.len();

					return [
						semantics.for(
							i.declare( 0 ),
							i.lt( lenVar ),
							i.increment(),

							this.block( { skip:semantics.continue }, function(){
								this.pushStatement(
									...this::generator( this.protocols.nthKVN(i) )
								);
							})
						)
					];
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
		const {getKVN, hasKey, nthKVN, len, loop} = generatorSymbols;

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
						const sym = generatorSymbols[key];
						const compiler = new NewCompiler( Type, key, function(){
							// this.pushStatement( this.compiler.debug() );
							const result = this::factory();
							if( result ) {
								this.pushStatement( result.return() );
							}
						});
						return compiler.toFunction();
					}
				};
			}

			return symbols::assignProtocolFactories( proto, factories )
		}

		// deriving core protocols from protocol generators
		deriveProtocols({
			nthKVN() {
				if( Type[nthKVN] ) {
					return function() {
						const KVNVar = this.registerConstant( KVN, `KVN` );
						const n = this.registerParameter(`n`);
						const kvn = this.protocols.nthKVN( n );
						return KVNVar.new( kvn.key, kvn.value, kvn.n );
					}
				}
			},
			getKVN() {
				if( Type[getKVN] ) {
					return function() {
						const KVNVar = this.registerConstant( KVN, `KVN` );
						const n = this.registerParameter(`n`);
						const kvn = this.protocols.getKVN( n );
						return KVNVar.new( kvn.key, kvn.value, kvn.n );
					}
				}
			},
			nth() {
				if( Type[nthKVN] ) {
					return function() {
						const n = this.registerParameter(`n`);
						this.pushStatement(
							this.compiler.assert( semantics.id(`Number`).member(`isInteger`).call( n ) ),
							semantics.if(
								semantics.or( n.lt( 0 ), n.ge( this.protocols.len() ) ),
								semantics.return()
							),
							semantics.return( this.protocols.nthKVN(n).value ),
						);
					}
				}
			},
			get() {
				if( Type[getKVN] && Type[hasKey] ) {
					return function() {
						const key = this.registerParameter(`key`);
						this.pushStatement(
							semantics.if( this.protocols.hasKey(key),
								semantics.return( this.protocols.getKVN(key).value )
							),
						);
					}
				}
			},
			len() {
				if( Type[len] ) {
					return function() {
						return this.protocols.len();
					}
				}
			},
			kvIterator() {
				if( Type[nthKVN] ) {
					return function() {
						const fns = this.registerConstants({KVN});
						const Iterator = this.createUniqueVariable( `Iterator` );
						const i = semantics.this().member( this.createUniqueVariable(`i`) );
						const lenVar = semantics.this().member( this.createUniqueVariable(`len`) );
						const key = this.createUniqueVariable( `key` );
						const value = this.createUniqueVariable( `value` );

						this.compiler.rootFrame.call( function() {
							const argVarMap = new Map();

							// computing `Iterator.prototype.next` first
							// as that's the one doing the actual computations
							// after it's compiled, we'll know which type arguments are needed
							const nextFunction = this.subFunction( null, [], function(){
								const frameWithMemberArgs = this.mapArgs( arg=>{
									return argVarMap::defaultGet( arg, ()=>semantics.this().member( this.createUniqueVariable(arg.name) ) );
								});

								const kvn = frameWithMemberArgs.protocols.nthKVN( i );

								this.pushStatement(
									semantics.if(
										i.ge( lenVar ),
										semantics.return()
									),
									fns.KVN.new( kvn.key, kvn.value, i.increment() ).return()
								);
							});

							// computing `Iterator`
							const args = this.compiler.getTypeArgumentArray();
							// const params = args.map( arg=>arg.variable ); // need to wait longer...
							const IteratorConstructor = this.subFunction( Iterator, [], function(){
								const collection = this.registerParameter(`collection`);
								function rebase( variable ) {
									function rebaseRec( variable ) {
										if( variable.type === 'ThisExpression' ) {
											return collection;
										}
										return rebaseRec( variable.object ).member( variable.property, variable.computed );
									}
									return rebaseRec( variable.ast );
								}
								const frameWithCollectionArgs = this.mapArgs( arg=>rebase(arg.variable) );

								this.pushStatement(
									i.assign( 0 ),
									lenVar.assign( frameWithCollectionArgs.protocols.len() ),
									...args.map( arg=>argVarMap.get(arg).assign( rebase(arg.variable) ) ),
								);
							});

							this.pushStatement(
								IteratorConstructor,
								Iterator.member('prototype').member('next').assign( nextFunction )
							);
						});

						// the main function only instantiates a new `Iterator`
						this.pushStatement(
							Iterator.new( semantics.this() ).return()
						);
					};
				}
			},
		})

		// deriving derived protocols
		deriveProtocols({
			forEach() {
				if( Type[loop] ) {
					return function() {
						const forEachFn = this.registerParameter(`forEachFn`);

						this.pushStatement(
							...this.protocols.loop( function(kvn){
								return [ forEachFn.call( kvn.value, kvn.key, kvn.n ) ];
							})
						);
					}
				}
			},
			reduce() {
				if( Type[loop] ) {
					return function() {
						const reduceFn = this.registerParameter(`reduceFn`);
						const initialValue = this.registerParameter(`initialValue`);

						const state = this.createUniqueVariable(`state`);

						this.pushStatement(
							state.declare( initialValue ),

							...this.protocols.loop( function(kvn){
								return [ state.assign( reduceFn.call(state, kvn.value, kvn.key, kvn.n) ) ];
							}),

							state.return(),
						);
					}
				}
			},
		});
	}

}






function compileProtocolsForRootType( compilerConfiguration ) {
	assert( this, `compileProtocolsForRootType() must be called on an object` );

	// everything in `compilerConfiguration` should be protocol generator factories: assigning them to `this`
	generatorSymbols::assignProtocols( this, compilerConfiguration );

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
		const {len, nthKVN, getKVN, nToKey, keyToN, loop} = generatorSymbols;

		generatorSymbols::assignProtocolFactories( this, {
			len() {
				if( this.*mappingOnly && ParentType.*len ) {
					return function() {
						return this.inner.len();
					}
				}
			},

			nToKey() {
				if( nToParentN && ParentType[nToKey] ) {
					return function( n ) {
						const parentN = this::nToParentN( n );
						return this.inner.nToKey( parentN );
					};
				}
			},
			nthKVN() {
				if( nStage && ParentType[nthKVN] ) {
					return function( n ) {
						const parentN = this::nToParentN( n );
						const parentKVN = this.inner.nthKVN( parentN );
						return this::nStage( parentKVN );
					};
				}
			},
			getKVN() {
				if( kStage && ParentType[getKVN] ) {
					return function( key ) {
						const parentKey = this::keyToParentKey( key );
						const parentKVN = this.inner.getKVN( parentKey );
						return this::kStage( parentKVN );
					};
				}
			},
			hasKey() {
				if( kStage && ParentType[getKVN] ) {
					return function( key ) {
						const parentKey = this::keyToParentKey( key );
						const parentKVN = this.inner.getKVN( parentKey );
						this::kStage( parentKVN );
						return true;
					};
				}
			},
			keyToN() {
				if( keyToParentKey && ParentType[keyToN] ) {
					return function( key ) {
						const parentKey = this::keyToParentKey( key );
						return this.inner.keyToN( parentKey );
					};
				}
			},
			loop() {
				if( ParentType[loop] ) {
					return function( generator ) {
						return this.inner.loop( function(parentKVN){
							return this.outer::generator( this.outer::kStage(parentKVN) );
						});
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
