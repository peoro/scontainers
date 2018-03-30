
'use strict';

const assert = require('assert');
const {defineProperties, deriveProtocolsForRootType} = require('../processors/index.js');
const {KVN, toString} = require('../util.js');

use protocols from require('../symbols');


module.exports = function( ParentCollection ) {
	assert( ParentCollection === Object, `ObjectOwnProperties is only needed by Object...` );
	const parentProto = ParentCollection.prototype;

	return function() {
		class OwnProperties {
			static get name() { return `ObjectOwnProperties`; }

			constructor( coll ) {
				this.wrapped = coll;
			}

			toString( ) {
				return `${this.wrapped::toString()}::ownProperties()`;
			}
		}

		OwnProperties::defineProperties({
			argKeys: [],
		});

		OwnProperties::deriveProtocolsForRootType({
			get( key ) {
				return this.*hasKey(key) && this.wrapped[key];
			},
			set( key, value ) {
				// return Object.defineProperty( this.wrapped, key, {value, writable:true, enumerable:true, configurable:true} ); // no need for this - unless `this.wrapper[key]` is a getter :x
				this.wrapped[key] = value;
			},
			hasKey( key ) {
				return this.wrapped.hasOwnProperty( key );
			},

			*kvIterator() {
				for( let key in this.wrapped ) {
					if( this.*hasKey(key) ) {
						yield new KVN( key, this.wrapped[key] );
					}
				}
			},
			*iterator() {
				for( let key in this.wrapped ) {
					if( this.*hasKey(key) ) {
						yield [ key, this.wrapped[key] ];
					}
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
		});

		return OwnProperties;
	};
};
