
'use strict';

const assert = require('assert');
const {defineProperties, compileProtocolsForRootType, deriveProtocolsForRootType} = require('../processors/index.js');
const {KVN, toString} = require('../util.js');

const es5 = require('esast/dist/es5.js');

use traits * from require('esast/dist/semantics.js');
use traits * from require('../symbols');


module.exports = function( ParentCollection ) {
	assert( ParentCollection === Object, `ObjectOwnProperties is only needed by Object...` );
	const parentProto = ParentCollection.prototype;

	return function() {
		class OwnProperties {
			static get name() { return `ObjectOwnProperties`; }

			constructor( coll ) {
				this.object = coll;
			}

			toString( ) {
				return `${this.object::toString()}::ownProperties()`;
			}
		}

		OwnProperties::defineProperties({
			argKeys: [id`object`],
		});

		OwnProperties::compileProtocolsForRootType({
			getUnchecked( key ) {
				return this.args.object.*member( key, true );
			},
			hasKey( key ) {
				return this.args.object.*member(`hasOwnProperty`).*call( key );
			},

			loop() {
				const s = es5.semantics;

				const key = this.createUniqueVariable(`key`);

				this.body
					.*forIn(
						s.declare( key, undefined, `var` ),
						this.args.object,

						s.block()
							.*if( this.*hasKey(key),
								this.body = s.block()
							)
					);

				return new KVN( key, this.args.object.*member(key, true) );
			},
		});

		OwnProperties::deriveProtocolsForRootType({
			getUnchecked( key ) { return this.object[key]; },
			hasKey( key ) { return this.object.hasOwnProperty( key ); },
			// set( key, value ) { this.object[key] = value; },},

			*iterator() {
				for( let key in this.object ) {
					if( this.*hasKey(key) ) {
						yield [ key, this.object[key] ];
					}
				}
			},
			kvIterator() {
				return {
					it: this[Symbol.iterator](),
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
