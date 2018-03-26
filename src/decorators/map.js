
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const symbols = require('../symbols');
const generatorSymbols = require('../generator_symbols');
const {compileProtocolsForTransformation, implementProtocolsForTransformation, implementCoreProtocolsFromPropagator, defineProperties, parentCoreSymbols, deriveProtocolsForTransformation} = require('../processors/index.js')
const {implementSymbolsFromFactory} = require('../util.js');

const {len, nth, nToKey, hasKey, get} = symbols;

module.exports = {
	canProduce( Type ) {
		return true;
	},
	factory( Type ) {
		const proto = Type.prototype;

		class Map {
			static get name() { return `${Type.name}::Map`; }

			constructor( coll, mapFn ) {
				this.wrapped = coll;
				this.mapFn = mapFn;
			}

			toString( ) {
				return `${this.wrapped}.map(${this.mapFn.name || 'ƒ'})`;
			}
		}

		Map::defineProperties({
			ParentType: Type,
			parentCollectionKey: id`wrapped`,
			argKeys: [id`mapFn`],

			propagateEveryElement: true,
			propagateMultipleElements: false,
			createsNewElements: false,
		});

		{
			const ParentType = Type;
			const parentProto = ParentType.prototype;

			Map::compileProtocolsForTransformation({
				stage( kvn ) {
					const {mapFn} = this.args;
					kvn.value = mapFn.call( kvn.value, kvn.key, kvn.n );
					return kvn;
				},
				indexToParentIndex( index ) {
					return index;
				},

				len() {
					if( parentProto[len] ) {
						return function() {
							return this.inner.len();
						}
					}
				},
			});

			Map::deriveProtocolsForTransformation({
				stage( kvn ) {
					kvn.value = this.mapFn( kvn.value, kvn.key, kvn.n );
					return kvn;
				},
				indexToParentIndex( index ) { return index; },
				len() {
					if( parentProto[len] ) {
						return function( ) {
							return this.wrapped[len]();
						}
					}
				},
			});
		}

		extendCollection( Map, Type );

		return Map;
	}
};

const {extendCollection} = require('../index.js');
