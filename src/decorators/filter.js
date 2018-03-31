
'use strict';

const {defineProperties, deriveProtocolsForTransformation, compileProtocolsForTransformation} = require('../processors/index.js')
const {semantics} = require('../compiler/index.js');

use protocols from require('../symbols');


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
				this.pushStatement(
					semantics.if(
						this.args.filterFn.call( kvn.value, kvn.key, kvn.n ).not(),
						this.skip()
					)
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
