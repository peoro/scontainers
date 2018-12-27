
const {traits, id, KVIt, Done} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

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
				return new KVIt( key, value );
			}
		};

		Entries.*describeScontainer({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],

			mappingOnly: true,
		});

		traits.scontainers.*implTraits( Entries.prototype, {
			iterator() {
				return new Entries.Iterator( this.wrapped.*kvIterator() );
			}
		});

		Entries.*implCoreGenerators({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) { return index; },
		});

		Entries.*implCoreTraits({
			stage( kvn ) { return kvn; },
			indexToParentIndex( index ) { return index; },
		});

		return Entries;
	};
};
