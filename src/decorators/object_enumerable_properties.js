
'use strict';

const assert = require('assert');
const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	assert( Type === Object, `ObjectOwnProperties is only needed by Object...` );
	const proto = Type.prototype;

	class EnumerableProperties {
		constructor( coll ) {
			this.wrapped = coll;
		}

		get() {
			return function get( key ) {
				return this.*hasKey(key) && this.wrapped[key];
			};
		}
		set() {
			return function set( key, value ) {
				this.wrapped[key] = value;
			};
		}
		hasKey() {
			return function hasKey( key ) {
				return this.wrapped.propertyIsEnumerable( key );
			};
		}

		kvIterator() {
			return function* kvIterator() {
				for( let key in this.wrapped ) {
					yield [key, this.wrapped[key]];
				}
			};
		}
		forEach() {
			return function forEach( fn ) {
				for( let key in this.wrapped ) {
					fn( this.wrapped[key], key );
				}
			};
		}
		whileEach() {
			return function whileEach( fn ) {
				for( let key in this.wrapped ) {
					const value = this.wrapped[key];
					if( ! fn(value, key, this) ) {
						return [key, value];
					}
				}
			};
		}

		toString( ) {
			return `${this.wrapped.*toString()}.properties()`;
		}
	}

	return EnumerableProperties;
});
