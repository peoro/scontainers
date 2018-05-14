
const assert = require('assert');

const utils = require('../util.js');

const traits = utils.TraitSet.fromKeys({
	// core protocol generators: static methods, explicitely implemented by a collection
	// these are used to dynamically generate core and derived traits for higher performance
	InnerCollection: Object,
	innerCollectionKey: '',
	argKeys: [''],

	mappingOnly: false,	// the decorator is just a map-like function
	transformStream: false,	// the decorator can transform the inner collection as a stream
});

use traits * from utils;
use traits * from traits;

traits.defineProperties = function( props ) {
	assert( props.argKeys );
	assert( (!!props.innerCollectionKey)===(!!props.InnerCollection), this );

	// setting properties
	traits.*implTraits( this, props );

	// setting default property values
	traits.*addTraits( this, {
		mappingOnly: false,
		transformStream: this.*mappingOnly ? true : false,
	});
};

module.exports = traits;
