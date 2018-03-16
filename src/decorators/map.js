
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const {len, nth, nthKey, hasKey, get} = require('../symbols');
const {compileProtocolsForTransformation, implementProtocolsForTransformation, implementCoreProtocolsFromPropagator, defineProperties} = require('../processors/index.js')
const {implementSymbolsFromFactory} = require('../util.js');


		// iteratorCompiler() {
		// 	if( proto.*iteratorCompiler ) {
		// 		return function iteratorCompiler() {
		// 			const compiler = this.wrapped.*iteratorCompiler();
		//
		// 			const mapFn = compiler.cretaeArgumentVariable(`mapFn`);
		// 			const value = compiler.createUniqueVariable(`value`);
		//
		// 			compiler.loopBody.pushStatement(
		// 				value.declare( mapFn.call(compiler.value, compiler.key) )
		// 			);
		//
		// 			compiler.value = value;
		//
		// 			return compiler;
		// 		};
		// 	}
		// }


module.exports = {
	canProduce( Type ) {
		return true;
	},
	factory( Type ) {
		const proto = Type.prototype;

		class MapD {
			constructor( coll, fn ) {
				this.wrapped = coll;
				this.fn = fn;
			}

			toString( ) {
				return `${this.wrapped}.map(${this.fn.name || 'ƒ'})`;
			}
		}
		MapD.fullName = `${Type.fullName || Type.name}::map`
		const Map = MapD;

		Map::defineProperties({
			ParentType: Type,
			parentCollection() { return this.wrapped; },
			args: {
				mapFn() { return this.fn; }
			}
		});

		/*
		Map::compileProtocolsForTransformation( Type, {
			step( compiler ) {
				// this can be used for...
				// `get`
				// `hasKey`: there's a value only if `compiler.skip()` isn't called
				// `has`
				// `iterator`
				const {parent, args} = this;

				parent.step( compiler );
				compiler.value = args.mapFn( compiler.value, compiler.key );
			}
			len( compiler ) {
				return this.parent.len( compiler );
			}
		});
		Filter::compileProtocolsForTransformation( Type, {
			step( compiler ) {
				const {parent, args} = this;
				parent.step( compiler );
				generate.code.for.if( ! args.filterFn(compiler.value, compiler.key), compiler.skip() );
			}
		});
		Flatten::compileProtocolsForTransformation( Type, {
			step( compiler ) {
				const {parent, args} = this;
				parent.step( compiler );
				compiler.value = generate.code.for.for( compiler.value );
				// TODO:
			}
		});
		*/

		Map::compileProtocolsForTransformation( Type, {
			nStage( compiler, parentStage ) {
				const {args, parent} = this;
				console.log( this );
				console.log( args );
				console.log( parent );
				parentStage( compiler );
				console.log( `value:`, compiler.value );
				console.log( `key:`, compiler.key );
				console.log( `code:`, compiler.toCode() );
				console.log();
				compiler.value = args.mapFn.call( compiler.value, compiler.key );
			},
			len( compiler ) {
				return this.parent.len( compiler );
			},
		});

		Map.prototype::implementSymbolsFromFactory({
			len() {
				if( proto.*len ) {
					return function() {
						return this.wrapped.*len();
					};
				}
			},
			nthKey() {
				if( proto.*nthKey ) {
					return function( n ) {
						return this.wrapped.*nthKey( n );
					};
				}
			},
			get() {
				if( proto.*get && proto.*hasKey ) {
					return function( key ) {
						if( this.wrapped.*hasKey(key) ) {
							const value = this.wrapped.*get( key );
							return this.fn( value, key, this );
						}
					};
				}
			},
			hasKey() {
				// return subminus.aliasFunctionFactory( proto.*hasKey ); // can't work as `this` must be `this.wrapper`
				if( proto.*hasKey ) {
					return function( key ) {
						return this.wrapped.*hasKey( key );
					};
				}
			}
		});

		Map::implementCoreProtocolsFromPropagator( Type, {
			parentCollection() { return this.wrapped; },
			nToParentN( n ) { return n; },
			next( kv ) {
				kv.value = this.fn( kv.value, kv.key );
				return kv;
			},
			alwaysPropagate: true,
			propagateMulti: false,
			needState: false,
			reorder: false
		});

		extendCollection( Map, Type );

		return Map;
	}
};

const {extendCollection} = require('../index.js');
