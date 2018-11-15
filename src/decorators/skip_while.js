
const {traits, toStr, id, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

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

		SkipWhile.*describeScontainer({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`fn`],
		});

		SkipWhile.*implCoreTraits({
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
					return function reverse() {
						return this.wrapped.*reverse().*skipWhile( this.fn );
					};
				}
			}
		});

		return SkipWhile;
	};
};
