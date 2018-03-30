
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;


/*
TODO: decide how to do this thing...

How about... `Cow` takes a Type as a parameter
and instantiates a variable of that type when it needs to copy :F
by default it's map \o,o/

Yes, it's a good idea, buuut...
`CopyType` needs to be part of the `ParentCollection`, because stuff like `add` needs to depend on it.
So, maybe `CopyType` dynamically gets a new Collection? not sure \o,o/
*/

module.exports = function( ParentCollection ) {
	const parentProto = ParentCollection.prototype;

	return function() {
		return class Cow {
			constructor( coll, CopyType=Map ) {
				this.wrapped = coll;
				this.copy = null;
				this.CopyType = CopyType;
			}

			nth() {
				if( parentProto.*nth ) {
					return function nth( n ) { return this.wrapped.*nth( n ); };
				}
			}
			setNth() {
				if( parentProto.*nth ) {
					return function setNth( n, value ) { TODO(); };
				}
			}
			get() {
				if( parentProto.*get ) {
					return function get( key ) { return this.wrapped.*get( key ); };
				}
			}
			set() {
				if( parentProto.*get ) {
					return function set( key, value ) { TODO(); };
				}
			}
			hasKey() {
				if( parentProto.*hasKey ) {
					return function hasKey( key ) { return this.wrapped.*hasKey( key ); };
				}
			}
			/* TODO
			add() {
				if( this.

			}
			*/

			kvIterator() {
				return function kvIterator() {
					return this.wrapped.*kvIterator();
				};
			}
			reverse() {
				if( parentProto.*reverse ) {
					return this.wrapped.*reverse().*cow();
				}
			}

			toString( ) {
				return `${this.wrapped}.cow()`;
			}
		};
	};
};
