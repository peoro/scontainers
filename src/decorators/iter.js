
'use strict';

const subminus = require('../index.js');
const {defineProperties, compileProtocolsForTransformation, deriveProtocolsForTransformation} = require('../processors/index.js');
const {kvIterator} = require('../symbols');

module.exports = {
	canProduce( ParentCollection ) {
		return !! subminus.DEBUG;
	},
	factory( ParentCollection ) {
		class IterableOnly {
			static get name() { return `${ParentCollection.name}::IterableOnly`; }

			constructor( coll ) {
				this.wrapped = coll;
			}

			toString( ) {
				return `${this.wrapped}.iter()`;
			}
		}

		IterableOnly::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],
		});

		IterableOnly::deriveProtocolsForTransformation({
			kvIterator() {
				return function() {
					return this.wrapped.*kvIterator();
				}
			}
		});

		return IterableOnly;
	}
};
