
const assert = require('assert');
const Symbols = require('./es5def');
const createEnhancedGrammar = require('./enhance_symbol');
const createClasses = require('./create_classes');
const createCodegen = require('./codegen');
const createSemantics = require('./semantics');
// const escodegen = require('escodegen');

const {ownProperties, map, collect, reverse, flatten, reduce, forAny} = require('../symbols.js');

const grammar = createEnhancedGrammar( Symbols );
const builders = createClasses( grammar );
const codegen = createCodegen( grammar );
const semantics = createSemantics( grammar, builders );

class Compiler {
	constructor() {
		this.varDB = new semantics.VarDB();
		this.argumentVariables = [];
		// this.argumentGenerators = [];
		this.argumentHierarchy = [];
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
	/*
	registerArgumentVariables( args ) {
		return args[ownProperties]()
			[map]( (generator, name)=>{
				const variable = this.createUniqueVariable( name );
				this.argumentVariables.push( variable );
				this.argumentGenerators.push( generator );
				return variable;
			})
			[collect]( Object );
	}
	*/
	pushArgumentsToHierarchy( args ) {
		this.argumentHierarchy.push(
			args[ownProperties]()
				[collect]( Array )
		);

		return args[ownProperties]()
			[map]( (generator, name)=>{
				const variable = this.createUniqueVariable( name );
				this.argumentVariables.push( variable );
				return variable;
			})
			[collect]( Object );
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

		/*
		const newArgs = args[ownProperties]()
			[map]( x=>(()=>x) )
			[collect]( Object );

		return this.registerArgumentVariables( newArgs );
		*/
	}
	/*
	cretaeArgumentVariable( name ) {
		const variable = this.varDB.createUniqueVariable( name );
		this.argumentVariables.push( variable );
		return variable;
	}
	*/
	createUniqueVariable( name ) {
		return this.varDB.createUniqueVariable( name );
	}
	getGlobalVariable( name ) {
		return new semantics.Variable( name );
	}

	toCode() {
		const ast = this.code.id();
		return codegen.compile( ast );
	}

	toFunction() {
		const f = new Function(
			...this.argumentVariables.map( (v)=>v.name ),
			...this.parameters.map( (v)=>v.name ),
			this.toCode().split('\n').map( line=>`\t${line}`).join('\n')
		);

		console.log( f.toString() );

		return this::Compiler.bindFunction( f );
	}
	toFunctionFactory() {
		const f = new Function(
			...this.argumentVariables.map( (v)=>v.name ),
			...this.parameters.map( (v)=>v.name ),
			this.toCode().split('\n').map( line=>`\t${line}`).join('\n')
		);

		console.log( f.toString() );

		return this::Compiler.bindFunction( f() );
	}

	static bindFunction( f ) {
		// const argumentGenerators = this.argumentGenerators;
		const argumentHierarchy = this.argumentHierarchy;
		const constants = this.constants;

		const boundFunction = function() {
			// pushing collection's arguments
			function getArgs( n=argumentHierarchy.length-1 ) {
				if( n < 0 ) {
					return [];
				}

				const args = this.wrapped::getArgs( n-1 );

				// console.log( `GETTING ARGS for`, this.toString(), argumentHierarchy[n] );
				argumentHierarchy[n].forEach( (fn)=>{
					// console.log( `               `, this::fn() );
					args.push( this::fn() ); // TODO: find a way to `push` D:
				});
				return args;
			}
			const args = this::getArgs();

			// pushing constants...
			const constArgs = constants.keys();

			const allArgs = [].concat( args, Array.from(constArgs) );

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

module.exports = {
	Compiler,
	grammar, builders, codegen, semantics
}

if( require.main === module ) {
	{
		const program = builders.Program([
			// builders.Literal(true), // this correctly fails
			// builders.VariableDeclaration( [builders.VariableDeclarator( builders.Identifier('a'), builders.Literal(5) )], 'const'),
			builders.VariableDeclaration( [builders.VariableDeclarator( builders.Identifier('a'), builders.Literal(5) )], 'var'),
			builders.ForStatement(
				// builders.VariableDeclaration( [builders.VariableDeclarator( builders.Identifier('i'), builders.Literal(0) )], 'let'),
				builders.VariableDeclaration( [builders.VariableDeclarator( builders.Identifier('i'), builders.Literal(0) )], 'var'),
				builders.LogicalExpression( '<', builders.Identifier('i'), builders.Literal(10) ),
				builders.UpdateExpression( '++', builders.Identifier('i'), true ),
				builders.EmptyStatement()
			)
		]);
		grammar.Program.check( program );
		console.log( codegen.compile(program) );
		console.log();
	}
	{
		const varDB = new semantics.VarDB();

		const kv = varDB.createUniqueVariable( `kv` );
		const done = varDB.createUniqueVariable( `done` );
		const Iterator = varDB.createUniqueVariable( `Iterator` );
		const i = varDB.createUniqueVariable( `i` );
		const len = varDB.createUniqueVariable( `len` );
		const key = varDB.createUniqueVariable( `key` );
		const value = varDB.createUniqueVariable( `value` );

		const program = new semantics.Program(
			kv.declareFunction( [key, value], semantics.block(
				semantics.this().member('value').assign( semantics.array(key, value) ),
			)),
			done.declareFunction( [], semantics.block(
				semantics.this().member('done').assign( true ),
			)),
			Iterator.declareFunction( [], semantics.block(
				semantics.this().member('i').assign( 0 ),
				semantics.this().member('len').assign( '...' ),
				semantics.lit('...')
			)),
			Iterator.member('prototype').member('next').assign(
				semantics.function( null, [], semantics.block(
					semantics.if(
						semantics.this().member( i ).ge( semantics.this().member(len) ),
						done.new().return()
					),
					value.declare('...'),
					kv.new( i.increment(), value ).return()
				))
			),
			semantics.function( null, [], semantics.block(
				Iterator.new().return()
			)).return()
		).id();
		grammar.Program.check( program );
		console.log( codegen.compile(program) );
		console.log();
	}
	{
		const varDB = new semantics.VarDB();

		const vars = {
			array: `arr`,
			value: `v`,
			filter: `f`,
			map: `m`,
			reduce: `r`,
			reduceInitialState: `rInitState`,

			counter: `k`,
			state: `rState`,
			mapValue: `v`
		};
		Object.keys( vars ).forEach( (k)=>{
			vars[k] = varDB.createUniqueVariable( vars[k] );
		});

		const program = new semantics.Program(
			// arrayVar.declare(),
			vars.state.declare( vars.reduceInitialState ),
			semantics.for(
				vars.counter.declare( 0 ),
				vars.counter.lt( vars.array.member('length') ),
				vars.counter.increment(),

				new semantics.Block(
					vars.value.declare( vars.array.member(vars.counter, true) ),

					semantics.lit(`filter`),
					semantics.if(
						vars.filter.call( vars.value, vars.counter ).not(),
						semantics.continue()
					),

					semantics.lit(`map`),
					vars.mapValue.declare( vars.map.call(vars.value, vars.counter) ),

					semantics.lit(`reduce`),
					vars.state.assign( vars.reduce.call(vars.state, vars.mapValue, vars.counter) ),
				)
			),
			vars.state.return()
		).id();

		grammar.Program.check( program );
		console.log( codegen.compile(program) );
		console.log();
	}
}
