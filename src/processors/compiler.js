
const assert = require('assert');

const symbols = require('../symbols');
const generatorSymbols = require('../generator_symbols');

const compilerSymbol = Symbol('compiler');
const {propertiesSymbol} = require('./properties');
const {semantics, codegen, FunctionCompiler} = require('../compiler/index.js');
const {extractKeys, assignProtocols, assignProtocolFactories} = require('../util.js');







/*
// TODO: should we use something like this to carry around the arguments of an object during compilation?
class Instance {
	constructor( Type, self ) {
		const properties = Type[propertiesSymbol];

		const args = {};
		properties.argKeys.forEach( key=>{
			args[key] = self.member( key );
		});

		this.self = self;
		this.args = args;
		this.parent = self.member( properties.parentKey );

		this.parentInstance = new Instance( properties.ParentType, this.parent );
	}
}

class FlatMemberInstance {
	constructor( Type, compiler ) {
		const properties = Type[propertiesSymbol];

		this.parentInstance = new Instance( properties.ParentType, this.parent );

		this.self = self;
		this.args = args;
		this.parent = self.member( properties.parentKey );
	}
}
*/

class Compiler extends FunctionCompiler {
	constructor( Type, functionName ) {
		super( `${Type.name.replace(/::/g, '_')}_${functionName}` );

		this.Type = Type;
		this.typeArguments = new Map();

		this.key = undefined;
		this.value = undefined;
		this.loop = undefined;
	}

	assert( expr ) {
		const assertVar = this.registerConstant( assert, `assert` );
		return assertVar.call( expr );
	}
	debug() {
		return semantics.id(`console`).member(`log`).call( semantics.id(`arguments`) );
	}

	registerTypeArguments( Type, argKeys ) {
		const argVars = {};

		let args;
		if( this.typeArguments.has(Type) ) {
			args = this.typeArguments.get(Type);
		} else {
			args = {};
			this.typeArguments.set(Type, args);
		}

		argKeys.forEach( argName=>{
			if( ! args.hasOwnProperty(argName) ) {
				// TODO: damn, this is ugly D:
				if( ! argName ) {
					args[argName] = {
						name: `self${Type.name.replace(/:/g, '')}`,
						variable: this.createUniqueVariable(`self${Type.name.replace(/:/g, '')}`),
						fn() { return this; }
					};
				}
				else {
					args[argName] = {
						name: argName,
						variable: this.createUniqueVariable( argName ),
						fn() { return this[argName]; }
					};
				}
			}

			argVars[argName] = args[argName].variable;
		});

		return argVars;
	}
	getTypeArgumentArray( ) {
		const getTypeArgRec = (Type)=>{
			if( ! Type ) { return []; }

			const properties = Type[propertiesSymbol];
			if( ! properties ) { return []; }

			if( ! this.typeArguments.get(Type) ) {
				return getTypeArgRec( properties.ParentType );
			}

			const args = Object.values( this.typeArguments.get(Type) );

			return [].concat(
				getTypeArgRec( properties.ParentType ),
				args
			);
		};

		return getTypeArgRec( this.Type );
	}
	getTypeArgumentArrayValues( instance ) {
		const getTypeArgRec = (Type, instance)=>{
			if( ! Type ) { return []; }
			assert( instance instanceof Type, `${instance} is not a ${Type.name}` );

			const properties = Type[propertiesSymbol];
			if( ! properties ) { return []; }

			if( ! this.typeArguments.get(Type) ) {
				return getTypeArgRec( properties.ParentType, instance[properties.parentCollectionKey] );
			}

			const args = Object.values( this.typeArguments.get(Type) ).map( (arg, argName)=>{
				return instance::arg.fn();
			});

			return [].concat(
				getTypeArgRec( properties.ParentType, instance[properties.parentCollectionKey] ),
				args
			);
		};

		return getTypeArgRec( this.Type, instance );
	}

