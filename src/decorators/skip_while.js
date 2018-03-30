
'use strict';

const {defineProperties, deriveProtocolsForTransformation} = require('../processors/index.js');

use protocols from require('../symbols');


module.exports = function( ParentCollection ) {
	const parentProto = ParentCollection.prototype;

	return function() {
		class SkipWhile {
			static get name() { return `${ParentCollection.name}::SkipWhile`; }

			constructor( coll, fn ) {
				this.wrapped = coll;
				this.fn = fn;
			}

			toString( ) {
				return `${this.wrapped}.skipWhile(${this.fn.name || 'ƒ'})`;
			}
		}

		SkipWhile::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`fn`],
		});

		SkipWhile::deriveProtocolsForTransformation({
			kvIterator() {
				return function kvIterator() {
					return {
						collection: this.wrapped,
						fn: this.fn,
						it: this.wrapped.*kvIterator(),
						next() {
							while( true ) {
								const next = this.it.next();
								if( ! next ) {
									return;
								}

								const {key, value, n} = next;
								if( ! this.fn(value, key, n) ) {
									this.next = function next() { return this.it.next(); };
									return next;
								}
							}
						}
					};
				};
			},
			reverse() {
				if( parentProto.*reverse ) {
					return this.wrapped.*reverse().*skipWhile( this.fn );
				}
			}
		});

		return SkipWhile;
	};
};
