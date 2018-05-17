
const {traits, toStr, id, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

module.exports = function( ParentCollection ) {
	return function() {
		const parentProto = ParentCollection.prototype;

		class MapKey {
			constructor( coll, fn ) {
				this.wrapped = coll;
				this.fn = fn;
			}

			reverse() {
				if( parentProto.*reverse ) {
					return this.wrapped.*reverse().*mapKey( this.fn );
				}
			}

			toString( ) {
				return `${this.wrapped}.map(⋯)`;
			}
		}
		MapKey.Propagator = {
			parentCollection() { return this.wrapped; },
			next( kv ) {
				kv.key = this.fn( kv.value, kv.key );
				return kv;
			},
			alwaysPropagate: true,
			propagateMulti: false,
			needState: false,
			reorder: false
		};
		return MapKey;
	};
};
