
const {assert, traits, id} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

module.exports = function( ParentCollection ) {
	if( ! ParentCollection.prototype.*nth ) {
		return;
	}

	return function() {
		class Slice {
			static get name() { return `${ParentCollection.name}::Slice`; }

			constructor( coll, begin, end=coll.*len() ) {
				this.wrapped = coll;
				this.begin = begin;
				this.end = end;

				assert( this.begin >= 0 && this.end <= coll.*len() && this.end >= this.begin );
			}

			toString( ) {
				return `${this.wrapped}[${this.begin}:${this.end}]`;
			}
		}

		const parentProto = ParentCollection.prototype;

		Slice.*describeScontainer({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`begin`, id`end`],
		});

		Slice.*implCoreGenerators({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) {
				return index.*plus( this.args.begin );
			},

			len() {
				if( parentProto.*len ) {
					return function() {
						return this.args.end.*minus( this.args.begin );
					};
				}
			},
		});

		Slice.*implCoreTraits({
			stage( kvn ) {return kvn; },
			indexToParentIndex( index ) { return index + this.begin; },
			len() {
				if( parentProto.*len ) {
					return function( ) {
						return this.end - this.begin;
					};
				}
			},
		});

		return Slice;
	};
};
