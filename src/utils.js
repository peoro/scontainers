
const assert = require('assert');
const straits = require('js-protocols');
const es5 = require('esast/dist/es5.js');

const semanticTraits = require('esast/dist/semantics.js');
const descriptorTraits = require('./traits/descriptor.js');
const generatorTraits = require('./traits/generators.js');
const scontainerTraits = require('./traits/scontainers.js');
const utilTraits = require('./traits/utils.js');

use traits * from utilTraits;
use traits * from scontainerTraits;

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

const utils = {
	DEBUG: true,
	semantics: es5.semantics,
	language: es5,
	traits: {
		descriptors: descriptorTraits,
		generators: generatorTraits,
		scontainers: scontainerTraits,
		utils: utilTraits,
		semantics: semanticTraits,
	},
	toStr: straits.common.toString.*asMethod(),
	id( strings, ...args ) {
		assert( strings.length === 1 && args.length === 0 );
		return strings[0];
	},
	assert,
	KVN, KVIt, VIt, Done,
}

// implementing util traits
{
	Object.prototype.*implScontainer = function( implementationObj ) {
		return scontainerTraits.*addTraits( this, implementationObj );
	};
	Object.prototype.*wrapScontainer = function( decoratorFactoryFactory ) {
		const Container = this;

		const decoratorFactory = decoratorFactoryFactory( Container );
		if( ! decoratorFactory ) {
			// this decorator can't be implemented on `Type`
			return;
		}

		return {
			factory() {
				const Decorator = decoratorFactory( Container );
				assert( typeof Decorator === 'function', `${decoratorFactory.name} is broken.` );

				return function( ...args ) {
					return new Decorator( this, ...args );
				};
			}
		};
	};
}

module.exports = utils;

const {ReorderedIterator} = require('./reordered_iterator.js');
utils.ReorderedIterator = ReorderedIterator;
