
const {traits, semantics, toStr, id, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

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

		Filter.*describeScontainer({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`filterFn`],

			transformStream: true,
		});

		Filter.*implCoreGenerators({
			kStage( kvn ) {
				this.body.*if(
					this.args.filterFn.*call( kvn.value, kvn.key, kvn.n ),
					this.body = semantics.block()
				);
				return kvn;
			},
			keyToParentKey( key ) { return key; },
		});

		Filter.*implCoreTraits({
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
