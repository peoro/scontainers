
'use strict';

const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');

const symbols = require('../symbols');

use protocols from subminus.symbols;

const {compileProtocolsForTransformation, implementProtocolsForTransformation, defineProperties, parentCoreSymbols, deriveProtocolsForTransformation} = require('../processors/index.js')
const {implementSymbolsFromFactory} = require('../util.js');
const {semantics} = require('../compiler/index.js');

module.exports = {
	canProduce( Type ) {
		return true;
	},
	factory( Type ) {
		class Filter {
			static get name() { return `${Type.name}::Filter`; }

			constructor( coll, filterFn ) {
				this.wrapped = coll;
				this.filterFn = filterFn;
			}

			toString( ) {
				return `${this.wrapped}.filter(${this.filterFn.name || 'ƒ'})`;
			}
		}

		Filter::defineProperties({
			InnerCollection: Type,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`filterFn`],

			transformStream: true,
		});

		{
			const ParentType = Type;
			const parentProto = ParentType.prototype;

			Filter::compileProtocolsForTransformation({
				kStage( kvn ) {
					this.pushStatement(
						semantics.if(
							this.args.filterFn.call( kvn.value, kvn.key, kvn.n ).not(),

							this.skip()
						)
					);
					return kvn;
				},
				keyToParentKey( key ) {
					return key;
				},

				len() {
					if( parentProto.*len ) {
						return function( compiler ) {
							return this.inner.*len( compiler );
						}
					}
				},
			});

			Filter::deriveProtocolsForTransformation({
				kStage( kvn ) {
					if( this.filterFn(kvn.value, kvn.key, kvn.n) ) {
						return kvn;
					}
				},
				keyToParentKey( key ) { return key; },
				len() {
					if( parentProto.*len ) {
						return function( ) {
							return this.wrapped.*len();
						}
					}
				},
			});
		}

		return Filter;
	}
};
