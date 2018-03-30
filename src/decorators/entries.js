
'use strict';

const {defineProperties, compileProtocolsForTransformation, deriveProtocolsForTransformation} = require('../processors/index.js');

use protocols from require('../symbols');


module.exports = function( ParentCollection ) {
	if( ! ParentCollection.prototype.*kvIterator ) {
		return;
	}

	return function() {
		class Entries {
			static get name() { return `${ParentCollection.name}::Entries`; }

			constructor( coll ) {
				this.wrapped = coll;
			}

			toString( ) {
				return `${this.wrapped}.entries()`;
			}
		}

		const parentProto = ParentCollection.prototype;

		Entries::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],

			mappingOnly: true,
		});

		Entries::compileProtocolsForTransformation({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) { return index; },
		});

		Entries::deriveProtocolsForTransformation({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) { return index; },
		});

		return Entries;
	};
};
