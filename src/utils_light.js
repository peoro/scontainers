
const assert = require('assert');
const es5 = require('esast/dist/es5.js');
const options = require('./options.js');

function id( strings, ...args ) {
	assert( strings.length === 1 && args.length === 0 );
	return strings[0];
}

function KVN( key, value, n ) {
	this.key = key;
	this.value = value;
	this.n = n;
}
function KVIt( key, value ) {
	this.value = [key, value];
	this.done = false;
}
function VIt( value ) {
	this.value = value;
	this.done = false;
}
function Done() {
	this.done = true;
}

module.exports = {
	assert,
	options,
	semantics: es5.semantics,
	language: es5,
	id,
	KVN, KVIt, VIt, Done,
};
