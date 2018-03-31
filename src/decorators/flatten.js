
'use strict';

const {defineProperties, deriveProtocolsForTransformation} = require('../processors/index.js');

use protocols from require('../symbols');


module.exports = function( ParentCollection ) {
	return function() {
		const parentProto = ParentCollection.prototype;

		class Flatten {
			static get name() { return `${ParentCollection.name}::Chunk`; }

			constructor( coll ) {
				this.wrapped = coll;
			}

			toString( ) {
				return `${this.wrapped}.flatten()`;
			}
		}

		Flatten::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],
		});

		Flatten::deriveProtocolsForTransformation({
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
						it: this.wrapped.*kvIterator(),
						jt: null,
						processJt() {
							if( ! this.jt ) {
								return;
							}
							return this.jt.next();
						},
						processIt() {
							const iNext = this.it.next();
							if( ! iNext ) {
								return;
							}

							const {value} = iNext;
							if( value.*kvIterator ) {
								this.jt = value.*kvIterator();
								return this.next();
							}
							return iNext;
						},
						next() {
							const next = this.processJt();
							if( ! next ) {
								return this.processIt();
							}
							return next;
						}
					};
				};
			},
			reverse() {
				// NOTE: might throw if one of the elements of the collections of `this.wrapped` isn't reversable
				if( parentProto.*reverse ) {
					return function reverse() {
						return new Flatten(
							this.wrapped
								.*reverse()
								.*map( (value)=>value.*kvIterator ? value.*reverse() : value )
							);
					};
				}
			},
		});

		return Flatten;
	};
};
