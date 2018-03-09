
const assert = require('assert');

const {hasNth, nthKey} = require('../symbols');
const {implementSymbolsFromFactory} = require('../util.js');

const {ReorderedIterator} = require('./reordered_iterator.js');

function implementCoreProtocolsFromPropagator( ParentType, propagator ) {
	assert( this, `compileProtocolsForTransformation() must be called on an object` );

	const Type = this;
	const proto = this.prototype;
	const parentProto = ParentType.prototype;

	proto::implementSymbolsFromFactory({
		nthKey() {
			if( propagator.nToParentN && parentProto.*nthKey ) {
				return function( n ) {
					return this::propagator.parentCollection().*nthKey( this::propagator.nToParentN(n) );
				}
			}
		},
		hasNth() {
			if( propagator.nToParentN && parentProto.*hasNth ) {
				return function( n ) {
					return this::propagator.parentCollection().*hasNth( this::propagator.nToParentN(n) );
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
