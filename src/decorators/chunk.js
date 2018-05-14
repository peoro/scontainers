
'use strict';

const assert = require('assert');
const {defineProperties, deriveProtocolsForTransformation} = require('../processors/index.js');
const {KVN} = require('../util.js');

use traits * from require('../symbols');


module.exports = function( ParentCollection ) {
	const parentProto = ParentCollection.prototype;
	if( ! parentProto.*whileEach ) {
		return;
	}

	return function() {
		class Chunk {
			static get name() { return `${ParentCollection.name}::Chunk`; }

			constructor( coll, n ) {
				this.wrapped = coll;
				this.n = n;

				assert( this.n > 0, `Invalid parameter for chunk()` );
			}

			toString( ) {
				return `${this.wrapped}.chunk(${this.n})`;
			}
		}

		Chunk::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`n`],
		});

		Chunk::deriveProtocolsForTransformation({
			len() {
				if( parentProto.*len ) {
					return function len(){ return Math.ceil( this.wrapped.*len() / this.n ); };
				}
			},
			nth() {
				if( parentProto.*nth && parentProto.*len ) {
					return function( n ) {
						return this.wrapped.*slice( n*this.n, Math.min(this.wrapped.*len(),  (n+1)*this.n) );
					};
				}
			},

			kvIterator() {
				// TODO: don't allocate a `Map`: use a reordered iterator
				// TODO: if you can clone the iterator on `this.wrapped`, do it!
				return function kvIterator() {
					return {
						n: this.n,
						count: 0,
						it: this.wrapped.*kvIterator(),
						next() {
							const chunk = new Map();
							for( let i = 0; i < this.n; ++i ) {
								const next = this.it.next();
								if( ! next ) {
									break;
								}

								const {key, value, n} = next;
								chunk.set( key, value, n );
							}

							if( chunk.size ) {
								return new KVN( this.count++, chunk );
							}
						}
					};
				};
			},

			reverse() {
				if( parentProto.*reverse && parentProto.*len ) {
					return function reverse() {
						const remainder = this.wrapped.*len() % this.n;
						if( remainder === 0 ) {
							return new Chunk( this.wrapped.*reverse(), this.n );
						} else {
							return new Chunk(
								new Array(remainder)
									.*concat( this.wrapped.*reverse() )
									.*map( (chunk, i)=>{
										if( i === 0 ) {
											return chunk.skip( remainder );
										}
										return chunk;
									})
								, this.n );
						}
					}
				}
			},
		});

		return Chunk;
	};
};
