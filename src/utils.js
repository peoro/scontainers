
const straits = require('straits');

const semanticTraits = require('esast/dist/semantics.js');
const descriptorTraits = require('./traits/descriptor.js');
const generatorTraits = require('./traits/generators.js');
const scontainerTraits = require('./traits/scontainers.js');
const utilTraits = require('./traits/utils.js');

const {ReorderedIterator} = require('./reordered_iterator.js');

const utilsLight = require('./utils_light.js');
const {assert} = utilsLight;

use traits * from utilTraits;
use traits * from scontainerTraits;


const utils = {
	ReorderedIterator,
	traits: {
		descriptors: descriptorTraits,
		generators: generatorTraits,
		scontainers: scontainerTraits,
		utils: utilTraits,
		semantics: semanticTraits,
	},
	toStr: straits.common.toString.*asMethod(),
};
Object.assign( utils, utilsLight );

// implementing util traits
{
	Object.prototype.*implScontainer = function( implementationObj ) {
		const factoryObj = {};

		for( let key in implementationObj ) {
			factoryObj[key] = function(){ return implementationObj[key]; };
		}

		// return scontainerTraits.*addTrait( this, implementationObj );
		return scontainerTraits.*addTraitFactories( this, factoryObj );
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
