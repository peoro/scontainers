
'use strict';

const {defineProperties, compileProtocolsForTransformation, deriveProtocolsForTransformation} = require('../processors/index.js');
const {len} = require('../symbols');

module.exports = {
	canProduce( ParentCollection ) {
		return true;
	},
	factory( ParentCollection ) {
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
			ParentType: ParentCollection,
			parentCollectionKey: id`wrapped`,
			argKeys: [id`mapFn`],

			propagateEveryElement: true,
			propagateMultipleElements: false,
			createsNewElements: false,
		});

		Map::compileProtocolsForTransformation({
			stage( kvn ) {
				const {mapFn} = this.args;
				kvn.value = mapFn.call( kvn.value, kvn.key, kvn.n );
				return kvn;
			},
			indexToParentIndex( index ) {
				return index;
			},

			len() {
				if( parentProto[len] ) {
					return function() {
						return this.inner.len();
					}
				}
			},
		});

		Map::deriveProtocolsForTransformation({
			stage( kvn ) {
				kvn.value = this.mapFn( kvn.value, kvn.key, kvn.n );
				return kvn;
			},
			indexToParentIndex( index ) { return index; },
			len() {
				if( parentProto[len] ) {
					return function( ) {
						return this.wrapped[len]();
					}
				}
			},
		});

		return Map;
	}
};
