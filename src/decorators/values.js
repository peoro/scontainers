
'use strict';

const {defineProperties, compileProtocolsForTransformation, deriveProtocolsForTransformation} = require('../processors/index.js');
const {len, kvIterator} = require('../symbols');
const {KArr, Done} = require('../util.js');

module.exports = {
	canProduce( ParentCollection ) {
		return ParentCollection.prototype.*kvIterator;
	},
	factory( ParentCollection ) {
		class Values {
			static get name() { return `${ParentCollection.name}::Values`; }

			constructor( coll ) {
				this.wrapped = coll;
			}

			toString( ) {
				return `${this.wrapped}.values()`;
			}
		}

		const parentProto = ParentCollection.prototype;

		Values::defineProperties({
			ParentType: ParentCollection,
			parentCollectionKey: id`wrapped`,
			argKeys: [],

			propagateEveryElement: true,
			propagateMultipleElements: false,
			createsNewElements: false,
		});

		Values::compileProtocolsForTransformation({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) { return index; },

			len() {
				if( parentProto[len] ) {
					return function() {
						return this.inner.len();
					}
				}
			},
		});

		Values::deriveProtocolsForTransformation({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) { return index; },
			len() {
				if( parentProto[len] ) {
					return function( ) {
						return this.wrapped[len]();
					}
				}
			},
			iterator() {
				return function iterator( ) {
					return {
						it: this.wrapped.*kvIterator(),
						next() {
							const next = this.it.next();
							if( ! next ) {
								return new Done();
							}

							const {value} = next;
							return new KArr( value );
						}
					};
				};
			},
		});

		return Values;
	}
};
