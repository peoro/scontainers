
'use strict';

const {defineProperties, deriveProtocolsForTransformation} = require('../processors/index.js');
const {KVN} = require('../util.js');

use protocols from require('../symbols');


module.exports = function( ParentCollection ) {
	if( ! ParentCollection.prototype.*hasKey ) {
		return;
	}

	return function() {
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
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`mapFn`],
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
	};
};
