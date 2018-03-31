
'use strict';

const subminus = require('../index.js');
const {defineProperties, compileProtocolsForTransformation, deriveProtocolsForTransformation} = require('../processors/index.js');

use protocols from require('../symbols');


module.exports = function( ParentCollection ) {
	const parentProto = ParentCollection.prototype;
	if( ! subminus.DEBUG || ! parentProto.*kvReorderedIterator ) {
		return;
	}

	return function() {
		class Reordered {
			static get name() { return `${ParentCollection.name}::Reordered`; }

			constructor( coll ) {
				this.wrapped = coll;
			}

			toString( ) {
				return `${this.wrapped}.reordered()`;
			}
		}

		Reordered::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],
		});

		Reordered::deriveProtocolsForTransformation({
			kvReorderedIterator() {
				return function() {
					return this.wrapped.*kvReorderedIterator();
				}
			}
		});

		return Reordered;
	};
};
