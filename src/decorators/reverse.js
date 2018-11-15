
const {assert, traits, toStr, id, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

module.exports = function( ParentCollection ) {
	if( ! ParentCollection.prototype.*nth ) {
		return;
	}

	return function() {
		const parentProto = ParentCollection.prototype;

		class Reverse {
			static get name() { return `${ParentCollection.name}::Reverse`; }

			constructor( coll ) {
				this.wrapped = coll;
			}

			toString( ) {
				return `${this.wrapped}.reverse()`;
			}
		}

		Reverse.*describeScontainer({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [],

			mappingOnly: true,
		});

		Reverse.*implCoreTraits({
			nStage( kvn ) { return kvn; },
			nToParentN( n ) { return this.*len() - n - 1; },

			reverse() {
				return this.wrapped;
			}
		});

		return Reverse;
	};
};
