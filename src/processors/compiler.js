
const assert = require('assert');

const symbols = require('../symbols');

const compilerSymbol = Symbol('compiler');
const {propertiesSymbol} = require('./properties');
const {semantics, codegen} = require('../compiler/index.js');


class Compiler {
	constructor( Type ) {
		this.Type = Type;
		this.varDB = new semantics.VarDB();
		this.typeArguments = new Map();
		this.parameters = [];
		this.constants = new Map();

		this.code = new semantics.Program();
		this.key = undefined;
		this.value = undefined;
		this.loop = undefined;
		this.body = this.code;
	}

	expectArgument( name ) {
		const variable = this.createUniqueVariable( name );
		this.parameters.push( variable );
		return variable;
	}
	registerTypeArguments( Type, argFns ) {
		const argVars = {};

		let args;
		if( this.typeArguments.has(Type) ) {
			args = this.typeArguments.get(Type);
		} else {
			args = {};
			this.typeArguments.set(Type, args);
		}

		for( let argName in argFns ) {
			assert( argFns.hasOwnProperty(argName) );

			if( ! args.hasOwnProperty(argName) ) {
				args[argName] = {
					name: argName,
					variable: this.createUniqueVariable( argName ),
					fn: argFns[argName]
				};
			}

			argVars[argName] = args[argName].variable;
		}

		return argVars;
	}
	registerConstants( args ) {
		return args[ownProperties]()
			[map]( (value, name)=>{
				if( this.constants.has(value) ) {
					return this.constants.get( value );
				}

				const variable = this.createUniqueVariable( name );
				this.constants.set( value, variable );
				this.parameters.push( variable );
				return variable;
			})
			[collect]( Object );
	}
	createUniqueVariable( name ) {
		return this.varDB.createUniqueVariable( name );
	}
	getTypeArgumentArray( instance ) {
		const getTypeArgRec = (Type, instance)=>{
			if( ! Type ) {
				return [];
			}

			const properties = Type[propertiesSymbol];
			if( ! properties ) {
				return [];
			}

			if( ! this.typeArguments.get(Type) ) {
				console.log(`No type arguments for ${Type.fullName || Type.name}, while compiling ${this.Type.fullName || this.Type.name}`);
				console.log( Array.from( this.typeArguments.keys() ).map(T=>T.fullName || T.name) );
				return [];
			}

			const args = Object.values( this.typeArguments.get(Type) ).map( (arg, argName)=>{
				if( instance ) {
					return Object.assign({}, arg, {
						value: instance::arg.fn()
					});
				}
				return arg;
			});

			const parentInstance = instance && properties.ParentType ?
				instance::properties.parentCollection() :
				undefined;

			return [].concat(
				getTypeArgRec( properties.ParentType, parentInstance ),
				args
			);
		};

		// console.log( this.Type.fullName || this.Type.name, instance );
		assert( ! instance || instance instanceof this.Type )
		return getTypeArgRec( this.Type, instance );
	}

	toCode() {
		const ast = this.code.id();
		return codegen( ast );
	}

	toFunction() {
		const f = new Function(
			...this.getTypeArgumentArray().map( (a)=>a.variable.name ),
			...this.parameters.map( (v)=>v.name ),
			this.toCode().split('\n').map( line=>`\t${line}`).join('\n')
		);

		console.log( f.toString() );

		return this::Compiler.bindFunction( f );
	}
	toFunctionFactory() {
		const f = new Function(
			...this.getTypeArgumentArray().map( (a)=>a.variable.name ),
			...this.parameters.map( (v)=>v.name ),
			this.toCode().split('\n').map( line=>`\t${line}`).join('\n')
		);

		console.log( f.toString() );

		return this::Compiler.bindFunction( f() );
	}

