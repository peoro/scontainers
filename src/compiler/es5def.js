
'use strict';

const assert = require('assert');

const Symbols = module.exports = {
	// base types
	string( grammar ) {
		return {
			name: `string`,
		};
	},
	boolean( grammar ) {
		return {
			name: `boolean`,
		};
	},
	null( grammar ) {
		return {
			name: `null`,
		};
	},
	number( grammar ) {
		return {
			name: `number`,
		};
	},
	RegExp( grammar ) {
		return {
			name: `RegExp`,
		};
	},

	// enums
	UnaryOperator( grammar ) {
		return {
			possibleValues: ["-", "+", "!", "~", "typeof", "void", "delete"],
			name: `UnaryOperator`,
		};
	},
	UpdateOperator( grammar ) {
		return {
			possibleValues: ["++", "--"],
			name: `UpdateOperator`,
		};
	},
	BinaryOperator( grammar ) {
		return {
			possibleValues: ["==", "!=", "===", "!==", "<", "<=", ">", ">=", "<<", ">>", ">>>", "+", "-", "*", "/", "%", "|", "^", "&", "in", "instanceof"],
			name: `BinaryOperator`,
		};
	},
	AssignmentOperator( grammar ) {
		return {
			possibleValues: ["=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", ">>>=", "|=", "^=", "&="],
			name: `AssignmentOperator`,
		};
	},
	LogicalOperator( grammar ) {
		return {
			possibleValues: ["||", "&&"],
			name: `LogicalOperator`,
		};
	},

	// nodes
	Node( grammar ) {
		return {
			fields: {
				type: [grammar.string],
			},
			name: `Node`
		};
	},
	Pattern( grammar ) {
		return {
			bases: [grammar.Node],
			name: "Pattern",
		};
	},
	Statement( grammar ) {
		return {
			bases: [grammar.Node],
			name: "Statement",
		};
	},
	Expression( grammar ) {
		return {
			bases: [grammar.Node],
			name: "Expression",
		};
	},
	ExpressionStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "ExpressionStatement" ],
				expression: [grammar.Expression],
			},
			name: "ExpressionStatement",
		};
	},
	BlockStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "BlockStatement" ],
				body: [ [grammar.Statement] ],
			},
			name: "BlockStatement",
		};
	},
	Declaration( grammar ) {
		return {
			bases: [grammar.Statement],
			name: "Declaration",
		};
	},
	Identifier( grammar ) {
		return {
			bases: [grammar.Expression, grammar.Pattern],
			fields: {
				type: [ "Identifier" ],
				name: [grammar.string],
			},
			name: "Identifier",
		};
	},
	Function( grammar ) {
		return {
			bases: [grammar.Node],
			fields: {
				id: [ grammar.Identifier, grammar.null ],
				params: [ [grammar.Pattern] ],
				body: [grammar.BlockStatement],
			},
			name: "Function",
		};
	},
	FunctionDeclaration( grammar ) {
		return {
			bases: [grammar.Function, grammar.Declaration],
			fields: {
				type: [ "FunctionDeclaration" ],
				id: [ grammar.Identifier ],
			},
			name: "FunctionDeclaration",
		};
	},
	VariableDeclarator( grammar ) {
		return {
			bases: [grammar.Node],
			fields: {
				type: [ "VariableDeclarator" ],
				id: [ grammar.Pattern ],
				init: [ grammar.Expression, grammar.null ],
			},
			name: "VariableDeclarator",
		};
	},
	VariableDeclaration( grammar ) {
		return {
			bases: [grammar.Declaration],
			fields: {
				type: [ "VariableDeclaration" ],
				declarations: [ [grammar.VariableDeclarator] ],
				kind: [ "var" ],
			},
			name: "VariableDeclaration",
		};
	},
	Program( grammar ) {
		return {
			bases: [grammar.Node],
			fields: {
				type: [ "Program" ],
				body: [ [grammar.Statement] ],
			},
			name: "Program",
		};
	},
	EmptyStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "EmptyStatement" ],
			},
			name: "EmptyStatement",
		};
	},
	DebuggerStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "DebuggerStatement" ],
			},
			name: "DebuggerStatement",
		};
	},
	WithStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "WithStatement" ],
				object: [grammar.Expression],
				body: [grammar.Statement],
			},
			name: "WithStatement",
		};
	},
	ReturnStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "ReturnStatement" ],
				argument: [ grammar.Expression, grammar.null ],
			},
			name: "ReturnStatement",
		};
	},
	LabeledStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "LabeledStatement" ],
				label: [grammar.Identifier],
				body: [grammar.Statement],
			},
			name: "LabeledStatement",
		};
	},
	BreakStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "BreakStatement" ],
				label: [ grammar.Identifier, grammar.null ],
			},
			name: "BreakStatement",
		};
	},
	ContinueStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "ContinueStatement" ],
				label: [ grammar.Identifier, grammar.null ],
			},
			name: "ContinueStatement",
		};
	},
	IfStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "IfStatement" ],
				test: [grammar.Expression],
				consequent: [grammar.Statement],
				alternate: [ grammar.Statement, grammar.null ],
			},
			name: "IfStatement",
		};
	},
	SwitchCase( grammar ) {
		return {
			bases: [grammar.Node],
			fields: {
				type: [ "SwitchCase" ],
				test: [ grammar.Expression, grammar.null ],
				consequent: [ [grammar.Statement] ],
			},
			name: "SwitchCase",
		};
	},
	SwitchStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "SwitchStatement" ],
				discriminant: [grammar.Expression],
				cases: [ [grammar.SwitchCase] ],
			},
			name: "SwitchStatement",
		};
	},
	ThrowStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "ThrowStatement" ],
				argument: [grammar.Expression],
			},
			name: "ThrowStatement",
		};
	},
	CatchClause( grammar ) {
		return {
			bases: [grammar.Node],
			fields: {
				type: [ "CatchClause" ],
				param: [grammar.Pattern],
				body: [grammar.BlockStatement],
			},
			name: "CatchClause",
		};
	},
	TryStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "TryStatement" ],
				block: [ grammar.BlockStatement ],
				handler: [ grammar.CatchClause, grammar.null ],
				finalizer: [ grammar.BlockStatement, grammar.null ],
			},
			name: "TryStatement",
		};
	},
	WhileStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "WhileStatement" ],
				test: [grammar.Expression],
				body: [grammar.Statement],
			},
			name: "WhileStatement",
		};
	},
	DoWhileStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "DoWhileStatement" ],
				body: [grammar.Statement],
				test: [grammar.Expression],
			},
			name: "DoWhileStatement",
		};
	},
	ForStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "ForStatement" ],
				init: [ grammar.VariableDeclaration, grammar.Expression, grammar.null ],
				test: [ grammar.Expression, grammar.null ],
				update: [ grammar.Expression, grammar.null ],
				body: [grammar.Statement],
			},
			name: "ForStatement",
		};
	},
	ForInStatement( grammar ) {
		return {
			bases: [grammar.Statement],
			fields: {
				type: [ "ForInStatement" ],
				left: [ grammar.VariableDeclaration, grammar.Pattern ],
				right: [grammar.Expression],
				body: [grammar.Statement],
			},
			name: "ForInStatement",
		};
	},
	Literal( grammar ) {
		return {
			bases: [grammar.Expression],
			fields: {
				type: [ "Literal" ],
				value: [ grammar.string, grammar.boolean, grammar.null, grammar.number, grammar.RegExp ],
			},
			name: "Literal",
		};
	},
	ThisExpression( grammar ) {
		return {
			bases: [grammar.Expression],
			fields: {
				type: [ "ThisExpression" ],
			},
			name: "ThisExpression",
		};
	},
	ArrayExpression( grammar ) {
		return {
			bases: [grammar.Expression],
			fields: {
				type: [ "ArrayExpression" ],
				elements: [ [ grammar.Expression, grammar.null ] ],
			},
			name: "ArrayExpression",
		};
	},
	Property( grammar ) {
		return {
			bases: [grammar.Node],
			fields: {
				type: [ "Property" ],
				key: [ grammar.Literal, grammar.Identifier ],
				value: [grammar.Expression],
				kind: [ "init", "get", "set" ],
			},
			name: "Property",
		};
	},
	ObjectExpression( grammar ) {
		return {
			bases: [grammar.Expression],
			fields: {
				type: [ "ObjectExpression" ],
				properties: [ [grammar.Property] ],
			},
			name: "ObjectExpression",
		};
	},
	FunctionExpression( grammar ) {
		return {
			bases: [grammar.Function, grammar.Expression],
			fields: {
				type: [ "FunctionExpression" ],
			},
			name: "FunctionExpression",
		};
	},
	UnaryExpression( grammar ) {
		return {
			bases: [grammar.Expression],
			fields: {
				type: [ "UnaryExpression" ],
				operator: [grammar.UnaryOperator],
				prefix: [grammar.boolean],
				argument: [grammar.Expression],
			},
			name: "UnaryExpression",
		};
	},
	UpdateExpression( grammar ) {
		return {
			bases: [grammar.Expression],
			fields: {
				type: [ "UpdateExpression" ],
				operator: [grammar.UpdateOperator],
				argument: [grammar.Expression],
				prefix: [grammar.boolean],
			},
			name: "UpdateExpression",
		};
	},
	BinaryExpression( grammar ) {
		return {
			bases: [grammar.Expression],
			fields: {
				type: [ "BinaryExpression" ],
				operator: [grammar.BinaryOperator],
				left: [grammar.Expression],
				right: [grammar.Expression],
			},
			name: "BinaryExpression",
		};
	},
	AssignmentExpression( grammar ) {
		return {
			bases: [grammar.Expression],
			fields: {
				type: [ "AssignmentExpression" ],
				operator: [grammar.AssignmentOperator],
				left: [ grammar.Pattern, grammar.Expression ],
				right: [grammar.Expression],
			},
			name: "AssignmentExpression",
		};
	},
	LogicalExpression( grammar ) {
		return {
			bases: [grammar.Expression],
			fields: {
				type: [ "LogicalExpression" ],
				operator: [grammar.LogicalOperator],
				left: [grammar.Expression],
				right: [grammar.Expression],
			},
			name: "LogicalExpression",
		};
	},
	MemberExpression( grammar ) {
		return {
			bases: [grammar.Expression, grammar.Pattern],
			fields: {
				type: [ "MemberExpression" ],
				object: [grammar.Expression],
				property: [grammar.Expression],
				computed: [grammar.boolean],
			},
			name: "MemberExpression",
		};
	},
	ConditionalExpression( grammar ) {
		return {
			bases: [grammar.Expression],
			fields: {
				type: [ "ConditionalExpression" ],
				test: [grammar.Expression],
				alternate: [grammar.Expression],
				consequent: [grammar.Expression],
			},
			name: "ConditionalExpression",
		};
	},
	CallExpression( grammar ) {
		return {
			bases: [grammar.Expression],
			fields: {
				type: [ "CallExpression" ],
				callee: [grammar.Expression],
				arguments: [ [grammar.Expression] ],
			},
			name: "CallExpression",
		};
	},
	NewExpression( grammar ) {
		return {
			bases: [grammar.Expression],
			fields: {
				type: [ "NewExpression" ],
				callee: [grammar.Expression],
				arguments: [ [grammar.Expression] ],
			},
			name: "NewExpression",
		};
	},
	SequenceExpression( grammar ) {
		return {
			bases: [grammar.Expression],
			fields: {
				type: [ "SequenceExpression" ],
				expressions: [ [grammar.Expression] ],
			},
			name: "SequenceExpression",
		};
	},
};
