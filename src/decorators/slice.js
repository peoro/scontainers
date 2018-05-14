
'use strict';

const assert = require('assert');
const {defineProperties, compileProtocolsForTransformation, deriveProtocolsForTransformation} = require('../processors/index.js');

use traits * from require('esast/dist/semantics.js');
use traits * from require('../symbols');


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

		Slice::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`begin`, id`end`],
		});

		Slice::compileProtocolsForTransformation({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) {
				return index.*plus( this.args.begin );
			},

			len() {
				if( parentProto.*len ) {
					return function() {
						return this.args.end.*minus( this.args.begin );
					}
				}
			},
		});

		Slice::deriveProtocolsForTransformation({
			stage( kvn ) {return kvn; },
			indexToParentIndex( index ) {
				return index + this.begin;
			},
			len() {
				if( parentProto.*len ) {
					return function( ) {
						return this.end - this.begin;
					}
				}
			},
		});

		return Slice;
	};
};