	static bindFunction( f ) {
		const compiler = this;
		const constants = this.constants;

		const boundFunction = function() {
			const args = compiler.getTypeArgumentArray( this );

			// pushing constants...
			const constArgs = constants.keys();

			const allArgs = [].concat( args.map(a=>a.value), Array.from(constArgs) );

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


class CompilerDefinition {
	constructor( CollectionType, comp ) {
		this.CollectionType = CollectionType;
		this.methods = {};
		this.addMethods( comp );
	}

	addMethods( methods ) {
		const properties = this.CollectionType[propertiesSymbol];

		for( let factoryName in methods ) {
			if( this.methods[factoryName] ) {
				continue;
			}

			const factory = methods[factoryName];
			// const fn = factory();
			const fn = factory;
			if( ! fn ) {
				continue;
			}

			this.methods[factoryName] = fn;
		}
	}

	instantiate( compiler, argsMapFn ) {
		const properties = this.CollectionType[propertiesSymbol];
		assert( properties, this.fullName || this.name || JSON.stringify(this) );

		// preparing parent
		let parent;
		if( properties.ParentType ) {
			const parentDefinition = properties.ParentType[compilerSymbol];
			if( parentDefinition ) {
				// UGH D:
				parent = new CompilerDefinition( properties.ParentType, parentDefinition).instantiate( compiler, argsMapFn );
			}
		}

		// preparing args
		const args = compiler.registerTypeArguments( this.CollectionType, properties.args );
		if( argsMapFn ) {
			for( let argName in args ) {
				args[argName] = argsMapFn( args[argName], argName );
			}
		}

		// preparing the reinstantiate function
		const reinstantiate = ( argsMapFn )=>this.instantiate(compiler, argsMapFn);

		// preparing member functions
		const obj = {};
		for( let fnName in this.methods ) {
			obj[fnName] = this.methods[fnName];
		}

		// putting everything together in an object that will be used as `this`
		Object.assign( obj, {
			parent,
			args,
			reinstantiate
		});

		return obj;
	}
}

function finalizeCompilerDefinition( ) {
	assert( this, `finalizeCompilerDefinition() must be called on an object` );

	const Type = this;
	const comp = this[compilerSymbol];
	const properties = this[propertiesSymbol];

	function assign( factories ) {
		for( let factoryName in factories ) {
			const factory = factories[factoryName];

			if( this[factoryName] ) {
				continue;
			}

			const fn = factory();
			if( fn ) {
				this[factoryName] = fn;
			}
		}
	}

	// implemenitng core functions from `stage` and `nStage`
	processNStage: if( comp.nStage ) {
		const {ParentType} = properties;
		const parentComp = ParentType[compilerSymbol];
		if( ! parentComp ) {
			break processNStage;
		}

		comp::assign({
			nth() {
				if( parentComp.nth ) {
					return function( compiler, n ) {
						compiler.key = n;
						this::comp.nStage( compiler, (c)=>{
							compiler.value = this.parent.nth( c, c.key );
						});
						return compiler.value;
					}
				}
			},
			stage() { return comp.nStage; },
		});
	}
	if( comp.stage ) {
		const {ParentType} = properties;
		const parentComp = ParentType[compilerSymbol];

		comp::assign({
			get() {
				if( parentComp.get ) {
					return function( compiler, key ) {
						compiler.key = key;
						this::comp.stage( compiler, (c)=>void this.parent.get(c, compiler.key) );
						return compiler.value;
					}
				}
			},
			// TODO: `hasKey` should recurse through types using `stage`, and also call the `hasKey` in the compiler definition for each type that defines it...
			// so the compiler definition's `hasKey` should NEVER be used: we should always provide this function here...
			// `hasKey` should only be implemented if `stage` doesn't do no filtering (e.g. `Filter` shouldn't define it)!
			hasKey() {
				if( parentComp.hasKey ) {
					return function( compiler, key ) {
						compiler.key = key;
						this::comp.stage( compiler, (c)=>void this.parent.hasKey(c, compiler.key) );
						this::comp.hasKey( compiler, key );
					}
				}
			},
		});
	}

	// implementing the duality between `key` and `n`:
	//	`get`=`nth`
	//	`setNth`=`set`
	//	`keyToParentKey`=`nToParentN`
	//	`hasKey` = (`hasNth` is unnecessary: always the same)
	comp::assign({
		get() {
			if( comp.nth && comp.keyToN ) {
				return function( compiler, key ) {
					const n = this.keyToN( compiler, key );
					return this.nth( compiler, n );
				}
			}
		},

		hasKey() {
			if( comp.keyToN ) {
				return function( compiler, key ) {
					const Number = semantics.id(`Number`);
					const n = this.keyToN( compiler, key );
					return semantics.and(
						Number.member(`isInteger`).call( n ),
						n.ge( 0 ),
						n.lt( this.len(compiler) )
					);
				}
			}
		},

		set() {
			if( comp.setNth && comp.keyToN ) {
				return function( compiler, key, value ) {
					const n = comp.keyToN( compiler, key );
					return comp.setNth( compiler, n, value );
				}
			}
		},

		keyToParentKey() {
			if( comp.nToParentN && comp.keyToN ) {
				return function( compiler, key, value ) {
					const n = comp.keyToN( compiler, key );
					return comp.nToParentN( compiler, n );
				}
			}
		},

		iterator() {
			if( comp.nth ) {
				return function( compiler ) {
					const i = compiler.createUniqueVariable(`i`);
					const len = comp.len( compiler );

					compiler.body.pushStatement(
						compiler.loop = semantics.for(
							i.declare( 0 ),
							i.lt( len ),
							i.increment(),

							compiler.body = new semantics.Block()
						)
					)
					compiler.key = i;
					compiler.value = comp.nth( compiler, i );
				}
			}
		}
	});
}


function compileProtocolsForRootType( compilerDefinition ) {
	assert( this, `compileProtocolsForRootType() must be called on an object` );

	const Type = this;
	const proto = this.prototype;

	assert( ! this[compilerSymbol] );
	const comp = this[compilerSymbol] = Object.assign({}, compilerDefinition);
	this::finalizeCompilerDefinition();

	const properties = this[propertiesSymbol];

	function implementCompilers( compilerFactories ) {
		const symbolFactory = {};
		const Collection = this;

		for( let symName in compilerFactories ) {
			if( ! compilerFactories.hasOwnProperty(symName) ) {
				console.log(`Unexpected prototype's enumerable property ${symName}`);
				continue;
			}

			const compilerFactory = compilerFactories[symName];
			if( ! compilerFactory ) {
				console.log(`Compiler factory ${symName} has no value O,o`);
				continue;
			}

			const compilerFn = compilerFactory();
			if( ! compilerFn ) {
				continue;
			}

			symbolFactory[symName] = {
				factory() {
					const compiler = new Compiler(Type);
					const cd = new CompilerDefinition( Type, comp ).instantiate( compiler );
					const result = cd::compilerFn( compiler );
					compiler.body.pushStatement(
						result.return()
					);
					return compiler.toFunction();
				}
			}
		}

		this::implementSymbolsFromFactory( symbolFactory );
	}

	// implementing core functions
	proto::implementCompilers({
		get() {
			if( comp.get ) {
				return function( compiler ) {
					const key = compiler.expectArgument(`key`);
					compiler.body.pushStatement(
						semantics.if(
							this::comp.hasKey(compiler, key).not(),
							semantics.return()
						)
					);
					return this::comp.get( compiler, key );
				}
			}
		},
		nth() {
			if( comp.nth ) {
				return function( compiler ) {
					const Number = semantics.id(`Number`);
					const n = compiler.expectArgument(`n`);
					compiler.body.pushStatement(
						compiler.assert( Number.member(`isInteger`).call( compiler.n ) ),
						semantics.if(
							n.lt( 0 ).or( n.ge( this::comp.len(compiler) ) ),
							semantics.return()
						)
					);
					return this::comp.get( compiler, n );
				}
			}
		}
	});

	proto::implementSymbolsFromFactory({
		kvIterator: {
			factory() {
				const compiler = new Compiler(Type);
				const cd = new CompilerDefinition( Type, comp ).instantiate( compiler );
				const args = compiler.registerTypeArguments( Type, properties.args );
				const cdWithMemberArgs = cd.reinstantiate( (arg)=>semantics.this().member(arg) );

				{
					const params = Object.values(args);

					const Reflect = semantics.id(`Reflect`);
					const argumentsObj = semantics.id(`arguments`);
					const kv = compiler.createUniqueVariable( `kv` );
					const done = compiler.createUniqueVariable( `done` );
					const Iterator = compiler.createUniqueVariable( `Iterator` );
					const i = semantics.this().member( compiler.createUniqueVariable(`i`) );
					const len = semantics.this().member( compiler.createUniqueVariable(`len`) );
					const key = compiler.createUniqueVariable( `key` );
					const value = compiler.createUniqueVariable( `value` );

					let iteratorBody;

					compiler.body.pushStatement(
						kv.declareFunction( [key, value], semantics.block(
							semantics.this().member('done').assign( false ),
							semantics.this().member('value').assign( semantics.array(key, value) ),
						)),
						done.declareFunction( [], semantics.block(
							semantics.this().member('done').assign( true ),
						)),
						Iterator.declareFunction( params, iteratorBody = semantics.block(
							i.assign( 0 ),
							len.assign( cd.len(compiler) ),
						)),
						Iterator.member('prototype').member('next').assign(
							semantics.function( null, [], semantics.block(
								semantics.if(
									i.ge( len ),
									done.new().return()
								),
								value.declare( cdWithMemberArgs.nth(compiler, i) ),
								kv.new( i.increment(), value ).return()
							))
						),
						semantics.function( null, [], semantics.block(
							semantics.id(`console`).member(`log`).call( argumentsObj ),
							Reflect.member('construct').call( Iterator, argumentsObj ).return()
						)).return()
					);

					Object.values( args ).forEach( (param)=>{
						iteratorBody.pushStatement( semantics.this().member(param).assign( param ) )
					});
				}

				return compiler.toFunctionFactory();
			}
		}
	});
}


// implements collection protocols for the type `this` whose parent type is `ParentType`,
// generating functions using `compilerDefinition`
function compileProtocolsForTransformation( ParentType, compilerDefinition ) {
	assert( this, `compileProtocolsForTransformation() must be called on an object` );

	const Type = this;
	const proto = this.prototype;
	const parentProto = ParentType.prototype;

	assert( ! this[compilerSymbol] );
	const comp = this[compilerSymbol] = Object.assign({}, compilerDefinition);
	this::finalizeCompilerDefinition();

	const properties = this[propertiesSymbol];

// TODO: clean up this mess a bit :F
const cd = new CompilerDefinition( Type, comp );
if( comp.nth )
	proto::implementSymbolsFromFactory({
		kvIterator: {
			factory() {
				const compiler = new Compiler(Type);
				const cd = new CompilerDefinition( Type, comp ).instantiate( compiler );
				const cdWithMemberArgs = cd.reinstantiate( (arg)=>semantics.this().member(arg) );
				const args = compiler.getTypeArgumentArray();

				{
					const params = args.map( arg=>arg.variable );

					const Reflect = semantics.id(`Reflect`);
					const argumentsObj = semantics.id(`arguments`);
					const kv = compiler.createUniqueVariable( `kv` );
					const done = compiler.createUniqueVariable( `done` );
					const Iterator = compiler.createUniqueVariable( `Iterator` );
					const i = semantics.this().member( compiler.createUniqueVariable(`i`) );
					const len = semantics.this().member( compiler.createUniqueVariable(`len`) );
					const key = compiler.createUniqueVariable( `key` );
					const value = compiler.createUniqueVariable( `value` );

					let iteratorBody;

					compiler.body.pushStatement(
						kv.declareFunction( [key, value], semantics.block(
							semantics.this().member('done').assign( false ),
							semantics.this().member('value').assign( semantics.array(key, value) ),
						)),
						done.declareFunction( [], semantics.block(
							semantics.this().member('done').assign( true ),
						)),
						Iterator.declareFunction( params, semantics.block(
							i.assign( 0 ),
							len.assign( cd.len(compiler) ),
							...args.map( arg=>semantics.this().member(arg.variable).assign( arg.variable ) ),
						)),
						Iterator.member('prototype').member('next').assign(
							semantics.function( null, [], semantics.block(
								semantics.if(
									i.ge( len ),
									done.new().return()
								),
								value.declare( cdWithMemberArgs.nth(compiler, i) ),
								kv.new( i.increment(), value ).return()
							))
						),
						semantics.function( null, [], semantics.block(
							// semantics.id(`console`).member(`log`).call( argumentsObj ),
							Reflect.member('construct').call( Iterator, argumentsObj ).return()
						)).return()
					);
				}

				return compiler.toFunctionFactory();
			}
		}
	});
}


module.exports = {
	compileProtocolsForTransformation,
	compileProtocolsForRootType
};

const {get, set, hasKey, has, nth, setNth, hasNth, nthKey, add, len, reverse, clear, kvIterator, kvReorderedIterator} = symbols;
const {hasSymbols, implementSymbolsFromFactory, functionalIf, identity} = require('../util.js');
