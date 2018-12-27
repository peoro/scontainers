
const {traits, id} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

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

		TakeWhile.*describeScontainer({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`fn`],
		});

		TakeWhile.*implCoreTraits({
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
					return function reverse() {
						return this.wrapped.*reverse().*takeWhile( this.fn );
					};
				}
			}
		});

		return TakeWhile;
	};
};
