
const Node = {
	unhandled: Symbol(),
	match( node, obj ) {
		const type = node.type;
		if( obj[type] ) {
			return obj[type]();
		}
		else {
			return obj[ Node.unhandled ]( node, key );
		}
	}
};

function isString( value ) {
	return typeof value === 'string';
}

function log() {
	console.log.call( console, Array(log.ind).fill(' ').join(''), ...arguments );
}
log.ind = 0;

const Compiler = module.exports = function( grammar ) {
	const Compiler = {
		match( node, pattern ) {
			return Node.match( node, pattern );
		},

		compile( obj, opts ) {
			opts = opts || {};
			const sep = opts.sep || ``;
			const indent = opts.indent || ``;

			// console.log( `ugh`, obj );
			let str;

			if( obj === undefined || obj === null ) {
				// console.log( new Error(`undefined obj`) );
				str = ``;
			}
			else if( obj instanceof RegExp ) {
				str = `/${obj.source}/${obj.flags}`;
			}
			else if( obj.type ) {
				str = this.compileESNode(obj);
			}
			else if( Array.isArray(obj) ) {
				str = obj.map( (val)=>this.compile(val) ).join( sep );
			}
			else {
				str = obj.toString();
			}

			// console.log(`Unrecognized token`, obj);
			// throw new Error(`Unrecognized ${obj}`);
			if( indent ) {
				str = str.split(`\n`).map( (line)=>`${indent}${line}` ).join(`\n`);
			}

			return str;
		},

		compileESNode( node, opts ) {
			opts = opts || {};

			const compile = (args, opts)=>this.compile(args, opts);
			const comma = (...args)=>compile( args, {sep:`, `} );
			const semicolon = (...args)=>compile( args, {sep:`; `} );
			const colon = (...args)=>compile( args, {sep:`: `} );
			const space = (...args)=>compile( args, {sep:` `} );
			const newLine = (...args)=>compile( args, {sep:`\n`} );
			const indent = (...args)=>compile( args, {indent:`\t`} );
			const stmt = (...args)=>compile( [ ...args, (opts.semicolon || `;`) ] );
			const asExpr = (arg)=>this.compileESNode( arg, {semicolon:``} );

			return this.compile( Compiler.match( node, {
				Identifier()	{ return node.name; },
				Literal()	{ return isString(node.value) ? `'${node.value}'` : node.value; },
				Program()	{ return newLine(...node.body); },
				ExpressionStatement()	{ return stmt(node.expression); },
				BlockStatement() {
					return newLine(
						`{`,
						compile( node.body, {indent:`\t`, sep:`\n`} ),
						`}`
					);
				},
				EmptyStatement()	{ return stmt() },
				WithStatement() {
					return space(
						[`with(`, node.object, `)`],
						node.body
					);
				},
				ReturnStatement()	{ return stmt(`return `, node.argument); },
				LabeledStatement()	{ return [node.label, `:`, node.body]; },
				BreakStatement() {
					return node.label ? stmt(`break `, node.label) : stmt(`break`);
				},
				ContinueStatement() {
					return node.label ? stmt(`continue `, node.label) : stmt(`continue`);
				},
				IfStatement() {
					const ifCode = space(
						[`if(`, node.test, `)`],
						node.consequent
					);

					if( node.alternate ) {
						return newLine(
							ifCode,
							[`else `, node.alternate]
						);
					}
					return ifCode;
				},
				SwitchStatement() {
					return newLine(
						space([`switch(`, node.discriminant, `)`], `{`),
						indent( node.cases )
						`}`
					);
				},
				SwitchCase()	{ return [`case `, node.test, `:`, node.consequent]; },
				ThrowStatement()	{ return stmt(`throw `, node.argument); },
				TryStatement() {
					const code = [
						[`try `, node.block]
					];

					if( node.handler ) {
						code.push( node.handler );
					}
					if( node.finalizer ) {
						code.push( [`finally `, node.finalizer] );
					}

					return newLine( code );
				},
				CatchClause() {
					return space(
						[`catch(`, node.param, `)`],
						node.body
					);
				},
				WhileStatement() {
					return space(
						[`while(`, node.test, `)`],
						node.body
					);
				},
				DoWhileStatement() {
					return newLine(
						[`do `, node.body],
						[`while(`, node.test`)`]
					);
				},
				ForStatement() {
					return space(
						[`for(`, semicolon( asExpr(node.init), node.test, node.update), `)`],
						node.body
					);
				},
				ForInStatement() {
					return space(
						`for(`, asExpr(node.left), ` in `, node.right, `)`,
						node.body
					);
				},
				FunctionDeclaration() {
					return space(
						[`function `, node.id, `(`, comma(...node.params), `)`],
						node.body
					);
				},
				VariableDeclaration()	{ return [node.kind, ` `, comma(...node.declarations)]; },
				VariableDeclarator()	{ return node.init ? [node.id, `=`, node.init] : node.id; },
				ThisExpression()	{ return `this`; },
				ArrayExpression()	{ return [`[`, comma(...node.elements), `]`]; },
				ObjectExpression()	{ return newLine(`{`, comma(...node.properties), `}`); },
				Property() {
					switch( node.kind ) {
						case 'init':	return colon(node.key, node.value);
						case 'set':	return [`set `, node.key, node.value];
						case 'set':	return [`set `, node.key, node.value];
						default: console.log(`Unhandled property kind ${node.kind}`, node);
					}
				},
				FunctionExpression() {
					const code = [`function`];
					if( node.id ) {
						code.push( ` `, node.id );
					}
					code.push( `(`, comma(...node.params), `)` );
					code.push( node.body );

					return code;
				},
				UnaryExpression()	{ return node.prefix ? [node.operator, node.argument] : [node.argument, node.operator]; },
				UpdateExpression()	{ return node.prefix ? [node.operator, node.argument] : [node.argument, node.operator]; },
				BinaryExpression()	{ return [node.left, node.operator, node.right]; },
				AssignmentExpression()	{ return [node.left, node.operator, node.right]; },
				LogicalExpression()	{ return [node.left, node.operator, node.right]; },
				MemberExpression() {
					if( node.computed ) {
						return [node.object, `[`, node.property, `]`];
					} else {
						return [node.object, `.`, node.property.value || node.property];
					}
				},
				ConditionalExpression()	{ return [node.test, `?`, node.consequent, `:`, node.alternate]; },
				CallExpression()	{ return [node.callee, `(`, comma(...node.arguments), `)`]; },
				NewExpression()	{ return [space(`new`, node.callee), `(`, comma(...node.arguments), `)`]; },
				SequenceExpression()	{ return comma(...node.expressions); },
				[Node.unhandled]( unused, t ) {
					console.error(`Unhandled ESTree node ${t}:`, node);
				}
			}) );
		}
	};

	return Compiler;
};
