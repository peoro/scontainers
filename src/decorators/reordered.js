
const {traits, id, options} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

module.exports = function( ParentCollection ) {
	const parentProto = ParentCollection.prototype;
	if( ! options.debug || ! parentProto.*kvReorderedIterator ) {
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

		Reordered.*describeScontainer({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],
		});

		Reordered.*implCoreTraits({
			kvReorderedIterator() {
				return function() {
					return this.wrapped.*kvReorderedIterator();
				};
			}
		});

		return Reordered;
	};
};
