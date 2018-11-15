
const {traits, toStr, id, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

module.exports = function( ParentCollection ) {
	return function() {
		const parentProto = ParentCollection.prototype;

		class Flatten {
			static get name() { return `${ParentCollection.name}::Flatten`; }

			constructor( coll ) {
				this.wrapped = coll;
			}

			toString( ) {
				return `${this.wrapped}.flatten()`;
			}
		}

		Flatten.*describeScontainer({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],
		});

		Flatten.*implCoreTraits({
			count() {
				// NOTE: might throw if one of the elements of the collections of `this.wrapped` isn't countable
				if( parentProto.*map ) {
					return function count() {
						return this.wrapped
							.*map( (value)=>value.*count ? value.*count() : 1 )
							.*sum();
					};
				}
			},

			kvIterator() {
				return function kvIterator() {
					// NOTE: might throw if one of the elements of the collections of `this.wrapped` isn't iterable
					return {
						it: this.wrapped.*kvIterator(), // iterator on `this.wrapped`
						jt: null, // iterator on latest returned element of `this.wrapped`
						next() {
							while( true ) {
								if( this.jt ) {
									const j = this.jt.next();
									if( j ) {
										// found next element inside `jt`
										return j;
									}
									// reached the end of current `jt`
									this.jt = null;
								}

								const i = this.it.next();
								if( ! i ) {
									// reached the end of `i`
									return;
								}
								// found `i`: next element inside `it`

								if( i.value && i.value.*kvIterator ) {
									this.jt = i.value.*kvIterator();
									// `i` is iterable: iterating inside it
									continue;
								}

								// `i` was not iterable: just returning it
								return i;
							}

							unreachable();
						}
					};
				};
			},
			reverse() {
				// NOTE: might throw if one of the elements of the collections of `this.wrapped` isn't reversable
				if( parentProto.*reverse ) {
					return function reverse() {
						return this.wrapped
							.*reverse()
							.*map( (value)=>value.*kvIterator ? value.*reverse() : value )
							.*flatten()
					};
				}
			},
		});

		return Flatten;
	};
};
