
const assert = require('assert');

const symbols = require('../symbols');

const compilerSymbol = Symbol('compiler');
const {propertiesSymbol} = require('./properties');

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

			const fn = factory();
			if( ! fn ) {
				continue;
			}

			this.methods[factoryName] = function( compiler ) {
				const args = compiler.pushArgumentsToHierarchy( properties.args );
				fn.apply( this, arguments );
			}
		}
	}


}

function finalizeCompilerDefinition( ) {
	assert( this, `finalizeCompilerDefinition() must be called on an object` );

	const Type = this;
	const comp = this[compilerSymbol];

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

	// implementing the duality between `key` and `n`:
	//	`get`=`nth`
	//	`setNth`=`set`
	//	`keyToParentKey`=`nToParentN`
	//	`hasKey`
	comp::assign({
		get() {
			if( comp.nth && comp.keyToN ) {
				return function( compiler, args, key ) {
					const n = comp.keyToN( compiler, args, key );
					return comp.nth( compiler, args, n );
				}
			}
		},
		nth() {
			if( comp.get && comp.nToKey ) {
				return function( compiler, args, n ) {
					const key = comp.nToKey( compiler, args, n );
					return comp.get( compiler, args, key );
				}
			}
		},

		hasKey() {
			if( comp.keyToN ) {
				return function( compiler, args, key ) {
					const Number = compiler.getGlobalVariable(`Number`);
					const n = comp.keyToN( compiler, args, key );
					return semantics.and(
						Number.member('isInteger').call( n ),
						n.ge( 0 ),
						n.lt( comp.len(compiler, args) )
					);
				}
			}
		},

		set() {
			if( comp.setNth && comp.keyToN ) {
				return function( compiler, args, key, value ) {
					const n = comp.keyToN( compiler, args, key );
					return comp.setNth( compiler, args, n, value );
				}
			}
		},
		setNth() {
			if( comp.set && comp.nToKey ) {
				return function( compiler, args, n, value ) {
					const key = comp.nToKey( compiler, args, n );
					return comp.set( compiler, args, key, value );
				}
			}
		},

		keyToParentKey() {
			if( comp.nToParentN && comp.keyToN ) {
				return function( compiler, args, key, value ) {
					const n = comp.keyToN( compiler, args, key );
					return comp.nToParentN( compiler, args, n );
				}
			}
		},
		nToParentN() {
			if( comp.keyToParentKey && comp.nToKey ) {
				return function( compiler, args, n, value ) {
					const key = comp.nToKey( compiler, args, n );
					return comp.keyToParentKey( compiler, args, key );
				}
			}
		},

		iterator() {
			if( comp.nth ) {
				return function( compiler, args ) {
					const i = compiler.createUniqueVariable(`i`);
					const len = comp.len( compiler, args );

					compiler.body.pushStatement(
						compiler.loop = semantics.for(
							i.declare( 0 ),
							i.lt( len ),
							i.increment(),

							compiler.body = new semantics.Block()
						)
					)
					compiler.key = i;
					compiler.value = comp.nth( compiler, args, i );
				}
			}
		}
	});

	if( Type.ParentType ) {
		const parentComp = Type.ParentType[compilerSymbol];

		comp::assign({
			getRec() {
				if( comp.get && parentComp.getRec ) {
					NOPE(`args is not OK D:`);
					return function( compiler, args, key ) {
						const parentKey = comp.keyToParentKey( compiler, args, key );
						const parentValue = parentComp.getRec( compiler, args, parentKey );
						return comp.get( compiler, args,  );
					}
				}
			},
		});
	}
	else {
		comp::assign({
			getRec() { return comp.get; }
		});
	}
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
					const compiler = new Compiler();
					const args = compiler.pushArgumentsToHierarchy( properties.args );
					const result = compilerFn( compiler, args );
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
				return function( compiler, args ) {
					const key = compiler.expectArgument(`key`);
					compiler.body.pushStatement(
						semantics.if(
							comp.hasKey(compiler, args, key).not(),
							semantics.return()
						)
					);
					return comp.get( compiler, args, key );
				}
			}
		},
		nth() {
			if( comp.nth ) {
				return function( compiler, args ) {
					const Number = compiler.getGlobalVariable(`Number`);
					const n = compiler.expectArgument(`n`);
					compiler.body.pushStatement(
						compiler.assert( Number.member('isInteger').call( compiler.n ) ),
						semantics.if(
							n.lt( 0 ).or( n.ge( comp.len(compiler, args) ) ),
							semantics.return()
						)
					);
					return comp.get( compiler, args, n );
				}
			}
		}
	});

	proto::implementSymbolsFromFactory({
		kvIterator: {
			factory() {
				const compiler = new Compiler();
				const args = compiler.pushArgumentsToHierarchy( properties.args );

				{
					const params = Object.values(args);
					const memberArgs = {};
					for( let argName in args ) {
						memberArgs[argName] = semantics.this().member( args[argName] );
					}

					const Reflect = compiler.getGlobalVariable(`Reflect`);
					const argumentsObj = compiler.getGlobalVariable(`arguments`);
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
							len.assign( comp.len(compiler, args) ),
						)),
						Iterator.member('prototype').member('next').assign(
							semantics.function( null, [], semantics.block(
								semantics.if(
									i.ge( len ),
									done.new().return()
								),
								value.declare( comp.nth(compiler, memberArgs, i) ),
								kv.new( i.increment(), value ).return()
							))
						),
						semantics.function( null, [], semantics.block(
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

	return;

	proto::setSymbolCompilers({
		get: functionalIf( compilerDefinition.get && parentProto.*get, function() {
			console.log( `COMPILING ${Type.fullName || Type.name}.get()`, !! parentProto.*get.compiler );
			if( parentProto.*get.compiler ) {
				const compiler = parentProto.*get.compiler();

				const args = compiler.pushArgumentsToHierarchy( compilerDefinition.args );
				compilerDefinition.get( compiler, args );

				return compiler;
			}
			else {
				const compiler = new Compiler();

				const {parent} = compiler.pushArgumentsToHierarchy({ parent: function(){return this;} });
				const {getSymbol} = compiler.registerConstants({ getSymbol:symbols.get });
				compiler.key = compiler.expectArgument(`key`);
				compiler.value = compiler.createUniqueVariable(`value`);

				compiler.body.pushStatement(
					compiler.value.declare( parent.member(getSymbol, true).call(compiler.key) )
				);

				const args = compiler.pushArgumentsToHierarchy( compilerDefinition.args );
				compilerDefinition.get( compiler, args );

				return compiler;
			}
		}),

	});
}


module.exports = {
	compileProtocolsForTransformation,
	compileProtocolsForRootType
};

const {get, set, hasKey, has, nth, setNth, hasNth, nthKey, add, len, reverse, clear, kvIterator, kvReorderedIterator} = symbols;
const {hasSymbols, implementSymbolsFromFactory, functionalIf, identity} = require('../util.js');
const {Compiler, semantics} = require('../compiler/index.js');
