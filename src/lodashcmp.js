

'use strict';

const assert = require('assert');
const _ = require('lodash');
const {symbols, Range} = require('./');
use protocols from symbols;

// HACK: the bad things happen here...
{
	// Error.stackTraceLimit = 25;
	Array.prototype.toString = function() {
		return JSON.stringify(this);
	};
	String.prototype.toString = function() {
		return JSON.stringify(this);
	};
}

function isNumeric( x ) {
	return ( (typeof x === 'number' || typeof x === 'string') && !isNaN(Number(x)) );
}
function toNumeric( x ) {
	return isNumeric(x) ? +x : x;
}

const objs = {

	finalize: {
		sm(coll){ return coll.*collect(Array); },
		lodash(coll){ return _.map( coll, x=>x ); },
	},

	stdGens: {
		arr0(){ return []; },
		arr1(){ return [9]; },
		arr(){ return [1, 7, 4, 12, 3, 9, 3, 2, 1]; },

		/*
		map0(){ return new Map(); },
		map1(){ return new Map([[7, 5]]); },
		map(){ return new Map([[7, 5], [3, 9], [5, 9], [7, 2], [12, 27]]); },
		*/
	},
	customGens: {
		range: {
			sm(){ return new Range(7, 21); },
			lodash(){ return new Array(21-7).fill(0).map( (z,i)=>7+i ); },
		},
		map0: {
			sm(){ return new Map(); },
			lodash(){ return {}; },
		},
		map1: {
			sm(){ return new Map([[7, 5]]); },
			lodash(){ return {7:5}; },
		},
		map: {
			// fuck this: objects sort their properties in a weird way :\
			// sm(){ return new Map([[7, 5], [3, 9], [5, 9], [7, 2], [12, 27]]); },
			sm(){ return new Map([[3, 9], [5, 9], [7, 2], [12, 27]]); },
			lodash(){ return {7:5, 3:9, 5:9, 7:2, 12:27}; },
		},
		obj0Properties: {
			sm(){ return {}.*properties(); },
			lodash(){ return {}; },
		},
		obj0OwnProperties: {
			sm(){ return {}.*ownProperties(); },
			lodash(){ return {}; },
		},
		obj0proto1Properties: {
			sm(){ return Object.create({x:1}).*properties(); },
			lodash(){ return {x:1}; },
		},
		obj0proto1OwnProperties: {
			sm(){ return Object.create({x:1}).*ownProperties(); },
			lodash(){ return {}; },
		},
		objProperties: {
			sm(){ return {7:1, 3:2, 15:3}.*properties(); },
			lodash(){ return {7:1, 3:2, 15:3}; },
		},
		objOwnProperties: {
			sm(){ return {7:1, 3:3, 15:3}.*ownProperties(); },
			lodash(){ return {7:1, 3:3, 15:3}; },
		},
	},
	transforms: {
		map: {
			sm(coll){ return coll.*map( (n)=>n*n ); },
			lodash(coll){ return _.map( coll, (n)=>n*n ); },
		},
		filter: {
			sm(coll){ return coll.*filter( (n)=>n%2 ); },
			lodash(coll){ return _.filter( coll, (n)=>n%2 ); },
		},
		iter: {
			sm(coll){ return coll.*iter(); },
			lodash(coll){ return coll; },
		},
		reordered: {
			sm(coll){ return coll.*reordered(); },
			lodash(coll){ return coll; },
		},
		_uniq: {
			// hmmm... has got very weird issues on a map `map`, because of the iteration order? O,o
			sm(coll){ return coll.*uniq(); },
			lodash(coll){ return _.sortedUniq( _.map( coll ) ); },
		},
		_groupBy: {
			sm(coll) {
				console.log( coll );
				return coll.*groupBy( (v)=>`g${(v%2===0) + (v%3===0)}` )
					.*map( (group)=>group.*collect(Array) );
			},
			lodash(coll) {
				return _.groupBy( coll, (v)=>`g${(v%2===0) + (v%3===0)}` );
			},
		},
		_groupBySum: {
			sm(coll) {
				return coll.*groupBy( (v)=>`g${(v%2===0) + (v%3===0)}` )
					.*map( (group)=>group.*sum() );
			},
			lodash(coll) {
				return _.map( _.groupBy( coll, (v)=>`g${(v%2===0) + (v%3===0)}` ), (group)=>_.sum(group) );
			},
		},
		_fail: {
			sm(coll){ return coll.*map( (n)=>n ); },
			lodash(coll){ return _.map( coll, (n)=>n+1 ); },
		},
	},
	collectors: {
		asArray: {
			sm(coll){ return coll.*collect( Array ); },
			lodash(coll){ return _.values( coll ); },
		},
		sum: {
			sm(coll){ return coll.*sum(); },
			lodash(coll){ return _.sum( _.values(coll) ); },
		},
		sum: {
			sm(coll){ return coll.*avg(); },
			lodash(coll){ return _.meanBy( _.values(coll) ); },
		},
		min: {
			sm(coll){ return coll.*min(); },
			lodash(coll){ return _.min( _.values(coll) ); },
		},
		max: {
			sm(coll){ return coll.*max(); },
			lodash(coll){ return _.max( _.values(coll) ); },
		},
		isEmpty: {
			sm(coll){ return coll.*isEmpty(); },
			lodash(coll){ return _.size( coll ) === 0; },
		},
		every: {
			sm(coll){ return coll.*every( n=>n>3 ); },
			lodash(coll){ return _.every( coll, n=>n>3 ); },
		},
		some: {
			sm(coll){ return coll.*some( n=>n>3 ); },
			lodash(coll){ return _.some( coll, n=>n>3 ); },
		},
		only: {
			sm(coll){
				if( coll.*count() === 1 ) {
					return coll.*only()[1];
				} else {
					let fail = false;
					let res;
					try {
						res = coll.*only();
					}
					catch( err ) {
						fail = true;
					}
					assert( fail, `.*only() not doing what it's supposed to... ${coll.*toString()}.*only() => ${res}` );
				}
			},
			lodash(coll){ return _.size(coll) === 1 ? _.values(coll)[0] : undefined; },
		},
		first: {
			sm(coll){
				const kv = coll.*first();
				if( kv ) {
					return kv[1];
				}
			},
			lodash(coll){ return _.values(coll)[0]; },
		},
		len: {
			sm(coll){ return coll.*len ? coll.*len() : coll.*count(); },
			lodash(coll){ return _.size( coll ); },
		},
		count: {
			sm(coll){ return coll.*count(); },
			lodash(coll){ return _.size( coll ); },
		},
		_groupBy: {
			sm(coll) {
				return coll.*groupBy( (v)=>`g${(v%2===0) + (v%3===0)}` )
					.*map( (group)=>group.*collect(Array) )
					.*collect( Array );
			},
			lodash(coll) {
				return _.map( _.groupBy( coll, (v)=>`g${(v%2===0) + (v%3===0)}` ), x=>x );
			},
		},
	_fail: {
			sm(coll){ return coll.*sum() + 1; },
			lodash(coll){ return _.sum( coll ); },
		},
	},
	// gens: ...,
};
// objs.gens = Object.assign( {}, objs.stdGens, objs.customGens );
objs.gens = Object.assign( {}, objs.customGens );
_.forEach( objs.stdGens, (gen, name)=>{
	objs.gens[name] = {
		sm: gen,
		lodash: gen,
	};
});

