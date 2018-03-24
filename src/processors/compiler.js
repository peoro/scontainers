
const assert = require('assert');

const symbols = require('../symbols');
const generatorSymbols = require('../generator_symbols');

const compilerSymbol = Symbol('compiler');
const {propertiesSymbol} = require('./properties');
const {semantics, codegen, FunctionCompiler} = require('../compiler/index.js');




// TODO: this stuff should come from 'js-protocols/util'
function set( target, fn ) {
	Object.defineProperty( target, this, {
		configurable: true,
		enumerable: false,
		writable: true,
		value: fn,
	});
	return this;
}
function assignProtocols( target, symbolObj ) {
	for (let name in symbolObj) {
		console.log( `Assigning ${name} to ${target.name}` );
		const sym = this[name];

		const value = symbolObj[name];
		assert( sym, `No protocol \`${name}\`` );
		assert( ! target[sym], `Already implemented...` );
		sym::set( target, value );
		target[ sym ].factory = ()=>value;
	};
}
// replaces `this[sym]` with `fn`
function replaceSymbol( sym, fn ) {
	assert( this, `replaceSymbol() must be called on an object` );
	assert( fn );

	const oldFn = this[sym];

	if( ! fn.compiler && oldFn.compiler ) {
		fn.compiler = oldFn.compiler;
	}
	fn.factory = ()=>fn;
	this[sym] = fn;
}
function assignProtocolFactories( dest, symbolObj ) {
	for (let symName in symbolObj) {
		const srcFn = symbolObj[symName];
		const sym = this[symName];

		assert( sym, `No protocol \`${symName}\`` );

		if( dest[sym] ) {
			// already implemented...
			continue;
		}

		{
			const fnFactory = srcFn.factory ? ::srcFn.factory : srcFn;

			// functions (not factories!) may return null...
			if( srcFn === fnFactory ) {
				if( ! dest::srcFn() ) {
					continue;
				}
			}

			if( srcFn.assignImmediately ) {
				const fn = dest::fnFactory();
				dest[sym] = fn;
				dest[sym].factory = ()=>fn;
			}
			else {
				dest[sym] = function() {
					const fn = dest[sym].factory();
					return fn.apply( this, arguments );
				};
				dest[sym].factory = function() {
					const fn = dest::fnFactory();
					assert( fn, `${dest.constructor.name}.${symName}'s factory returned null` );
					dest::replaceSymbol( sym, fn );
					return fn;
				};
			}
		}
	};
}


function extractKeys( keys ) {
	const result = {};
	keys.forEach( key=>{
		result[key] = this[key];
		delete this[key];
	});
	return result;
}








class Compiler extends FunctionCompiler {
	constructor( Type, functionName ) {
		super( `${Type.name.replace(/::/g, '_')}_${functionName}` );

		this.Type = Type;
		this.typeArguments = new Map();

		this.key = undefined;
		this.value = undefined;
		this.loop = undefined;

		{
			let t = Type;
			while( t ) {
				const p = t[propertiesSymbol];
				if( ! p ) {
					break;
				}

				this.registerTypeArguments( t, p.argKeys );
				t = p.ParentType;
			}
		}
	}

