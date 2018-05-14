
'use strict';

const subminus = require('../index.js');
const {defineProperties, compileProtocolsForTransformation, deriveProtocolsForTransformation} = require('../processors/index.js');
const {ReorderedIterator} = require('../reordered_iterator.js');

use traits * from require('../symbols');


module.exports = function( ParentCollection ) {
	const parentProto = ParentCollection.prototype;
	// TODO: I guess I should ignore parent's `kvReorderedIterator`, but it's needed by the current `/src/lodashcmp.js`
 	if( ! subminus.DEBUG || ( ! parentProto.*kvIterator && ! parentProto.*kvReorderedIterator ) ) {
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

		IterableOnly::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],
		});

		IterableOnly::deriveProtocolsForTransformation({
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
