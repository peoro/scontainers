
'use strict';

const assert = require('assert');

function enhanceSymbol( symbol, symbolKey, symbols ) {

	// pretty print short
	function pps( value ) { // nodeFieldToString
		const grammar = symbols;
		if( Array.isArray(value) ) {
			if( value.length === 0 ) {
				return `[]`;
			}
			else {
				return `[x${value.length}]`;
			}
		}
		else if( value && typeof value === 'object' ) {
			if( value.type ) {
				return `${value.type}{…}`;
			}
			return `{…}`;
		}
		return `${value}`;
	};

	// pretty print short, but less short than above D:
	function pps2( value ) { // nodeFieldToString
		const grammar = symbols;
		if( Array.isArray(value) ) {
			if( value.length === 0 ) {
				return `[]`;
			}
			else if( value.length === 1 ) {
				return `[${ pp(value[0]) }]`;
			}
			else {
				return `[${ value.map(pps) }]`;
			}
		}
		else if( value && value.type ) {
			return pp( value );
		}
		return pps( value );
	};

	// pretty print node
	// it prints all the fields (but `type`)
	// a short version of the subnodes is printed
	function pp( node ) { // nodeToString
		const grammar = symbols;
		if( ! node ) {
			return `${node}{✘ not a node}`;
		}
		else if( ! node.type ) {
			return `TypelessNode{✘ not a node}`;
		}

		const symbol = grammar[ node.type ];
		if( ! symbol ) {
			return `${node.type}{✘ unknown type}`;
		}

		const fields = Object.keys( symbol.fields )
			.filter( (field)=>field !== 'type' )
			.map( (field)=>{
				if( node[field] === undefined ) {
					return field.split('').map( (c)=>`${c}̶` ).join('');
				}
				return `${field}:${pps(node[field])}`;
			});

		return `${node.type}{${fields.join(` `)}}`;
	};
	// pretty print anything D:
	function pt( value ) {
		if( Array.isArray(value) ) {
			return `[${ value.map(pt).join(`,`) }]`
		}
		return value.toString();
	}


	function check( test, errorMsg ) {
		if( ! test ) {
			throw new Error(errorMsg);
		}
	}
	function checkType( test ) {
		return function( obj ) {
			const errorMessage = `${pp(obj)} is not a ${this}`;
			if( ! addDetailsToError( ()=>test(obj), errorMessage ) ) {
				throw new Error( errorMessage );
			}
		};
	}
	function checkEnum( obj ) {
		return function( obj ) {
			checkOneOf( obj, this.possibleValues, `${pp(obj)} is not a ${this}`);
		};
	}
	function checkOneOf( value, values, errorMsg ) {
		const errs = [];

		const satisfied = values.some( (val, i)=>{
			try {
				if( ! val ) {
					// throw new Error(`${errorMsg} - unresolved [${i}]th type`);
					throw new Error(`unresolved [${i}]th type (this means that the grammar is broken!)`);
				}
				else if( val.check ) {
					// addDetailsToError( ()=>val.check(value), errorMsg );
					val.check( value );
				}
				else if( Array.isArray(val) && Array.isArray(value) ) {
					value.forEach( (v, i)=>{
						// prefixError( ()=>checkOneOf(v, val, errorMsg), `[${i}] of ` );
						checkOneOf( v, val, `[${i}]: ${pps2(v)}` );
					});
				}
				else if( val !== value ) {
					// throw new Error(errorMsg);
					throw new Error(`${pps(value)} !== ${val}`);
				}

				return true;
			}
			catch( err ) {
				errs.push( ...err.message.split(`\n`) );
				return false;
			}
		});

		if( ! satisfied ) {
			// throw new Error( `${errorMsg}\n\t${value} is not one of ${values.join(`, `)}` );
			throw new Error( `${errorMsg}\n\t${pps2(value)} is not one of ${values.map(pt).join(`, `)}\n${ errs.map( (err)=>`\t\t${err}` ).join(`\n`) }` );
		}
	}
	const checks = {
		string:	checkType( (obj)=>(typeof obj === 'string') ),
		boolean:	checkType( (obj)=>(obj === true || obj === false) ),
		null:	checkType( (obj)=>(obj === undefined || obj === null) ),
		number:	checkType( (obj)=>(Number.isNaN(obj) || ! Number.isNaN(Number.parseFloat(obj))) ),
		RegExp:	checkType( (obj)=>(obj && checkOneOf(obj.source, [grammar.string], `source field missing`) && checkOneOf(obj.flags, [grammar.string], `flags field missing`)) ),

		UnaryOperator:	checkEnum,
		UpdateOperator:	checkEnum,
		BinaryOperator:	checkEnum,
		AssignmentOperator:	checkEnum,
		LogicalOperator:	checkEnum,

		VariableDeclaration( obj ) {
			assert( obj.declarations.length > 0, `At least one declaration must be set in ${pp(obj)}.declarations.` );
		},
		TryStatement( obj ) {
			assert( obj.handler || obj.finalizer, `At least one between ${pp(obj)}.handler or .finalizer must be set.` );
		},
	};
	function modifyError( code, fn ) {
		try {
			return code();
		}
		catch( err ) {
			// captureStackTrace( ()=>{throw new Error( fn(err.message) );}, arguments.callee );
			err.message = fn( err.message );
			err.stack = err.message + `\n` + err.stack.split(`\n`).filter( (line)=>line.match(/\s+at/) ).join(`\n`);
			throw err;
		}
	};
	function prefixError( code, prefix ) {
		return modifyError( code, (error)=>`${prefix}${error}` );
	};
	function addDetailsToError( code, details ) {
		return modifyError( code, (error)=>`${details}:\n${error}`.replace(/\n/g, `\n\t`) );
	};

	function symbolToString() {
		return this.name;
	}



	// adding missing fileds
	{
		symbol.bases = symbol.bases || [];
		symbol.hierarchy = {};
		symbol.children = [];
		symbol.descendants = {};
		symbol.fields = symbol.fields || {};
	}

	// adding `toString`
	{
		symbol.toString = symbolToString;
	}

	// making sure that the symbol is OK
	{
		assert( symbol.name, `Symbol ${symbolKey} is missing its name` );

		symbol.bases.forEach( (base, i)=>{
			assert( base, `${symbol}.bases[${i}] is missing` );
			assert( symbols[base.name] === base, `${symbol}.bases[${i}] (=${base}) is not a registered symbol` );
		});

		Object.keys(symbol.fields).forEach( (field)=>{
			const allowedValues = symbol.fields[field];
			allowedValues.forEach( (value, i)=>{
				assert( value, `${symbol}.fields.${field}[${i}] is missing` );

				if( Array.isArray(value) ) {
					assert( value.length >= 1, `${symbol}.fields.${field}[${i}] is malformed (it shouldn't be empty)` );
					value.forEach( (value, j)=>{
						assert( value, `${symbol}.fields.${field}[${i}][${j}] is missing` );
					});
				}
			});
		});
	}

	// adding hierarchy
	{
		symbol.hierarchy[symbol.name] = symbol;
		symbol.bases.forEach( (base)=>{
			Object.assign( symbol.hierarchy, base.hierarchy );
		});
	}

	// adding children and descendants to base classes
	{
		symbol.bases.forEach( (base)=>{
			base.children.push( symbol );
		});
		Object.values( symbol.hierarchy ).forEach( (ancestor)=>{
			ancestor.descendants[ symbolKey ] = symbol;
		});
	}

	// adding a function to check instances of this symbol
	symbol.flatCheck = function( obj ) {
		// every field (of every type in the chain) must be satisfied
		Object.keys( this.fields ).forEach( (key)=>{
			checkOneOf( obj[key], this.fields[key], `${pp(obj)}.${key} (=${pps(obj[key])}) not matching ${this}'s requirements`);
		});

		// checks in `checks` must work
		if( checks[this.name] ) {
			checks[this.name].call( this, obj );
		}

		// if it has a `type` field, this symbol needs to be in the hierarchy of that symbol
		if( obj && obj.type ) {
			const symbol = symbols[obj.type];
			assert( symbol, `${pp(obj)}.type (=${obj.type}) is not a valid symbol: ${Object.keys(symbols).join(`, `)}` );
			assert( symbol.hierarchy[this.name], `${pp(obj)} is not a ${this}; it's a ${Object.keys(symbol.hierarchy).join(`+`)}` );
		}
	};
	symbol.check = function( obj ) {
		Object.values( this.hierarchy ).forEach( (symbol, i)=>{
			addDetailsToError( ()=>symbol.flatCheck( obj ), `${pp(obj)} not a valid ${this}` );
		});
	};

	return symbol;
};

module.exports = function createEnhancedGrammar( def ) {
	const grammar = {};

	Object.keys( def ).forEach( (sym)=>{
		const symbol = def[sym]( grammar );
		grammar[sym] = enhanceSymbol( symbol, sym, grammar );
	});

	return grammar;
};
