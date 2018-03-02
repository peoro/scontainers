
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	const proto = Type.prototype;

	if( ! subminus.DEBUG ) {
		return ;
	}

	class IterableOnly {
		constructor( coll ) {
			this.wrapped = coll;
		}

		toString( ) {
			return `${this.wrapped}.iter()`;
		}
	};
	IterableOnly.Propagator = {
		parentCollection( ) {
			return this.wrapped;
		},
		// start() { return state; },
		next( kv/*, state*/ ) {
			// state.xxx = ...
			return kv;
		},
		// end( state ) { return state.xxx },
		alwaysPropagate: true,
		propagateMulti: false,
		needState: false,
		reorder: false
	}

	return IterableOnly;
});
