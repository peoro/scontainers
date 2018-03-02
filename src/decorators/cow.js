
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
`CopyType` needs to be part of the `Type`, because stuff like `add` needs to depend on it.
So, maybe `CopyType` dynamically gets a new Collection? not sure \o,o/
*/

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	const proto = Type.prototype;

	return class Cow {
		constructor( coll, CopyType=Map ) {
			this.wrapped = coll;
			this.copy = null;
			this.CopyType = CopyType;
		}

		nth() {
			if( proto.*nth ) {
				return function nth( n ) { return this.wrapped.*nth( n ); };
			}
		}
		setNth() {
			if( proto.*nth ) {
				return function setNth( n, value ) { TODO(); };
			}
		}
		get() {
			if( proto.*get ) {
				return function get( key ) { return this.wrapped.*get( key ); };
			}
		}
		set() {
			if( proto.*get ) {
				return function set( key, value ) { TODO(); };
			}
		}
		hasKey() {
			if( proto.*hasKey ) {
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
			if( proto.*reverse ) {
				return this.wrapped.*reverse().*cow();
			}
		}

		toString( ) {
			return `${this.wrapped}.cow()`;
		}
	};
});
