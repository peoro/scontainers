
'use strict';

const traits = require('../symbols.js');
const utils = require('../util.js');
const {decorate, assignProtocolFactories} = utils;

use traits * from utils;
use traits * from traits;


Object.*implScontainer({
	from( collection ) {
		// TODO: this function should be specialized, just like the rest of what this lib does...
		if( collection.*forEach ) {
			const object = {};
			collection.*forEach( (value, key)=>void (object[key] = value) );
			return object;
		}
		assert( false );
	}
});

traits::assignProtocolFactories( Object.prototype, {
	ownProperties: Object::decorate( require('./object_own_properties') ),
	properties: Object::decorate( require('./object_enumerable_properties') ),
	/*
	// TODO: override `toString`, but force its overriddance
	toString() {
		return function toString() {
			if( this.toString !== Object.prototype.toString ) {
				return this.toString();
			}

			let out = '';
			for( let key in this ) {
				const value = this[key];

				if( out ) {
					out += `, `;
				}
				out += `${key.*toString()}:${value.*toString()}`;
			}
			return `${this.constructor.name}{${out}}`;
		}
	}
	*/
});
