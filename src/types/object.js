
'use strict';

const symbols = require('../symbols.js');
const {decorate, implementSymbolsFromFactory, assignProtocols, assignProtocolFactories} = require('../util.js');

use protocols from symbols;


symbols::assignProtocols( Object, {
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

symbols::assignProtocolFactories( Object.prototype, {
	ownProperties: Object::decorate( require('../decorators/object_own_properties') ),
	properties: Object::decorate( require('../decorators/object_enumerable_properties') ),
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
});

symbols::assignProtocols( Symbol.prototype, {
	toString() {
		return `[[${String(this).slice( 7, -1 )}]]`;
	}
});

// requiring bound at the end, as it needs our `ownProperties` functions etc
const {collect, map, properties, toString} = require('../bound.js');
