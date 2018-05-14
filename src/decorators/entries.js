
'use strict';

const straits = require('js-protocols');

const {defineProperties, compileProtocolsForTransformation, deriveProtocolsForTransformation} = require('../processors/index.js');
const {KVArr, Done} = require('../util.js');
const symbols = require('../symbols');

use traits * from straits.utils;
use traits * from symbols;


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
		Entries.Iterator = class {
			constructor( it ) {
				this.it = it;
			}
			next() {
				const next = this.it.next();
				if( ! next ) {
					return new Done();
				}

				const {key, value} = next;
				return new KVArr( key, value );
			}
		};

		const parentProto = ParentCollection.prototype;

		Entries::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],

			mappingOnly: true,
		});

		symbols.*implTraits( Values.prototype, {
			iterator() {
				return new Entries.Iterator( this.wrapped.*kvIterator() );
			}
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
