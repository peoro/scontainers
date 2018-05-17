
const {traits, toStr, id, KVN, VIt, Done} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

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
				return new VIt( value );
			}
		};

		const parentProto = ParentCollection.prototype;

		Values.*describeScontainer({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],

			mappingOnly: true,
		});

		traits.scontainers.*implTraits( Values.prototype, {
			iterator() {
				return new Values.Iterator( this.wrapped.*kvIterator() );
			}
		});

		Values.*implCoreGenerators({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) { return index; },
		});

		Values.*implCoreTraits({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) { return index; },
		});

		return Values;
	};
};
