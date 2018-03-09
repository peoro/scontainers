
'use strict';

const symbols = require('../symbols.js');
const {hasSymbols, decorate, implementSymbolsFromFactory} = require('../util.js');

Object[symbols.from] = function from( collection ) {
	// TODO: this function should be specialized, just like the rest of what this lib does...
	if( collection::hasSymbols(symbols.forAny) ) {
		const object = {};
		collection[symbols.forAny]( (value, key)=>void (object[key] = value) );
		return object;
	}
	assert( false );
};

Object.prototype::implementSymbolsFromFactory( {
	ownProperties: Object::decorate( require('../decorators/object_own_properties') ),
	properties: Object::decorate( require('../decorators/object_enumerable_properties') ),
	// TODO: override `toString`, but force its overriddance
	toString() {
		return function toString() {
			if( this.toString !== Object.prototype.toString ) {
				return this.toString();
			}

			const out = this::properties()
				::map( (value, key)=>`${key::toString()}:${value::toString()}` )
				::collect( Array );
			return `{${out.join(', ')}}`;
		}
	}
});

// requiring bound at the end, as it needs our `ownProperties` functions etc
const {collect, map, properties, toString} = require('../bound.js');
