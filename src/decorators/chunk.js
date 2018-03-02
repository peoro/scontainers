
'use strict';

const assert = require('assert');
const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

use protocols from subminus.symbols;

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	const proto = Type.prototype;

	if( ! proto.*whileEach ) {
		return;
	}

	class Chunk {
		constructor( coll, n ) {
			this.wrapped = coll;
			this.n = n;

			assert( this.n > 0, `Invalid parameter for chunk()` );
		}

		len() {
			if( proto.*len ) {
				return function len(){ return Math.ceil( this.wrapped.*len() / this.n ); };
			}
		}
		nth() {
			if( proto.*nth && proto.*len ) {
				return function nth( n ) {
					return this.wrapped.*slice( n*this.n, Math.min(this.wrapped.*len(),  (n+1)*this.n) );
				};
			}
		}

		kvIterator() {
			// TODO: don't allocate a `Map`: use a reordered iterator
			return function kvIterator() {
				return {
					n: this.n,
					count: 0,
					it: this.wrapped.*kvIterator(),
					next() {
						const chunk = new Map();
						for( let i = 0; i < this.n; ++i ) {
							const next = this.it.next();
							if( next.done ) {
								break;
							}

							const [key, value] = next.value;
							chunk.set( key, value );
						}

						if( chunk.size ) {
							return { done:false, value:[this.count++, chunk] };
						}
						return { done:true };
					}
				};
			};
		}

		reverse() {
			if( proto.*reverse && proto.*len ) {
				return function reverse() {
					const remainder = this.*wrapped.*len() % this.n;
					if( remainder === 0 ) {
						return new Chunk( this.*wrapped.*reverse(), this.n );
					} else {
						return new Chunk(
							new Array(remainder)
								.*concat( this.*wrapped.*reverse() )
								.*map( (chunk, i)=>{
									if( i === 0 ) {
										return chunk.skip( remainder );
									}
									return chunk;
								})
							, this.n );
					}
				}
			}
		}

		toString( ) {
			return `${this.wrapped}.chunk(${this.n})`;
		}
	}
	Chunk.Propagator = {
		parentCollection() { return this.wrapped; },
		nToParentN( n ) { return n*this.n; },
	};

	return Chunk;
});