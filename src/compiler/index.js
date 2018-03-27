
const assert = require('assert');
const Symbols = require('./es5def');
const createEnhancedGrammar = require('./enhance_symbol');
const createClasses = require('./create_classes');
const createCodegen = require('./codegen');
const createSemantics = require('./semantics');
// const escodegen = require('escodegen');

const grammar = createEnhancedGrammar( Symbols );
const builders = createClasses( grammar );
const codegen = createCodegen( grammar );
const semantics = createSemantics( grammar, builders );

function compile( ast ) {
	return codegen.compile( ast );
	/*
	return escodegen.generate( ast, {
		format: {
			indent: {
				style: `\t`
			}
		}
	});
	*/
}

class Compiler {
	constructor( ast ) {
		this.varDB = new semantics.VarDB();
		this.ast = ast;
	}

	createUniqueVariable( name ) {
		return this.varDB.createUniqueVariable( name );
	}

	toCode() {
		const ast = this.ast.id();
		return compile( ast );
	}
}

class ProgramCompiler extends Compiler {
	constructor() {
		super( new semantics.Program() );
		this.body = this.ast;
	}
}

class FunctionCompiler extends Compiler {
	constructor( name ) {
		super( new semantics.Program() );

		this.body = new semantics.Block();
		this.fn = semantics.function(name, [], this.body);
		this.ast.pushStatement( this.fn.return() )

		this.constants = new Map();
		this.parameters = [];
	}

	registerParameter( name ) {
		const variable = this.createUniqueVariable( name );
		this.parameters.push( variable );
		return variable;
	}
	registerConstant( value, name ) {
		if( this.constants.has(value) ) {
			return this.constants.get( value );
		}

		const variable = this.createUniqueVariable( name );
		this.constants.set( value, variable );
		return variable;
	}
	registerConstants( args ) {
		const result = {};
		for( let key in args ) {
			if( args.hasOwnProperty(key) ) {
				const variable = this.registerConstant( args[key], key );
				result[key] = variable;
			}
		}
		return result;
	}

	compile() {
		const constantIdentifiers = Array.from( this.constants.values() ).map( variable=>variable.name );
		const constantValues = Array.from( this.constants.keys() );

		this.fn.ast.params.push( ...this.parameters.map( variable=>variable.ast ) );

		const f = new Function(
			...constantIdentifiers,
			this.toCode()
		);

		return f.apply( null, constantValues );
	}
}


module.exports = {
	grammar,
	builders,
	semantics,
	codegen: compile,
	Compiler, ProgramCompiler, FunctionCompiler
};

if( require.main === module ) {
	Error.stackTraceLimit = Infinity;

	{
		const program = builders.Program([
			// builders.Literal(true), // this correctly fails
			// builders.VariableDeclaration( [builders.VariableDeclarator( builders.Identifier('a'), builders.Literal(5) )], 'const'),
			builders.VariableDeclaration( [builders.VariableDeclarator( builders.Identifier('a'), builders.Literal(5) )], 'var'),
			builders.ForStatement(
				// builders.VariableDeclaration( [builders.VariableDeclarator( builders.Identifier('i'), builders.Literal(0) )], 'let'),
				builders.VariableDeclaration( [builders.VariableDeclarator( builders.Identifier('i'), builders.Literal(0) )], 'var'),
				builders.BinaryExpression( '<', builders.Identifier('i'), builders.Literal(10) ),
				builders.UpdateExpression( '++', builders.Identifier('i'), true ),
				builders.EmptyStatement()
			)
		]);
		grammar.Program.check( program );
		console.log( compile(program) );
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
				semantics.this().member('len').assign( semantics.lit('...') ),
				semantics.lit('...')
			)),
			Iterator.member('prototype').member('next').assign(
				semantics.function( null, [], semantics.block(
					semantics.if(
						semantics.this().member( i ).ge( semantics.this().member(len) ),
						done.new().return()
					),
					value.declare( semantics.lit('...') ),
					kv.new( i.increment(), value ).return()
				))
			),
			semantics.function( null, [], semantics.block(
				Iterator.new().return()
			)).return()
		).id();
		grammar.Program.check( program );
		console.log( compile(program) );
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
		console.log( compile(program) );
		console.log();
	}

	{
		const program = new semantics.Program(
			semantics.lit(5).mul( semantics.lit(6).mod(3) ),
			semantics.lit(5).mul( 6 ).mod( 3 ),
			semantics.lit(5).mul( semantics.lit(6).mul(3) ),
		).id();

		grammar.Program.check( program );
		console.log( compile(program) );
		console.log();
	}

	// testing compilers
	{
		const compiler = new FunctionCompiler(`fun`);
		const three = compiler.registerConstant( 3, `three` );
		const x = compiler.registerParameter( `x` );
		compiler.body.pushStatement(
			semantics.id(`console`).member(`log`).call( three.mul(x) )
		);
		const fun = compiler.compile();

		console.log( fun.toString() );
		fun( 5 );
	}
}