	getSelf( Type ) {
		return this.registerTypeArguments( Type, [''] )[''];
	}
	getParent( Type ) {
		const ParentType = Type[propertiesSymbol].ParentType;
		if( ParentType[propertiesSymbol] ) {
			return this.getSelf( ParentType );
		}
		else {
			const parentKey = Type[propertiesSymbol].parentCollectionKey;
			return this.registerTypeArguments( Type, [parentKey] )[parentKey];
		}
	}
	getArgs( Type ) {
		const argKeys = Type[propertiesSymbol].argKeys;
		return this.registerTypeArguments( Type, argKeys );
	}
	mappedArguments( argMapFn ) {
		return new MappedArgumentsCompiler( this, argMapFn );
	}

	toFunction() {
		const constantIdentifiers = Array.from( this.constants.values() ).map( variable=>variable.name );
		const constantValues = Array.from( this.constants.keys() );

		this.fn.ast.params.push(
			...this.getTypeArgumentArray().map( (a)=>a.variable.ast ),
			...this.parameters.map( variable=>variable.ast )
		);

		console.log( ` >>>>>>>>>>>>>>>>>>>> Compiled function:` );
		console.log( this.toCode().split(`\n`).map( line=>`\t${line}` ).join(`\n`) );

		const fFactory = new Function(
			...constantIdentifiers,
			this.toCode()
		);
		const f = fFactory.apply( null, constantValues );

		return this::Compiler.bindFunction( f );
	}

	static bindFunction( f ) {
		const compiler = this;

		const boundFunction = function() {
			const args = compiler.getTypeArgumentArray();

			const allArgs = compiler.getTypeArgumentArrayValues( this );

			try {
				return f.call( this, ...allArgs, ...arguments );
			}
			catch( err ) {
				console.log();
				console.log( `Error while calling ${f}(${allArgs.map(v=>v ? v.toString() : v)})(${Array.from(arguments)})` );
				console.log();
				throw err;
			}
		};
		boundFunction.f = f;

		return boundFunction;
	}
}

// TODO: maybe use a `Proxy` ?
class CompilerWrapper {
	constructor( compiler ) {
		this.compiler = compiler;
	}

	getSelf( Type ) { return this.compiler.getSelf(Type); }
	getParent( Type ) { return this.compiler.getSelf(Type); }
	getArgs( Type ) { return this.compiler.getArgs(Type); }
}

class MappedArgumentsCompiler extends CompilerWrapper {
	constructor( compiler, argMapFn ) {
		super( compiler );
		this.argMapFn = argMapFn;
	}
	getArgs( Type ) {
		const args = super.getArgs( Type );
		for( let argName in args ) {
			args[argName] = this.argMapFn( args[argName], argName );
		}
		return args;
	}
	getSelf( Type ) {
		return this.argMapFn( super.getSelf(Type), `self${Type.name.replace(/:+/g, '')}` );
	}
	getParent( Type ) {
		return this.argMapFn( super.getParent(Type), `self${Type.name.replace(/:+/g, '')}` );
	}
}



