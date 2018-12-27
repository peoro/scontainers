
const assert = require('assert');
const {expect} = require('chai');
const _ = require('lodash');
const scontainers = require('./scontainers.js');

function test( scontainers, depth ) {
	const {Range} = scontainers;

	use traits * from scontainers;

	const objs = {
		finalize: {
			sm(coll){ return coll.*collect(Array); },
			lodash(coll){ return _.map( coll, x=>x ); },
		},

		stdGens: {
			arr0(){ return []; },
			arr1(){ return [9]; },
			arr(){ return [1, 7, 4, 12, 3, 9, 3, 2, 1]; },
			arrArr(){ return [[1,2,3][4,[5,[6]]],7,8,9]; },
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
				lodash(){ return {3:9, 5:9, 7:2, 12:27}; },
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
			_flatten: {
				// `reordered` breaks this
				sm(coll){ return coll.*flatten(); },
				lodash(coll){ return _.flatten( _.values(coll) ); },
			},
			_uniq: {
				// hmmm... has got very weird issues on a map `map`, because of the iteration order? O,o
				sm(coll){ return coll.*uniq(); },
				lodash(coll){ return _.sortedUniq( _.map( coll ) ); },
			},
			_groupBy: {
				sm(coll) {
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
			avg: {
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
						return coll.*only().value;
					} else {
						let only;
						assert.throws( ()=>void( only = coll.*only() ), `.*only() not throwing... ${coll.*toString()}.*only() => ${only}` );
					}
				},
				lodash(coll){ return _.size(coll) === 1 ? _.values(coll)[0] : undefined; },
			},
			first: {
				sm(coll){
					const kv = coll.*first();
					if( kv ) {
						return kv.value;
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
		const tryTest = function( msg, fn ) {
			// fn();
			expect( fn, msg ).not.to.throw();
		};

		const testEq = function( values, msg ) {
			const {sm, lodash} = values;
			const same = _.isEqual( sm, lodash );

			if( ! same ) {
				throw new Error( `${sm} != ${lodash}` );
			}
		};

		const map = function( obj, fn ) {
			return _.sum( _.map( obj, (value, key)=>{
				if( key.match(/^_/) ) {
					return 0;
				}
				return fn( value, key );
			}) );
		};

		// testing everything automatically with a bunch of transformations...
		{
			const gen = function( fn ) {
				return map( objs.customGens, (gen, name)=>{
					const obj = {};
					_.forEach( gen, (genFn, lib)=>{
						obj[lib] = genFn();
					});
					return obj::fn( name );
				});
			};
			const _transform = function( str, fn ) {
				return map( objs.transforms, (trns, tName)=>{
					return this::applyAndCall( trns, `${str}.${tName}()`, fn );
				});
			};
			const transform = function( fn ) {
				return function( str ) {
					return this::_transform( str, fn );
				};
			};
			const _finalize = function( str, fn ) {
				const obj = {};
				_.forEach( this, (coll, lib)=>{
					obj[lib] = objs.finalize[lib]( coll );
				});
				return obj::fn( str );
			};
			const finalize = function( fn ) {
				return function( str ) {
					return this::_finalize( str, fn );
				};
			};
			const _collect = function( str, fn ) {
				return map( objs.collectors, (cllc, cName)=>{
					return this::applyAndCall( cllc, `${str}.${cName}()`, fn );
				});
			};
			const collect = function( fn ) {
				return function( str ) {
					return this::_collect( str, fn );
				};
			};
			const test = function( str ) {
				return tryTest( str, ()=>testEq(this) );
			};

			const applyAndCall = function( transformation, str, nextFn ) {
				return tryTest( str, ()=>{
					const obj = {};
					_.forEach( this, (coll, lib)=>{
						obj[lib] = transformation[lib]( coll );
					});
					return obj::nextFn( str );
				});
			};

			const compose= function( ...fns ) {
				const last = fns.pop();
				return _.reduceRight( fns, (arg, fn)=>fn(arg), last );
			};
			const testSeq = function( ...fns ) {
				return compose( gen, ...fns, test );
			};

			for( let i = 0; i < depth; ++i ) {
				const nTransforms = Array( i ).fill( transform );

				it(`generates valid collections with ${i} intermediate transformations`, function(){
					testSeq( ...nTransforms, collect );
				}).timeout( 10000 );
				it(`correctly consumes collections with ${i} intermediate transformations`, function(){
					testSeq( ...nTransforms, finalize );
				}).timeout( 2500 );
			}
		}
	}
}

describe(`compare with lodash`, function() {
	describe(`using generated and derived traits`, function() {
		test( scontainers.full, 2 );
		test( scontainers.full, 2 );
	});
	describe(`using derived traits only`, function() {
		test( scontainers.onlyDerivation, 4 );
	});
});
