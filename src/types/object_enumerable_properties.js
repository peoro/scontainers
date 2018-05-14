
'use strict';

const assert = require('assert');
const {defineProperties, deriveProtocolsForRootType} = require('../processors/index.js');
const {KVN, toString} = require('../util.js');

use traits * from require('../symbols');


module.exports = function( ParentCollection ) {
	assert( ParentCollection === Object, `EnumerableProperties is only needed by Object...` );
	const parentProto = ParentCollection.prototype;

	return function() {
		class EnumerableProperties {
			static get name() { return `ObjectProperties`; }

			constructor( coll ) {
				this.wrapped = coll;
			}

			toString( ) {
				return `${this.wrapped::toString()}::properties()`;
			}
		}

		EnumerableProperties::defineProperties({
			argKeys: [],
		});

		EnumerableProperties::deriveProtocolsForRootType({
			get( key ) {
				return this.*hasKey(key) && this.wrapped[key];
			},
			set( key, value ) {
				this.wrapped[key] = value;
			},
			hasKey( key ) {
				return this.wrapped.propertyIsEnumerable( key );
			},

			*iterator() {
				for( let key in this.wrapped ) {
					yield [ key, this.wrapped[key] ];
				}
			},
			kvIterator() {
				return {
					it: this.*iterator(),
					next() {
						const next = this.it.next();
						if( ! next.done ) {
							return new KVN( next.value[0], next.value[1] );
						}
					}
				};
			},
			forEach( fn ) {
				for( let key in this.wrapped ) {
					fn( this.wrapped[key], key );
				}
			},
			whileEach( fn ) {
				for( let key in this.wrapped ) {
					const value = this.wrapped[key];
					if( ! fn(value, key, this) ) {
						return [key, value];
					}
				}
			},
		});

		return EnumerableProperties;
	};
};
