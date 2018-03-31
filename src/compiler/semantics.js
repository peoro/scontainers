
const assert = require('assert');

module.exports = function( grammar, builders ) {

	function ast( ) {
		if( this === null || this === undefined ) {
			return this;
		}

		if( this instanceof Statement || this instanceof Expression ) {
			return this.id();
		}

		if( this.type ) {
			return this;
		}

		switch( typeof this ) {
			case "boolean":
			case "number":
			// case "string":
				return new Literal(this).id();
		}

		if( this.hasOwnProperty('length') && this.map ) {
			return this.map( v=>v::ast() );
		}

		assert.fail( this, `No known way to get an AST out of \`${this}\`` );
	}

	function asStatement() {
		if( this instanceof Expression ) {
			return this.asStatement();
		}
		else if( this instanceof Statement ) {
			return this;
		}

		console.log( this );
		assert.fail( this );
	}

	class VarDB {
		constructor() {
			this.variables = new Map();
		}
		createVariable( name ) {
			assert( ! this.variables.has(name), `A variable ${name} already exist` );
			const variable = new Variable( name );
			this.variables.set( name, variable );
			return variable;
		}
		createUniqueVariable( varBaseName=`unnamedVar` ) {
			let counter = 0;
			let varName = `${varBaseName}`;
			while( this.variables.has(varName) ) {
				++ counter;
				varName = `${varBaseName}${counter}`;
			}

			return this.createVariable( varName );
		}
	}

	class Statement {
		constructor( ast ) {
			this.ast = ast;
		}

		id( ) {
			return this.ast;
		}

		label( label ) {
			return new Statement( builders.LabeledStatement(label, this.id()) );
		}
	}
	class If extends Statement {
		constructor( ast ) {
			super( ast );
		}

		elseIf( condition, then ) {
			assert( false, `TODO` );
		}
		else( then ) {
			assert( false, `TODO` );
		}
	}

	Statement.if = function( condition, then ) {
		return new If( builders.IfStatement( condition::ast(), then::asStatement()::ast() ) );
	}
	Statement.for = function( init, test, update, body ) {
		return new Statement( builders.ForStatement( init::ast(), test::ast(), update::ast(), body::asStatement()::ast() ) );
	}
	Statement.forIn = function( left, right, body ) {
		return new Statement( builders.ForInStatement( left::ast(), right::ast(), body::asStatement()::ast() ) );
	}
	Statement.while = function( test, body ) {
		return new Statement( builders.WhileStatement( test::ast(), body::asStatement()::ast() ) );
	}
	Statement.return = function( value ) {
		return new Statement( builders.ReturnStatement( value ? value::ast() : null ) );
	}

	class Scope extends Statement {
		constructor( ast, statements ) {
			super( ast );
			this.pushStatement( ...statements );
		}

		unshiftStatement( ...statements ) {
			const stats = statements.map( (stat)=>stat::asStatement()::ast() );
			stats.forEach( (statement)=>grammar.Statement.check(statement) );
			this.ast.body.unshift( ...stats );
		}
		pushStatement( ...statements ) {
			const stats = statements.map( (stat)=>stat::asStatement()::ast() );
			stats.forEach( (statement)=>grammar.Statement.check(statement) );
			this.ast.body.push( ...stats );
		}
	}

	class Program extends Scope {
		constructor( ...statements ) {
			super( builders.Program([]), statements );
		}
	}
	class Block extends Scope {
		constructor( ...statements ) {
			super( builders.BlockStatement([]), statements );
		}
	}


	class Expression {
		constructor( ast ) {
			this.ast = ast;
			grammar.Expression.check( ast );
		}

		id( ) {
			return this.ast;
		}
		asStatement() {
			return new Statement( builders.ExpressionStatement( this.id() ) );
		}

		// TODO: should this belong to array, object etc?
		member( key, computed=false ) {
			if( typeof key === 'string' ) {
				key = computed ? lit(key) : id(key);
			}

			return new Expression( builders.MemberExpression( this.id(), key::ast(), !!computed ) );
		}
		/*
		getMember( key ) {
			return this.member( key, true );
		}
		*/

		assign( value ) {
			return new Expression( builders.AssignmentExpression( '=', this::ast(), value::ast() ) );
		}

		call( ...args ) {
			args = args
				.map( arg=>arg === undefined ? id(`undefined`) : arg )
				.map( arg=>typeof arg === 'string' ? lit(arg) : arg );
			return new Expression( builders.CallExpression( this.id(), args::ast() ) );
		}
		new( ...args ) {
			args = args
				.map( arg=>arg === undefined ? id(`undefined`) : arg )
				.map( arg=>typeof arg === 'string' ? lit(arg) : arg );
			return new Expression( builders.NewExpression( this.id(), args::ast() ) );
		}
		return() {
			return Statement.return( this );
		}

		binaryExpression( op, arg ) {
			return new Expression( builders.BinaryExpression( op, this.id(), arg::ast() ) );
		}
		plus( arg ) { return this.binaryExpression( '+', arg ); }
		minus( arg ) { return this.binaryExpression( '-', arg ); }
		mul( arg ) { return this.binaryExpression( '*', arg ); }
		div( arg ) { return this.binaryExpression( '/', arg ); }
		mod( arg ) { return this.binaryExpression( '%', arg ); }
		gt( arg ) { return this.binaryExpression( '>', arg ); }
		ge( arg ) { return this.binaryExpression( '>=', arg ); }
		eq( arg ) { return this.binaryExpression( '===', arg ); }
		le( arg ) { return this.binaryExpression( '<=', arg ); }
		lt( arg ) { return this.binaryExpression( '<', arg ); }
		ne( arg ) { return this.binaryExpression( '!==', arg ); }
		logicalExpression( op, arg ) {
			return new Expression( builders.LogicalExpression( op, this.id(), arg::ast() ) );
		}
		and( arg ) { return this.logicalExpression( '&&', arg ); }
		or( arg ) { return this.logicalExpression( '||', arg ); }

		unaryExpression( op, prefix ) {
			return new Expression( builders.UnaryExpression( op, !!prefix, this.id() ) );
		}
		not( arg ) {
			return this.unaryExpression( '!', true );
		}
		asBool( arg ) {
			return this.not().not();
		}

		updateExpression( op, prefix ) {
			return new Expression( builders.UpdateExpression( op, this.id(), !!prefix ) );
		}
		increment() {
			return this.updateExpression('++');
		}
		decrement() {
			return this.updateExpression('--');
		}
	}

	class Literal extends Expression {
		constructor( value ) {
			super( builders.Literal(value) );
			this.value = value;
		}
	}
	function lit( value ) {
		return new Literal( value );
	}

	class Identifier extends Expression {
		constructor( name ) {
			super( builders.Identifier(name) );
			this.name = name; // TODO: get rid of this...
		}
	}
	function id( value ) {
		return new Identifier( value );
	}

	class Variable extends Expression {
		constructor( name ) {
			super( builders.Identifier(name) );
			this.name = name; // TODO: get rid of this...
		}

		declare( value, kind='var' ) {
			return new Statement( builders.VariableDeclaration( [ builders.VariableDeclarator( this.id(), value::ast() ) ], kind ) );
		}

		declareFunction( params, body ) {
			return Statement.function( this, params, body );
		}
	}

	class Array extends Expression {
		constructor( ...values ) {
			super( builders.ArrayExpression(values.map( v=>v::ast() )) );
		}
	}
	class Function extends Expression {
		constructor( id, params, body ) {
			super( builders.FunctionExpression(id::ast(), params::ast(), body::ast()) );
		}

		asStatement() {
			return Statement.function( this.ast.id, this.ast.params, this.ast.body );
		}
	}
	Expression.function = function( id, params, body ) {
		if( typeof id === 'string' ) {
			id = new Identifier(id);
		}
		return new Function( id, params, body );
	}
	Statement.function = function( id, params, body ) {
		if( typeof id === 'string' ) {
			id = new Identifier(id);
		}
		return new Statement( builders.FunctionDeclaration(id::ast(), params::ast(), body::ast()) );
	}

	return {
		ast,
		asStatement,

		VarDB,
		Statement,
		Program,
		Block,
		block( ...args ) { return new Block(...args); },
		if: Statement.if,
		for: Statement.for,
		forIn: Statement.forIn,
		while: Statement.while,
		return: Statement.return,
		function: Expression.function,
		Literal,
		Variable,
		lit, id,
		this() { return new Expression( builders.ThisExpression() ); },
		array( ...values ) { return new Array(...values); },
		continue() { return new Statement( builders.ContinueStatement() ); },
		and( ...values ) {
			assert( values.length >= 2 );

			let expr = values.pop();
			while( values.length ) {
				expr = expr.and( values.pop() );
			}
			return expr;
		},
		or( ...values ) {
			assert( values.length >= 2 );

			let expr = values.pop();
			while( values.length ) {
				expr = expr.or( values.pop() );
			}
			return expr;
		},
	};
}
