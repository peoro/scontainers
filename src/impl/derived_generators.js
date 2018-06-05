
const {assert, traits, semantics, KVN} = require('../utils.js');
const Compiler = require('./compiler.js');

use traits * from traits.utils;
use traits * from traits.descriptors;
use traits * from traits.semantics;

function deriveProtocolsFromGenerators() {
	assert( this, `deriveProtocolsFromGenerators() must be called on an object` );

	const Type = this;

	// implementing core protocols from generators
	{
		use traits * from traits.generators;

		const proto = this.prototype;

		function deriveProtocols( protoObj ) {
			const factories = {};

			for( let key in protoObj ) {
				const factory = protoObj[key]();
				if( ! factory ) {
					continue;
				}

				factories[key] = {
					factory() {
						const compiler = new Compiler( Type, key );

						// compiler.body.*statement( compiler.debug() );

						const result = compiler.frame::factory();

						if( result ) {
							compiler.body.*return( result );
						}
						return compiler.compile();
					}
				};
			}

			return traits.scontainers.*addTraitFactories( proto, factories )
		}

		// deriving core protocols from protocol generators
		deriveProtocols({
			nthKVN() {
				if( Type.*nthKVN ) {
					return function() {
						const KVNVar = this.registerConstant( KVN, `KVN` );
						const n = this.registerParameter(`n`);
						const kvn = this.*nthKVN( n );
						return KVNVar.*new( kvn.key, kvn.value, kvn.n );
					}
				}
			},
			getKVN() {
				if( Type.*getKVN ) {
					return function() {
						const KVNVar = this.registerConstant( KVN, `KVN` );
						const n = this.registerParameter(`n`);
						const kvn = this.*getKVN( n );
						return KVNVar.*new( kvn.key, kvn.value, kvn.n );
					}
				}
			},
			nth() {
				if( Type.*nthKVN ) {
					return function() {
						const n = this.registerParameter(`n`);

						this.body
							.*statement( this.assert( semantics.id(`Number`).*member(`isInteger`).*call( n ) ) )
							.*if( semantics.or( n.*lt( this.*len() ) ),
								semantics.return( this.*nthKVN(n).value )
							);
					}
				}
			},
			get() {
				if( Type.*getKVN && Type.*hasKey ) {
					return function() {
						const key = this.registerParameter(`key`);

						this.body.*comment( `${Type.name} GET KVN` );

						const kvn = this.*getKVN( key );

						/*
						this.body
							.*comment( semantics.lit(`HAS KEY`) )
							.*if( this.*hasKey(key),
								this.body = semantics.block()
							)
						*/

						this.body.*return( kvn.value )
					}
				}
			},
			len() {
				if( Type.*len ) {
					return function() {
						return this.*len();
					}
				}
			},
			kvIterator() {
				if( Type.*nthKVN && this.*standardIteration ) {
					return function() {
						const fns = this.registerConstants({KVN});
						const Iterator = this.createUniqueVariable( `Iterator` );
						const thisI = semantics.this().*member( this.createUniqueVariable(`i`) );
						const thisLen = semantics.this().*member( this.createUniqueVariable(`len`) );
						const key = this.createUniqueVariable( `key` );
						const value = this.createUniqueVariable( `value` );

						let typeArgMapFn = this.typeArgMapFn;
						let body = this.body;
						const reset = ()=>{
							this.typeArgMapFn = typeArgMapFn;
							this.body = body;
						};

						{
							// will map all the type variables that are used to the variable member of `this`
							// `this.wrapped.mapFn` becomes:
							//  key:{name:mapFn, variable:this.wrapped.mapFn, fn:...}, value:this.mapFn
							const argVarMap = new Map();

							function rebase( variable ) {
								const rebaseRec = (variable)=>{
									if( variable.type === 'ThisExpression' ) {
										return this;
									}
									return rebaseRec( variable.object )
										.*member( variable.property, variable.computed );
								}
								return rebaseRec( variable );
							}

							// computing `Iterator.prototype.next` first
							{
								this.typeArgMapFn = function( arg ) {
									return argVarMap.*defaultGet( arg, ()=>semantics.this().*member( this.createUniqueVariable(arg.name) ) );
								};

								// as that's the one doing the actual computations
								// after it's compiled, we'll know which type arguments are needed
								this.ast.body.unshift(
									semantics.statement(
										Iterator.*member('prototype').*member('next').*assign(
											semantics.function(null, [], semantics.block()
												.*if( thisI.*lt(thisLen),
													this.body = semantics.block()
												)
											)
										)
									)
								);

								const kvn = this.*nthKVN( thisI );

								this.body .*return( fns.KVN.*new(kvn.key, kvn.value, thisI.*increment(false)) )

								reset();
							}

							// defining `Iterator`
							{
								const collection = this.createUniqueVariable(`collection`);
								this.typeArgMapFn = function( arg ) {
									return collection::rebase( arg.variable );
								};

								this.ast.body.unshift(
									semantics.declareFunction( Iterator, [collection],
										this.body = semantics.block()
											.*statement( thisI.*assign(0) )
									)
								);

								// assigning `thisLen`
								this.body.*statement( thisLen.*assign(this.*len()) );

								// assignign all the other arg vars
								argVarMap.forEach( (thisVar, collectionVar)=>{
									this.body.*statement(
										thisVar.*assign( collection::rebase(collectionVar.variable) )
									);
								});

								reset();
							}

							/*
							this.ast
								IteratorConstructor,
								Iterator.member('prototype').member('next').assign( nextFunction )
							);
							*/
						}

						// the main function only instantiates a new `Iterator`
						this.body
							.*return( Iterator.*new( semantics.this() ) );
					};
				}
			},
		})

		// deriving derived protocols
		deriveProtocols({
			forEach() {
				if( Type.*loop ) {
					return function() {
						const forEachFn = this.registerParameter(`forEachFn`);

						const kvn = this.*loop();

						this.body.*statement(
							forEachFn.*call( kvn.value, kvn.key, kvn.n )
						);
					}
				}
			},
			reduce() {
				if( Type.*loop ) {
					return function() {
						const reduceFn = this.registerParameter(`reduceFn`);
						const initialValue = this.registerParameter(`initialValue`);

						const state = this.createUniqueVariable(`state`);

						const outsideLoop = this.body;
						this.body.*declare( state, initialValue, `var` );
						const kvn = this.*loop();
						this.body.*statement( state.*assign( reduceFn.*call(state, kvn.value, kvn.key, kvn.n) ) );

						this.body = outsideLoop;
						this.body.*return( state );
					}
				}
			},
		});
	}
}

module.exports = {
	deriveProtocolsFromGenerators
};
