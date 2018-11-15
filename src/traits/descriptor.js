
const assert = require('assert');
const straits = require('straits');
const utilTraits = require('./utils.js');

use traits * from straits.utils;

const toStr = straits.common.toString.*asMethod();

// metadata traits for Scontainers
const descriptorTraits = straits.utils.TraitSet.fromKeys({
	InnerCollection: Object,	// the container this container wraps
	innerCollectionKey: '',	// the key of the inner scontainers
	argKeys: [''],	// the names of the data-fields of this container

	mappingOnly: false,	// the decorator is just a map-like function
	standardIteration: false,	// iterating every element in order from `0` to `len()-1`
	transformStream: false,	// the decorator can transform the inner collection as a stream
});

use traits * from utilTraits;
use traits * from descriptorTraits;

Object.prototype.*describeScontainer = function( props ) {
	assert( props.argKeys, `${this}'s descriptor is missing argKeys` );
	assert( (!!props.innerCollectionKey)===(!!props.InnerCollection), `${this}'s descriptor needs to either have both innerCollectionKey(=${props.innerCollectionKey::toStr({verbose:0})}) and InnerCollection(=${props.InnerCollection::toStr({verbose:0})}) or none.` );

	// setting properties
	descriptorTraits.*implTraits( this, props );

	// setting default property values
	descriptorTraits.*addTraits( this, {
		mappingOnly: false,
		standardIteration: ( this.*mappingOnly || ! this.*InnerCollection ),
		transformStream: this.*mappingOnly,
	});
};

module.exports = descriptorTraits;
