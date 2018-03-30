
'use strict';

const {defineProperties, compileProtocolsForTransformation, deriveProtocolsForTransformation} = require('../processors/index.js');

use protocols from require('../symbols');


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

		Map::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`mapFn`],

			mappingOnly: true,
		});

		Map::compileProtocolsForTransformation({
			stage( kvn ) {
				const {mapFn} = this.args;
				kvn.value = mapFn.call( kvn.value, kvn.key, kvn.n );
				return kvn;
			},
			indexToParentIndex( index ) { return index; },
		});

		Map::deriveProtocolsForTransformation({
			stage( kvn ) {
				kvn.value = this.mapFn( kvn.value, kvn.key, kvn.n );
				return kvn;
			},
			indexToParentIndex( index ) { return index; },
		});

		return Map;
	};
};
