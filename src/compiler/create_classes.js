
'use strict';

const assert = require('assert');

function nodeFieldToString( value ) {
	if( Array.isArray(value) ) {
		if( value.length === 0 ) {
			return `[]`;
		}
		else {
			return `[x${value.length}]`;
		}
		/*
		else if( value.length === 1 ) {
			return `[${ nodeFieldToString(value[0]) }]`;
		}
		else {
			return `[...; ${value.length}]`;
		}
		*/
	}
	else if( typeof value === 'object' ) {
		if( value.type ) {
			return `${value.type}{}`;
		}
		return `{...}`;
	}
	return `${value}`;
}

function nodeToString( grammar, node, expectedType ) {
	if( ! node.type ) {
		return `UnknownNodeMissingType(✘ broken)`;
	}

	const symbol = grammar[ node.type ];
	if( ! symbol ) {
		return `${node.type}(✘ broken)`;
	}

	const fields = Object.keys( symbol.fields )
		.filter( (field)=>field !== 'type' )
		.map( (field)=>`${field}:${nodeFieldToString(node[field])}` );
	const warning = node.type === expectedType ? `` : `; should have been ${expectedType}`;
	return `${node.type}{${fields.join(` `)}${warning}}`;
};

// getting all the fields required by any symbol in `symbol`s hierarchy
function getFields( symbol ) {
	const fields = {};

	Object.values( symbol.hierarchy ).forEach( (symbol)=>{
		Object.keys( symbol.fields ).forEach( (key)=>{
			fields[ key ] = true;
		});
	});

	return fields;
};

module.exports = function createBuilders( grammar ) {
	const builders = {};

	Object.keys( grammar ).forEach( (sym)=>{
		const symbol = grammar[sym];

		// we're only creating classes for ESTree leaves
		if( symbol.hierarchy.Node ) {
			const fields = getFields( symbol );
			{
				assert( fields.type, `${symbol}.fields.type is missing. The only available fields are: [${Object.keys(fields)}]` );
				delete fields.type;
			}
			const fieldArray = Object.keys(fields);

			// a function that takes all the hierarchy's parameters and returns an instantiated Node
			const builder = new Function( ...fieldArray, `return { type: "${sym}", ${fieldArray.join(`, `)} };`);
			builders[sym] = function() {
				const obj = builder.apply(this, arguments);
				grammar[sym].check( obj );
				return obj;
			};
		}
		else {
			return function( value ) {
				grammar[sym].check( value );
				return value;
			};
		}
	});

	return builders;
};
