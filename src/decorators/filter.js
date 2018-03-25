
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

const symbols = require('../symbols');

use protocols from subminus.symbols;

const {compileProtocolsForTransformation, implementProtocolsForTransformation, implementCoreProtocolsFromPropagator, defineProperties, parentCoreSymbols, deriveProtocolsForTransformation} = require('../processors/index.js')
const {implementSymbolsFromFactory} = require('../util.js');
const {semantics} = require('../compiler/index.js');

const {len, nth, nToKey, hasKey, get} = symbols;

module.exports = {
	canProduce( Type ) {
		return true;
	},
	factory( Type ) {
		class Filter {
			static get name() { return `${Type.name}::Filter`; }

			constructor( coll, fn ) {
				this.wrapped = coll;
				this.fn = fn;
			}

			toString( ) {
				return `${this.wrapped}.filter(${this.fn.name || 'ƒ'})`;
			}
		}

		Filter::defineProperties({
			ParentType: Type,
			parentCollectionKey: id`wrapped`,
			argKeys: [id`fn`],

			propagateEveryElement: false,
			propagateMultipleElements: false,
			createsNewElements: false,
		});

		{
			const ParentType = Type;
			const parentProto = ParentType.prototype;

			Filter::compileProtocolsForTransformation({
				kStage( compiler, kvn ) {
					const {fn} = compiler.getArgs( this );
					compiler.body.pushStatement(
						semantics.if( fn.call(kvn.value, kvn.key, kvn.n).not(),
							compiler.skip()
						)
					);
					return kvn;
				},
				keyToParentKey( compiler, key ) { return key; },
				len() {
					if( parentProto[len] ) {
						return function( compiler ) {
							return this::parentCoreSymbols.len( compiler );
						}
					}
				},
			});

			Filter::deriveProtocolsForTransformation({
				kStage( kvn ) {
					if( this.fn(kvn.value, kvn.key, kvn.n) ) {
						return kvn;
					}
				},
				keyToParentKey( key ) { return key; },
				len() {
					if( parentProto[len] ) {
						return function( ) {
							return this.wrapped[len]();
						}
					}
				},
			});
		}

		extendCollection( Filter, Type );
		return Filter;
	}
};

const {extendCollection} = require('../index.js');
