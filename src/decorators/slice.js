
'use strict';

const assert = require('assert');
const {defineProperties, compileProtocolsForTransformation, deriveProtocolsForTransformation} = require('../processors/index.js');
const {len, nth} = require('../symbols');

module.exports = {
	canProduce( ParentCollection ) {
		return ParentCollection.prototype.*nth;
	},
	factory( ParentCollection ) {
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
			ParentType: ParentCollection,
			parentCollectionKey: id`wrapped`,
			argKeys: [id`begin`, id`end`],

			propagateEveryElement: true,
			propagateMultipleElements: false,
			createsNewElements: false,
		});

		Slice::compileProtocolsForTransformation({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) {
				return index.plus( this.args.begin );
			},

			len() {
				if( parentProto[len] ) {
					return function() {
						return this.args.end.minus( this.args.begin );
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
				if( parentProto[len] ) {
					return function( ) {
						return this.end - this.begin;
					}
				}
			},
		});

		return Slice;
	}
};
