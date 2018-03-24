
const assert = require('assert');

const propertiesSymbol = Symbol('properties');

function defineProperties( props ) {
	assert( props.argKeys );
	assert( (!!props.parentCollectionKey)===(!!props.ParentType), this );

	this[propertiesSymbol] = props;
}

module.exports = {
	propertiesSymbol,
	defineProperties,
};
