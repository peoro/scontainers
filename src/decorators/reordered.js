
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

	class Reordered {
		constructor( coll ) {
			this.wrapped = coll;
		}

		toString( ) {
			return `${this.wrapped}.reordered()`;
		}
	};
	Reordered.Propagator = {
		parentCollection( ) { return this.wrapped; },
		next( kv ) { return kv; },
		alwaysPropagate: true,
		propagateMulti: false,
		needState: false,
		reorder: true
	}

	return Reordered;
});
