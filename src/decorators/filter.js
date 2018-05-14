
'use strict';

const {defineProperties, deriveProtocolsForTransformation, compileProtocolsForTransformation} = require('../processors/index.js');

const {semantics} = require('esast/dist/es5.js');

use traits * from require('esast/dist/semantics.js');
use traits * from require('../symbols');


module.exports = function( ParentCollection ) {
	const parentProto = ParentCollection.prototype;

	return function() {
		class Filter {
			static get name() { return `${ParentCollection.name}::Filter`; }

			constructor( coll, filterFn ) {
				this.wrapped = coll;
				this.filterFn = filterFn;
			}

			toString( ) {
				return `${this.wrapped}.filter(${this.filterFn.name || 'ƒ'})`;
			}
		}

		Filter::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`filterFn`],

			transformStream: true,
		});

		Filter::compileProtocolsForTransformation({
			kStage( kvn ) {
				this.body.*if(
					this.args.filterFn.*call( kvn.value, kvn.key, kvn.n ),
					this.body = semantics.block()
				);
				return kvn;
			},
			keyToParentKey( key ) { return key; },
		});

		Filter::deriveProtocolsForTransformation({
			kStage( kvn ) {
				if( this.filterFn(kvn.value, kvn.key, kvn.n) ) {
					return kvn;
				}
			},
			keyToParentKey( key ) { return key; },
		});

		return Filter;
	};
};
