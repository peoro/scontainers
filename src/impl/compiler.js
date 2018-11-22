
const assert = require('assert');
const {traits, options, language, semantics, defaultGet} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.semantics;
use traits * from traits.descriptors;

class CompilationFrame {
	constructor( compiler, Type,  ) {
		const frame = this;

		this.compiler = compiler;
		this.Type = Type;

		if( options.debug ) {
			this.innerCalls = [];
			this.traceInnerCall = function( traitName ) {
				const genTrait = traits.generators[traitName];
				const trait = traits.scontainers[traitName];
				this.innerCalls.push( {traitName, generated:!!this[genTrait]} );
			}
		}

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

		// .*
		for( let traitName in traits.generators ) {
			const genTrait = traits.generators[traitName];
			const trait = traits.scontainers[traitName];

			const compilationFrame = this;
			this.*[trait] = this.*[genTrait] = function( ...args ) {
				if( options.debug ) {
					compilationFrame.traceInnerCall( traitName );
				}

				const Type = this.Type;
				if( Type.*[genTrait] ) {
					return this::Type.*[genTrait]( ...args );
				}

				const traitVar = this.compiler.registerConstant( trait, `${traitName}Sym` );
				//return compiler.getSelf( Type ).*member( traitVar, true ).*call( ...args );
				return compilationFrame.self.*member( traitVar, true ).*call( ...args );
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


class Compiler extends language.Compiler {
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
		return this.typeArguments.*defaultGet( Type, ()=>new Map() );
	}
	// get a member variable for `Type`. very similar to `makeVarRelative`, but returns an object...
	// e.g. for `Array::Map::Filter`:
	//   getArg( Array::Map, 'mapFn' ) {
	//     name: `mapFn`,
	//     variable: AST::parse( 'this.wrapped.mapFn' ), // same as `makeVarRelative(Array::Map, 'mapFn')`
	//     fn: this.wrapped.mapFn
	getArg( Type, argKey ) {
		const typeArgs = this.getTypeArguments( Type );

		const arg = typeArgs.*defaultGet( argKey, ()=>({
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

		const arg = typeArgs.*defaultGet( '', ()=>({
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
			if( options.debug ) {
				console.log(`==========`);
				let {frame} = this;
				while( frame ) {
					frame.innerCalls.forEach( ic=>{
						console.log( `${frame.Type.name}: ${ic.generated ? `✔` : `❌❌❌`} ${ic.traitName}` );
					});
					frame = frame.inner;
				}
			}

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

module.exports = Compiler;

if( require.main === module ) {
	const compiler = new Compiler( Type, key, function(){
		// this.pushStatement( this.compiler.debug() );
		const result = this::factory();
		if( result ) {
			this.pushStatement( result.return() );
		}
	});
	console.log( compiler.compile() );
}
