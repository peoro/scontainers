
const assert = require('assert');

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const util = require('../util.js');

const symbols = new protocols.util.Protocol();

// core protocol generators: static methods, explicitely implemented by a collection
// these are used to dynamically generate core and derived protocols for higher performance
symbols[utilSymbols.defineAndAssign]( {}, {
	InnerCollection: Object,
	innerCollectionKey: '',
	argKeys: [''],

	mappingOnly: false,	// the decorator is just a map-like function
	transformStream: false,	// the decorator can transform the inner collection as a stream
});


use protocols from symbols;


function defineProperties( props ) {
	assert( props.argKeys );
	assert( (!!props.innerCollectionKey)===(!!props.InnerCollection), this );

	// setting properties
	symbols::util.assignProtocols( this, props );

	// setting default property values
	symbols::util.assignProtocols( this, {
		mappingOnly: false,
		transformStream: this.*mappingOnly ? true : false,
	});
}

module.exports = {
	symbols,
	defineProperties,
};