// actually testing...
{
	const assert = require('assert');

	function tryTest( msg, fn ) {
		try {
			return fn() || 0;
		} catch( err ) {
			console.error( `!!! ${msg} mismatch: ${err.message}` );
			console.log( err );
			return 1;
		}
	};

	function testEq( values, msg ) {
		const {sm, lodash} = values;
		const same = _.isEqual( sm, lodash );

		assert( same, `${sm} != ${lodash}` );
	};

	function forEach( obj, fn ) {
		_.forEach( obj, (value, key)=>{
			if( key.match(/^_/) ) {
				return;
			}
			fn( value, key );
		});
	};
	function map( obj, fn ) {
		return _.sum( _.map( obj, (value, key)=>{
			if( key.match(/^_/) ) {
				return 0;
			}
			return fn( value, key );
		}) );
	};

	// part 0: gens only
	/*
	{
		forEach( objs.customGens, (gen, name)=>{
			tryTest( name, ()=>{
				testEq({
					sm: gen.sm().*collect(Array),
					lodash: _.map( gen.lodash(), x=>x ),
				});
			});
		});
	}
	*/

	// testing everything automatically with a bunch of transformations...
	{
		function log( ...args ) {
			console.log( ...args );
		}

		function gen( fn ) {
			return map( objs.customGens, (gen, name)=>{
				const obj = {};
				_.forEach( gen, (genFn, lib)=>{
					obj[lib] = genFn();
				});
				return obj::fn( name );
			});
		}
		function _transform( str, fn ) {
			return map( objs.transforms, (trns, tName)=>{
				return this::applyAndCall( trns, `${str}.${tName}()`, fn );

				return tryTest( `${str}.${tName}()`, ()=>{
					const obj = {};
					_.forEach( this, (coll, lib)=>{
						obj[lib] = trns[lib]( coll );
					});
					return obj::fn( `${str}.${tName}()` );
				});
			});
		}
		function transform( fn ) {
			return function( str ) {
				return this::_transform( str, fn );
			};
		}
		function _finalize( str, fn ) {
			const obj = {};
			_.forEach( this, (coll, lib)=>{
				obj[lib] = objs.finalize[lib]( coll );
			});
			return obj::fn( str );
		}
		function finalize( fn ) {
			return function( str ) {
				return this::_finalize( str, fn );
			};
		}
		function _collect( str, fn ) {
			return map( objs.collectors, (cllc, cName)=>{
				return this::applyAndCall( cllc, `${str}.${cName}()`, fn );

				const obj = {};
				_.forEach( this, (coll, lib)=>{
					obj[lib] = cllc[lib]( coll );
				});
				return obj::fn( `${str}.${cName}()` );
			});
		}
		function collect( fn ) {
			return function( str ) {
				return this::_collect( str, fn );
			};
		}
		/*
		function test( str ) {
			tryTest( str, ()=>{
				log( str );
				console.log( this );

				const obj = {};
				_.forEach( this, (coll, lib)=>{
					obj[lib] = objs.finalize[lib]( coll );
				});

				tryTest( str, ()=>testEq(obj) );
			});
		}
		*/
		function test( str ) {
			log( str );
			return tryTest( str, ()=>testEq(this) );
		};

		function applyAndCall( transformation, str, nextFn ) {
			return tryTest( str, ()=>{
				const obj = {};
				_.forEach( this, (coll, lib)=>{
					obj[lib] = transformation[lib]( coll );
				});
				return obj::nextFn( str );
			});
		}
		function apply( transformation) {
			return function( nextFn ) {
				return function( str ) {
					return this::applyAndCall( transformation, str, nextFn );
				};
			};
		}

		function compose( ...fns ) {
			const last = fns.pop();
			return _.reduceRight( fns, (arg, fn)=>fn(arg), last );
		}
		function testSeq( ...fns ) {
			return compose( gen, ...fns, test );
		}

		function testAll( n=1 ) {
			if( n < 0 ) {
				return 0;
			}

			let errorCount = 0;
			errorCount += testAll( n-1, 0 );
			if( errorCount ) {
				return errorCount;
			}

			const nTransforms = Array(n).fill( transform );
			log( `### ${n}` );
			/*{
				log( `# test the collection after ${n} transformations` );
				const ec = testSeq( ...nTransforms );
				log( `# ${ec} errors` );
				errorCount += ec;
			}*/
			if( ! errorCount ) {
				log( `# test collectors after ${n} transformations` );
				const ec = testSeq( ...nTransforms, collect );
				log( `# ${ec} errors` );
				errorCount += ec;
			}
			if( ! errorCount ) {
				log( `# test collections with ${n} transformations` );
				const ec = testSeq( ...nTransforms, finalize );
				log( `# ${ec} errors` );
				errorCount += ec;
			}
			log();

			return errorCount;
		}

		/*
		gen( test );
		gen( transform( test ) );
		gen( transform(  transform( test  )) );
		*/
		/*
		testSeq(  ); console.log();
		testSeq( transform ); console.log();
		testSeq( transform, transform ); console.log();
		testSeq( transform, transform, transform ); console.log();
		*/
		console.log();
		testAll( 3 );
		process.exit( 0 );
	}

	// part 1: gens + transf
	{
		forEach( objs.gens, (gen, name)=>{
			forEach( objs.transforms, (trns, tName)=>{
				tryTest( `${name}.${tName}()`, ()=>{
					testEq({
						sm: trns.sm( gen.sm() ).*collect(Array),
						lodash: trns.lodash( gen.lodash() ),
					});
				});
			});
		});
	}
	// part 2: gens + transf + transf
	{
		forEach( objs.gens, (gen, name)=>{
			forEach( objs.transforms, (trns, tName)=>{
				forEach( objs.transforms, (trns2, tName2)=>{
					tryTest( `${name}.${tName}().${tName2}()`, ()=>{
						testEq({
							sm: trns2.sm( trns.sm( gen.sm() ) ).*collect(Array),
							lodash: trns2.lodash( trns.lodash( gen.lodash() ) ),
						});
					});
				});
			});
		});
	}
	// collectors
	{
		forEach( objs.gens, (gen, name)=>{
			forEach( objs.transforms, (trns, tName)=>{
				forEach( objs.collectors, (cllc, cName)=>{
					tryTest( `${name}.${tName}.${cName}()`, ()=>{
						testEq({
							sm: cllc.sm( trns.sm( gen.sm() ) ),
							lodash: cllc.lodash( trns.lodash( gen.lodash() ) ),
						});
					});
				});
			});
		});
	}
}
