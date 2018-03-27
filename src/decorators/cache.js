
'use strict';

const {defineProperties, compileProtocolsForTransformation, deriveProtocolsForTransformation} = require('../processors/index.js');
const {len, nthKVN, getKVN, get, hasKey, nToKey, set} = require('../symbols');
const {KVN} = require('../util.js');

module.exports = {
	canProduce( ParentCollection ) {
		return ParentCollection.prototype.*hasKey;
	},
	factory( ParentCollection ) {
		class Cache {
			static get name() { return `${ParentCollection.name}::Cache`; }

			constructor( coll, CacheType=Map ) {
				this.wrapped = coll;
				this.cache = new CacheType();
			}

			toString( ) {
				return `${this.wrapped}.cache(${this.cache.constructor.name})`;
			}
		}

		const parentProto = ParentCollection.prototype;

		Cache::defineProperties({
			ParentType: ParentCollection,
			parentCollectionKey: id`wrapped`,
			argKeys: [id`mapFn`],

			propagateEveryElement: true,
			propagateMultipleElements: false,
			createsNewElements: false,
		});

		Cache::deriveProtocolsForTransformation({
			stage( kvn ) {
				return kvn;
			},
			indexToParentIndex( index ) { return index; },
			nthKVN() {
				if( parentProto.*nthKVN ) {
					return function( n ) {
						return this.*getKVN( this.*nToKey(n) );
					};
				}
			},
			getKVN() {
				if( parentProto.*getKVN ) {
					return function( key ) {
						if( this.cache.*hasKey(key) ) {
							const kvn = this.cache.*get( key );
							return new KVN( kvn.key, kvn.value, kvn.n );
						}

						const kvn = this.wrapped.*getKVN( key );
						this.cache.*set( key, kvn );
						return new KVN( kvn.key, kvn.value, kvn.n );
					}
				}
			},
			len() {
				if( parentProto.*len ) {
					return function( ) {
						return this.wrapped.*len();
					}
				}
			},
		});

		return Cache;
	}
};
