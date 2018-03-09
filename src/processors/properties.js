
const assert = require('assert');

const propertiesSymbol = Symbol('properties');

function defineProperties( props ) {
	assert( props.args );
	assert( (!!props.parentCollection)===(!!props.ParentType) );

	this[propertiesSymbol] = props;
}

module.exports = {
	propertiesSymbol,
	defineProperties,
};
