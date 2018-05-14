
'use strict';

const {defineProperties, deriveProtocolsForTransformation} = require('../processors/index.js');

use traits * from require('../symbols');


module.exports = function( ParentCollection ) {
	const parentProto = ParentCollection.prototype;

	return function() {
		class TakeWhile {
			static get name() { return `${ParentCollection.name}::TakeWhile`; }

			constructor( coll, fn ) {
				this.wrapped = coll;
				this.fn = fn;
			}

			toString( ) {
				return `${this.wrapped}.takeWhile(${this.fn.name || 'ƒ'})`;
			}
		}

		TakeWhile::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`fn`],
		});

		TakeWhile::deriveProtocolsForTransformation({
			kvIterator() {
				return function kvIterator() {
					return {
						collection: this.wrapped,
						fn: this.fn,
						it: this.wrapped.*kvIterator(),
						next() {
							const next = this.it.next();
							if( ! next ) {
								return;
							}

							const {key, value, n} = next;
							if( this.fn(value, key, n) ) {
								return next;
							}

							this.next = function next() {};
						}
					};
				};
			},
			reverse() {
				if( parentProto.*reverse ) {
					return this.wrapped.*reverse().*takeWhile( this.fn );
				}
			}
		});

		return TakeWhile;
	};
};
