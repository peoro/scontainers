
const assert = require('assert');

const {nToKey} = require('../symbols');
const {implementSymbolsFromFactory} = require('../util.js');

const {ReorderedIterator} = require('./reordered_iterator.js');

function implementCoreProtocolsFromPropagator( ParentType, propagator ) {
	assert( this, `compileProtocolsForTransformation() must be called on an object` );

	const Type = this;
	const proto = this.prototype;
	const parentProto = ParentType.prototype;

	proto::implementSymbolsFromFactory({
		nToKey() {
			if( propagator.nToParentN && parentProto.*nToKey ) {
				return function( n ) {
					return this::propagator.parentCollection().*nToKey( this::propagator.nToParentN(n) );
				}
			}
		},
	});

	// TODO: ugly
	Type.Propagator = propagator;
}

module.exports = {
	implementCoreProtocolsFromPropagator
}