	assert( expr ) {
		return semantics.id(`assert`).call( expr );
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
				args[argName] = {
					name: argName,
					variable: this.createUniqueVariable( argName ),
					fn() { return this[argName]; }
				};
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
				console.log(`No type arguments for ${Type.name}, while compiling ${this.Type.name}`);
				console.log( Array.from( this.typeArguments.keys() ).map(T=>T.name) );
				return [];
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
				console.log(`No type arguments for ${Type.name}, while compiling ${this.Type.name}`);
				console.log( Array.from( this.typeArguments.keys() ).map(T=>T.name) );
				return [];
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

	getParent( Type ) {
		const properties = Type[propertiesSymbol];
		const parentKey = properties.parentCollectionKey;
		return this.registerTypeArguments( Type, [parentKey] )[parentKey];
	}
	getArgs( Type ) {
		const properties = Type[propertiesSymbol];
		return this.registerTypeArguments( Type, properties.argKeys );
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

		const fFactory = new Function(
			...constantIdentifiers,
			this.toCode()
		);
		const f = fFactory.apply( null, constantValues );

		console.log( ` >>>>>>>>>>>>>>>>>>>> Compiled function:` );
		console.log( this.toCode().split(`\n`).map( line=>`\t${line}` ).join(`\n`) );

		return this::Compiler.bindFunction( f );
	}

	static bindFunction( f ) {
		const compiler = this;
		const constants = this.constants;

		const boundFunction = function() {
			const args = compiler.getTypeArgumentArray();

			// pushing constants...
			const constArgs = constants.keys();

			const allArgs = [].concat(
				compiler.getTypeArgumentArrayValues(this),
				Array.from(constArgs)
			);

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
}



function implementCoreProtocolGenerators( compilerConfiguration ) {
	assert( this, `implementCoreProtocolGenerators() must be called on an object` );

	const Type = this;
	const properties = this[propertiesSymbol];

	const {nth, len, keyToN, nToKey, setNth, nToParentN} = generatorSymbols;

	generatorSymbols::assignProtocolFactories( this, {
		get() {
			if( this[nth] && this[keyToN] ) {
				return function( compiler, key ) {
					const n = this[keyToN]( compiler, key );
					return this[nth]( compiler, n );
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
			if( this[nth] ) {
				return function( compiler, generator ) {
					const i = compiler.createUniqueVariable(`i`);
					const lenVar = this[len]( compiler );

					compiler.body.pushStatement(
						compiler.loop = semantics.for(
							i.declare( 0 ),
							i.lt( lenVar ),
							i.increment(),

							compiler.body = new semantics.Block()
						)
					)
					compiler.key = this[nToKey]( compiler, i );
					compiler.value = this[nth]( compiler, i );

					generator( compiler.body );
				}
			}
		}
	});
}

function deriveProtocolsFromGenerators() {
	assert( this, `deriveProtocolsFromGenerators() must be called on an object` );

	const Type = this;
	const properties = this[propertiesSymbol];
	const ParentType = properties.ParentType;

	// implementing core protocols from generators
	{
		const {get, hasKey, nth, len, loop} = generatorSymbols;

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

		deriveProtocols({
			nth() {
				if( Type[nth] && Type[get] ) {
					return function( compiler ) {
						const n = compiler.registerParameter(`n`);
						compiler.body.pushStatement(
							compiler.assert( semantics.id(`Number`).member(`isInteger`).call( n ) ),
							semantics.if(
								semantics.or( n.lt( 0 ), n.ge( Type[len](compiler) ) ),
								semantics.return()
							)
						);
						return Type[nth]( compiler, n );
					}
				}
			},
			get() {
				if( Type[get] && Type[hasKey] ) {
					return function( compiler ) {
						const key = compiler.registerParameter(`key`);
						compiler.body.pushStatement(
							semantics.if(
								Type[hasKey](compiler, key).not(),
								semantics.return()
							)
						);
						return Type[get]( compiler, key );
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
				if( Type[nth] ) {
					return function( compiler ) {
						const args = compiler.getTypeArgumentArray();
						// const cd = new CompilerDefinition( Type, comp ).instantiate( compiler );
						// const cdWithMemberArgs = cd.reinstantiate( (arg)=>semantics.this().member(arg) );
						const compilerWithMemberArgs = compiler.mappedArguments( (arg)=>semantics.this().member(arg) );

						{
							const params = args.map( arg=>arg.variable );

							const Reflect = semantics.id(`Reflect`);
							const argumentsObj = semantics.id(`arguments`);
							const kv = compiler.createUniqueVariable( `kv` );
							const done = compiler.createUniqueVariable( `done` );
							const Iterator = compiler.createUniqueVariable( `Iterator` );
							const i = semantics.this().member( compiler.createUniqueVariable(`i`) );
							const lenVar = semantics.this().member( compiler.createUniqueVariable(`len`) );
							const key = compiler.createUniqueVariable( `key` );
							const value = compiler.createUniqueVariable( `value` );

							compiler.ast.unshiftStatement(
								kv.declareFunction( [key, value], semantics.block(
									semantics.this().member('done').assign( false ),
									semantics.this().member('value').assign( semantics.array(key, value) ),
								)),
								done.declareFunction( [], semantics.block(
									semantics.this().member('done').assign( true ),
								)),
								Iterator.declareFunction( params, semantics.block(
									i.assign( 0 ),
									lenVar.assign( Type[len](compiler) ),
									...args.map( arg=>semantics.this().member(arg.variable).assign( arg.variable ) ),
								)),
								Iterator.member('prototype').member('next').assign(
									semantics.function( null, [], semantics.block(
										semantics.if(
											i.ge( lenVar ),
											done.new().return()
										),
										value.declare( Type[nth](compilerWithMemberArgs, i) ),
										kv.new( i.increment(), value ).return()
									))
								),
							);

							compiler.body.pushStatement(
								semantics.id(`console`).member(`log`).call( argumentsObj ),
								Reflect.member('construct').call( Iterator, argumentsObj ).return()
							);
						}
					};
				}
			},
			forEach() {
				if( Type[loop] ) {
					return function( compiler ) {
						const fn = compiler.registerParameter(`fn`);

						const i = compiler.key = compiler.createUniqueVariable(`i`);

						/*
						compiler.body.pushStatement(
							semantics.for(
								i.declare( 0 ),
								i.lt( Type[len](compiler) ),
								i.increment(),

								new semantics.Block(
									compiler.value = Type[nth]( compiler, i ),
									fn.call( compiler.value, compiler.key )
								)
							)
						);
						*/
						Type[loop]( compiler, (block)=>{
							block.pushStatement( fn.call( compiler.value, compiler.key ) );
						});
					}
				}
			}
		});
	}

}






function compileProtocolsForRootType( compilerConfiguration ) {
	assert( this, `compileProtocolsForRootType() must be called on an object` );

	generatorSymbols::assignProtocols( this, compilerConfiguration );
	this::implementCoreProtocolGenerators( compilerConfiguration );
	this::deriveProtocolsFromGenerators();
}


// implements collection protocols for the type `this` whose parent type is `ParentType`,
// generating functions using `compilerConfiguration`
function compileProtocolsForTransformation( compilerConfiguration ) {
	assert( this, `compileProtocolsForTransformation() must be called on an object` );

	const Type = this;
	const properties = this[propertiesSymbol];
	const ParentType = properties.ParentType;

	assert( ParentType, `${this.name} should specify its ParentType` );

	// taking the non-protocol data from `compilerConfiguration` (e.g.  `nStage` and `stage`)
	let {stage, nStage, nToParentN, keyToParentKey} = compilerConfiguration::extractKeys( [id`stage`, id`nStage`, id`nToParentN`, id`keyToParentKey`] );

	{
		if( nStage && ! stage ) {
			stage = function( compiler, key, innerStage ) {
				const n = this[keyToN]( compiler, key );
				this::nStage( compiler, n, (c, n)=>{
					const key = this[nToKey]( compiler, key );
					return innerStage(c, key);
				});
			};
		}
		if( nToParentN && ! keyToParentKey ) {
			keyToParentKey = function( compiler, key, value ) {
				const n = this::parentCoreSymbols.keyToN( compiler, key );
				return this::nToParentN( compiler, n );
			}
		}
	}

	generatorSymbols::assignProtocolFactories( this, compilerConfiguration );

	{
		const {nth, get, nToKey, keyToN} = generatorSymbols;

		generatorSymbols::assignProtocolFactories( Type, {
			nToKey() {
				if( nToParentN && ParentType[nToKey] ) {
					return function( compiler, n ) {
						const parentN = this::nToParentN( compiler, n );
						return ParentType[nToKey]( compiler, parentN );
					}
				}
			},
			nth() {
				if( nStage && ParentType[nth] ) {
					return function( compiler, n ) {
						this::nStage( compiler, n, (c, n)=>{
							c.value = ParentType[nth]( c, n );
						});
						return compiler.value;
					}
				}
			},
			get() {
				if( stage && ParentType[get] ) {
					return function( compiler, key ) {
						compiler.key = key;
						this::stage( compiler, (c)=>{
							compiler.value = ParentType[get]( c, c.key );
						});
						return compiler.value;
					}
				}
			},
			hasKey() {
				if( stage && ParentType[nth] ) {
					return function( compiler, key ) {
						TODO(`Meh, use \`compiler.skip()\` to return false...`);
						compiler.key = key;
						this::stage( compiler, (c)=>{
							compiler.value = ParentType[nth]( c, c.key );
						});
						return true;
					}
				}
			},
			keyToN() {
				if( keyToParentKey && ParentType[keyToN] ) {
					return function( compiler, key ) {
						const parentKey = this::keyToParentKey( compiler, key );
						return ParentType[keyToN]( compiler, parentKey );
					}
				}
			},
		});
	}

	this::implementCoreProtocolGenerators( compilerConfiguration );
	this::deriveProtocolsFromGenerators();
}




const parentCoreSymbols = {};

for( let symName in generatorSymbols ) {
	const genSym = generatorSymbols[symName];
	assert( genSym, `${symName} is not a valid core protocol generator` );

	const sym = symbols[symName];
	assert( sym, `${symName} is not a valid core protocol` );

	parentCoreSymbols[symName] = function( compiler, ...args ) {
		const Type = this;
		const properties = Type[propertiesSymbol];
		const ParentType = properties.ParentType;

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

const {hasSymbols, implementSymbolsFromFactory, functionalIf, identity} = require('../util.js');
