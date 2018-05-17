
const {assert, traits, semantics, toStr, id, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

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
				return `${this.object::toStr()}::ownProperties()`;
			}
		}

		OwnProperties.*describeScontainer({
			argKeys: [id`object`],
		});

		OwnProperties.*implCoreGenerators({
			getUnchecked( key ) {
				return this.args.object.*member( key, true );
			},
			hasKey( key ) {
				return this.args.object.*member(`hasOwnProperty`).*call( key );
			},

			loop() {
				const key = this.createUniqueVariable(`key`);

				this.body
					.*forIn(
						semantics.declare( key, undefined, `var` ),
						this.args.object,

						semantics.block()
							.*if( this.*hasKey(key),
								this.body = semantics.block()
							)
					);

				return new KVN( key, this.args.object.*member(key, true) );
			},
		});

		OwnProperties.*implCoreTraits({
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
