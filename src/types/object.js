
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

/*
module.exports = subminus.implementForExistingType( Object, class ObjectWrapper {
	static from( collection ) {
		// TODO: this function should be specialized, just like the rest of what this lib does...
		if( collection.*forAny ) {
			const object = {};
			collection.*forAny( (value, key)=>void (object[key] = value) );
			return object;
		}
		assert( false );
	}
	constructor( obj ) {
		this.wrapped = obj;
	}
});
*/

Object.*from = function from( collection ) {
	// TODO: this function should be specialized, just like the rest of what this lib does...
	if( collection.*forAny ) {
		const object = {};
		collection.*forAny( (value, key)=>void (object[key] = value) );
		return object;
	}
	assert( false );
};