function deriveCoreProtocolGenerators() {
	assert( this, `deriveCoreProtocolGenerators() must be called on an object` );

	const Type = this;

	const {nthKVN, len, keyToN, nToKey, setNth, nToParentN} = generatorSymbols;

	generatorSymbols::assignProtocolFactories( this, {
		getKVN() {
			if( this[nthKVN] && this[keyToN] ) {
				return function( compiler, key ) {
					const n = this[keyToN]( compiler, key );
					return new KVN( key, this[nth](compiler, n), n );
				}
			}
		},
		hasKey() {
			if( this[keyToN] ) {
				return function( compiler, key ) {
					const Number = semantics.id(`Number`);
					const n = this[keyToN]( compiler, key );
					return semantics.and(
						Number.member(`isInteger`).call( n ),
						n.ge( 0 ),
						n.lt( this[len](compiler) )
					);
				}
			}
		},
		set() {
			if( this[setNth] && this[keyToN] ) {
				return function( compiler, key, value ) {
					const n = this[keyToN]( compiler, key );
					return this[setNth]( compiler, n, value );
				}
			}
		},
		loop() {
			if( this[nthKVN] ) {
				return function( compiler, generator ) {
					compiler.skip = function() {
						return semantics.continue();
					};

					const i = compiler.createUniqueVariable(`i`);
					const lenVar = this[len]( compiler );

					return [
						semantics.for(
							i.declare( 0 ),
							i.lt( lenVar ),
							i.increment(),

							new semantics.Block(
								...generator( compiler, this[nthKVN](compiler, i) ),
							)
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
						const compiler = new Compiler( Type, key );
						const result = Type::factory( compiler );
						if( result ) {
							compiler.body.pushStatement(
								result.return()
							);
						}
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
					return function( compiler ) {
						const KVNVar = this.registerConstant( KVN, `KVN` );
						const n = compiler.registerParameter(`n`);
						const kvn = Type[nthKVN]( compiler, n );
						return KVNVar.new( kvn.key, kvn.value, kvn.n );
					}
				}
			},
			nth() {
				if( Type[nthKVN] ) {
					return function( compiler ) {
						const n = compiler.registerParameter(`n`);
						compiler.body.pushStatement(
							compiler.assert( semantics.id(`Number`).member(`isInteger`).call( n ) ),
							semantics.if(
								semantics.or( n.lt( 0 ), n.ge( Type[len](compiler) ) ),
								semantics.return()
							),
							semantics.return( Type[nthKVN](compiler, n).value ),
						);
					}
				}
			},
			getKVN() {
				if( Type[getKVN] ) {
					return function( compiler ) {
						const KVNVar = this.registerConstant( KVN, `KVN` );
						const n = compiler.registerParameter(`n`);
						const kvn = Type[getKVN]( compiler, n );
						return KVNVar.new( kvn.key, kvn.value, kvn.n );
					}
				}
			},
			get() {
				if( Type[getKVN] && Type[hasKey] ) {
					return function( compiler ) {
						const key = compiler.registerParameter(`key`);
						compiler.body.pushStatement(
							semantics.if(
								Type[hasKey](compiler, key).not(),
								semantics.return()
							),
							semantics.return( Type[getKVN](compiler, key).value ),
						);
					}
				}
			},
			len() {
				if( Type[len] ) {
					return function( compiler ) {
						return Type[len]( compiler );
					}
				}
			},
			kvIterator() {
				if( Type[nthKVN] ) {
					return function( compiler ) {
						const compilerWithMemberArgs = compiler.mappedArguments( (arg)=>semantics.this().member(arg) );

						const Reflect = semantics.id(`Reflect`);
						const argumentsObj = semantics.id(`arguments`);
						const kv = compiler.createUniqueVariable( `kv` );
						const done = compiler.createUniqueVariable( `done` );
						const Iterator = compiler.createUniqueVariable( `Iterator` );
						const i = semantics.this().member( compiler.createUniqueVariable(`i`) );
						const lenVar = semantics.this().member( compiler.createUniqueVariable(`len`) );
						const key = compiler.createUniqueVariable( `key` );
						const value = compiler.createUniqueVariable( `value` );

						// implementing `Iterator.prototype.next`
						compiler.ast.unshiftStatement(
							Iterator.member('prototype').member('next').assign(
								semantics.function( null, [], semantics.block(
									semantics.if(
										i.ge( lenVar ),
										done.new().return()
									),
									value.declare( Type[nthKVN](compilerWithMemberArgs, i).value ),
									kv.new( i.increment(), value ).return()
								))
							),
						);

						// implementing `Iterator` constructor
						{
							const args = compiler.getTypeArgumentArray();
							const params = args.map( arg=>arg.variable );
							compiler.ast.unshiftStatement(
								Iterator.declareFunction( params, semantics.block(
									i.assign( 0 ),
									lenVar.assign( Type[len](compiler) ),
									...args.map( arg=>semantics.this().member(arg.variable).assign( arg.variable ) ),
								)),
							);
						}

						// TODO: these could be passed as constants...
						// implementing `kv` and `done`
						compiler.ast.unshiftStatement(
							kv.declareFunction( [key, value], semantics.block(
								semantics.this().member('done').assign( false ),
								semantics.this().member('value').assign( semantics.array(key, value) ),
							)),
							done.declareFunction( [], semantics.block(
								semantics.this().member('done').assign( true ),
							)),
						);

						// implementing the real function... It should just return a `new Iterator(...)`
						compiler.body.pushStatement(
							compiler.debug(),
							Reflect.member('construct').call( Iterator, argumentsObj ).return()
						);
					};
				}
			},
		})

		// deriving derived protocols
		deriveProtocols({
			forEach() {
				if( Type[loop] ) {
					return function( compiler ) {
						const fn = compiler.registerParameter(`fn`);

						compiler.body.pushStatement(
							...Type[loop]( compiler, (compiler, kvn)=>[
								fn.call( kvn.value, kvn.key, kvn.n ),
							])
						);
					}
				}
			},
			reduce() {
				if( Type[loop] ) {
					return function( compiler ) {
						const fn = compiler.registerParameter(`fn`);
						const initialValue = compiler.registerParameter(`initialValue`);

						const state = compiler.createUniqueVariable(`state`);

						compiler.body.pushStatement(
							state.declare( initialValue ),

							...Type[loop]( compiler, (compiler, kvn)=>[
								state.assign( fn.call(state, kvn.value, kvn.key, kvn.n) ),
							]),

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

	const ParentType = this[propertiesSymbol].ParentType;
	check( ParentType, `need to specify the ParentType` );

	// taking the non-protocol data from `compilerConfiguration` (e.g.  `nStage` and `stage`)
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
		const {nthKVN, getKVN, nToKey, keyToN, loop} = generatorSymbols;

		generatorSymbols::assignProtocolFactories( this, {
			nToKey() {
				if( nToParentN && ParentType[nToKey] ) {
					return function( compiler, n ) {
						const parentN = this::nToParentN( compiler, n );
						return ParentType[nToKey]( compiler, parentN );
					};
				}
			},
			nthKVN() {
				if( nStage && ParentType[nthKVN] ) {
					return function( compiler, n ) {
						const parentKVN = ParentType[nthKVN]( compiler, n );
						return this::nStage( compiler, parentKVN );
					};
				}
			},
			getKVN() {
				if( kStage && ParentType[getKVN] ) {
					return function( compiler, key ) {
						const parentKVN = ParentType[getKVN]( compiler, key );
						return this::kStage( compiler, parentKVN );
					};
				}
			},
			hasKey() {
				if( kStage && ParentType[getKVN] ) {
					return function( compiler, key ) {
						const parentKVN = ParentType[getKVN]( compiler, key );
						return this::kStage( compiler, parentKVN );
					};
				}
			},
			keyToN() {
				if( keyToParentKey && ParentType[keyToN] ) {
					return function( compiler, key ) {
						const parentKey = this::keyToParentKey( compiler, key );
						return ParentType[keyToN]( compiler, parentKey );
					};
				}
			},
			loop() {
				if( ParentType[loop] ) {
					return function( compiler, generator ) {
						return ParentType[loop]( compiler, (compiler, parentKVN)=>{
							compiler.body = semantics.block();
							const kvn = this::kStage( compiler, parentKVN );

							return [
								compiler.body,
								...generator( compiler, kvn )
							];
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



const selfCoreSymbols = {};
const parentCoreSymbols = {};

for( let symName in generatorSymbols ) {
	const genSym = generatorSymbols[symName];
	assert( genSym, `${symName} is not a valid core protocol generator` );

	const sym = symbols[symName];
	assert( sym, `${symName} is not a valid core protocol` );

	selfCoreSymbols[symName] = function( compiler, ...args ) {
		const Type = this;

		if( Type[genSym] ) {
			return Type[genSym]( compiler );
		}

		const symVar = compiler.registerConstant( sym, `${symName}Sym` );
		return compiler.getSelf( this ).member( symVar, true ).call( ...args );
	};

	parentCoreSymbols[symName] = function( compiler, ...args ) {
		const Type = this;
		const ParentType = Type[propertiesSymbol].ParentType;

		if( ParentType[genSym] ) {
			return ParentType[genSym]( compiler );
		}

		const symVar = compiler.registerConstant( sym, `${symName}Sym` );
		return compiler.getParent( this ).member( symVar, true ).call( ...args );
	};
}





module.exports = {
	compileProtocolsForTransformation,
	compileProtocolsForRootType,
	parentCoreSymbols
};
