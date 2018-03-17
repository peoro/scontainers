
const assert = require('assert');
const Symbols = require('./es5def');
const createEnhancedGrammar = require('./enhance_symbol');
const createClasses = require('./create_classes');
const createCodegen = require('./codegen');
const createSemantics = require('./semantics');
const escodegen = require('escodegen');

const grammar = createEnhancedGrammar( Symbols );
const builders = createClasses( grammar );
const codegen = createCodegen( grammar );
const semantics = createSemantics( grammar, builders );

module.exports = {
	grammar,
	builders,
	semantics,
	// codegen(){ return codegen.compile.apply( codegen, arguments ); },
	codegen(){ return escodegen.generate.apply( escodegen, arguments ); },
};

if( require.main === module ) {
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

	{
		const program = new semantics.Program(
			semantics.lit(5).mul( semantics.lit(6).mod(3) ),
			semantics.lit(5).mul( 6 ).mod( 3 ),
			semantics.lit(5).mul( semantics.lit(6).mul(3) ),
		).id();

		grammar.Program.check( program );
		console.log( codegen.compile(program) );
		console.log();
	}
}
