
'use strict';

const {defineProperties, compileProtocolsForTransformation, deriveProtocolsForTransformation} = require('../processors/index.js');
const {KArr, Done} = require('../util.js');

use protocols from require('../symbols');


module.exports = function( ParentCollection ) {
	if( ! ParentCollection.prototype.*kvIterator ) {
		return;
	}

	return function() {
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
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],

			mappingOnly: true,
		});

		Values::compileProtocolsForTransformation({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) { return index; },
		});

		Values::deriveProtocolsForTransformation({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) { return index; },
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
	};
};
