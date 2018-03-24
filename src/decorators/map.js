
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const symbols = require('../symbols');
const generatorSymbols = require('../generator_symbols');
const {compileProtocolsForTransformation, implementProtocolsForTransformation, implementCoreProtocolsFromPropagator, defineProperties, parentCoreSymbols} = require('../processors/index.js')
const {implementSymbolsFromFactory} = require('../util.js');

const {len, nth, nToKey, hasKey, get} = symbols;


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

		class Map {
			static get name() { return `${Type.name}::Map`; }

			constructor( coll, fn ) {
				this.wrapped = coll;
				this.fn = fn;
			}

			toString( ) {
				return `${this.wrapped}.map(${this.fn.name || 'ƒ'})`;
			}
		}

		Map::defineProperties({
			ParentType: Type,
			parentCollectionKey: id`wrapped`,
			argKeys: [id`fn`],

			propagateEveryElement: true,
			propagateMultipleElements: false,
			createsNewElements: false,
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

		/*
		{
			function nStage( compiler, parentStage ) {
				const {args, parent} = this;
				parentStage( compiler );
				compiler.value = args.mapFn.call( compiler.value, compiler.key );
			};

			function len( compiler ) {
				return this.parent.len( compiler );
			};
			len.requirements = [proto.*len];

			Map::compileProtocolsForTransformation({
				nStage,
				len
			});
		}

		{
			Map::compileProtocolsForTransformation({
				nStage: function() {
					....
				}.require([ proto.get ])
				len
			});
		}
		*/

		{
			const ParentType = Type;
			const parentProto = ParentType.prototype;

			Map::compileProtocolsForTransformation({
				nStage( compiler, n, innerStage ) {
					const {fn} = compiler.getArgs( this );
					innerStage( compiler, n );
					compiler.value = fn.call( compiler.value, compiler.key );
				},
				stage( compiler, key, innerStage ) {
					const {fn} = compiler.getArgs( this );
					innerStage( compiler, key );
					compiler.value = fn.call( compiler.value, compiler.key );
				},
				nToParentN( compiler, n ) {
					return n;
				},
				len() {
					if( parentProto[len] ) {
						return function( compiler ) {
							return this::parentCoreSymbols.len( compiler );
						}
					}
				},
			});
		}

		Map.prototype::implementSymbolsFromFactory({
			len() {
				if( proto.*len ) {
					return function() {
						return this.wrapped.*len();
					};
				}
			},
			nToKey() {
				if( proto.*nToKey ) {
					return function( n ) {
						return this.wrapped.*nToKey( n );
					};
				}
			},
			nth() {
				if( proto.*nth ) {
					return function( n ) {
						// TODO: check `n`
						const value = this.wrapped.*nth( n );
						return this.fn( value, this.*nToKey(n), this );
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
