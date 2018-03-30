
'use strict';

const assert = require('assert');

const symbols = require('./symbols');
use protocols from symbols;

const {ReorderedIterator, implementCoreProtocols, implementDerivedProtocols} = require('./processors/index.js');



module.exports = {
	DEBUG: true,
	symbols,
	ReorderedIterator,
	get Range() {
		const Range = require('./types/range');;
		Object.defineProperties( module.exports, {
			value: Range
		});
		return Range;
	}
};

require('./types/array'),
require('./types/set'),
require('./types/map'),
require('./types/object.js');
