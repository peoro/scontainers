
const {traits, id, ReorderedIterator, options} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

module.exports = function( ParentCollection ) {
	const parentProto = ParentCollection.prototype;
	// TODO: I guess I should ignore parent's `kvReorderedIterator`, but it's needed by the current `/src/lodashcmp.js`
	if( ! options.debug || ( ! parentProto.*kvIterator && ! parentProto.*kvReorderedIterator ) ) {
		return;
	}

	return function() {
		class IterableOnly {
			static get name() { return `${ParentCollection.name}::IterableOnly`; }

			constructor( coll ) {
				this.wrapped = coll;
			}

			toString( ) {
				return `${this.wrapped}.iter()`;
			}
		}

		IterableOnly.*describeScontainer({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],
		});

		IterableOnly.*implCoreTraits({
			kvIterator() {
				if( parentProto.*kvIterator ) {
					return function() {
						return this.wrapped.*kvIterator();
					};
				}
			},
			kvReorderedIterator() {
				if( IterableOnly.prototype.*kvIterator ) {
					return function() {
						return new ReorderedIterator.FromIterator( this.*kvIterator() );
					};
				}
				if( parentProto.*kvReorderedIterator ) {
					return function() {
						return this.wrapped.*kvReorderedIterator();
					};
				}
			},
		});

		return IterableOnly;
	};
};
