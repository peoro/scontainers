
const {traits, toStr, id, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

module.exports = function( ParentCollection ) {
	return function() {
		class Map {
			static get name() { return `${ParentCollection.name}::Map`; }

			constructor( coll, mapFn ) {
				this.wrapped = coll;
				this.mapFn = mapFn;
			}

			toString( ) {
				return `${this.wrapped}.map(${this.mapFn.name || 'ƒ'})`;
			}
		}

		const parentProto = ParentCollection.prototype;

		Map.*describeScontainer({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`mapFn`],

			mappingOnly: true,
		});

		Map.*implCoreGenerators({
			stage( kvn ) {
				const {mapFn} = this.args;
				kvn.value = mapFn.*call( kvn.value, kvn.key, kvn.n );
				return kvn;
			},
			indexToParentIndex( index ) { return index; },
		});

		Map.*implCoreTraits({
			stage( kvn ) {
				kvn.value = this.mapFn( kvn.value, kvn.key, kvn.n );
				return kvn;
			},
			indexToParentIndex( index ) { return index; },
		});

		return Map;
	};
};
