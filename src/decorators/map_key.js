
const {traits, id} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

module.exports = function( ParentCollection ) {
	return function() {
		class MapKey {
			static get name() { return `${ParentCollection.name}::MapKey`; }

			constructor( coll, mapKeyFn ) {
				this.wrapped = coll;
				this.mapKeyFn = mapKeyFn;
			}

			toString( ) {
				return `${this.wrapped}.mapKey(${this.mapFn.name || 'ƒ'})`;
			}
		}

		const parentProto = ParentCollection.prototype;

		MapKey.*describeScontainer({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`mapKeyFn`],

			standardIteration: true,
			transformStream: true,
		});

		MapKey.*implCoreTraits({
			stage( kvn ) {
				kvn.key = this.mapKeyFn( kvn.value, kvn.key, kvn.n );
				return kvn;
			},
			nToParentN( n ) { return n; },

			reverse() {
				if( parentProto.*reverse ) {
					return this.wrapped.*reverse().*mapKey( this.mapKeyFn );
				}
			}
		});

		return MapKey;
	};
};
