
'use strict';

const assert = require('assert');
const {defineProperties, compileProtocolsForRootType, deriveProtocolsForRootType} = require('../processors/index.js');
const {KVN, toString} = require('../util.js');
const {semantics} = require('../compiler/index.js');

use protocols from require('../symbols');


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
				return this.args.object.member( key, true );
			},
			hasKey( key ) {
				return this.args.object.member(`hasOwnProperty`).call( key );
			},

			loop( generator ) {
				const key = this.createUniqueVariable(`key`);

				return [
					semantics.forIn(
						key.declare(),
						this.args.object,

						this.block({skip:semantics.continue}, function(){
							const kvn = new KVN( key, this.args.object.member(key, true) );

							this.pushStatement(
								semantics.if( this.*hasKey(kvn.key).not(), this.skip() ),
								...this::generator( kvn ),
							);
						})
					)
				];
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
