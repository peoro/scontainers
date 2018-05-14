
'use strict';

const straits = require('js-protocols');

const {defineProperties, compileProtocolsForTransformation, deriveProtocolsForTransformation} = require('../processors/index.js');
const {VArr, Done} = require('../util.js');
const symbols = require('../symbols');

use traits * from straits.utils;
use traits * from symbols;


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
		Values.Iterator = class {
			constructor( it ) {
				this.it = it;
			}
			next() {
				const next = this.it.next();
				if( ! next ) {
					return new Done();
				}

				const {value} = next;
				return new VArr( value );
			}
		};

		const parentProto = ParentCollection.prototype;

		Values::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],

			mappingOnly: true,
		});

		symbols.*implTraits( Values.prototype, {
			iterator() {
				return new Values.Iterator( this.wrapped.*kvIterator() );
			}
		});

		Values::compileProtocolsForTransformation({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) { return index; },
		});

		Values::deriveProtocolsForTransformation({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) { return index; },
		});

		return Values;
	};
};
