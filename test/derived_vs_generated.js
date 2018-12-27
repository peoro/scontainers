
const assert = require('assert');
const {expect} = require('chai');
const _ = require('lodash');
const scontainers = require('./scontainers.js');

function isNumeric( x ) {
	return ( (typeof x === 'number' || typeof x === 'string') && !isNaN(Number(x)) );
}
function toNumeric( x ) {
	return isNumeric(x) ? +x : x;
}

function prepareData( scontainers ) {
	const {Range} = scontainers;

	use traits * from scontainers;

	const generators = {
		arr0(){ return []; },
		arr1(){ return [9]; },
		arr(){ return [1, 7, 4, 12, 3, 9, 3, 2, 1]; },
		map0(){ return new Map(); },
		map1(){ return new Map([[7, 5]]); },
		map(){ return new Map([[7, 5], [3, 9], [5, 9], [7, 2], [12, 27]]); },
		set0(){ return new Set(); },
		set1(){ return new Set([4]); },
		set(){ return new Set([8, 12, -3, 5, 9, 0]); },
		range0(){ return new Range(0); },
		range1(){ return new Range(1); },
		range(){ return new Range(7, 21); },
		obj0Properties(){ return {}.*properties(); },
		obj0OwnProperties(){ return {}.*ownProperties(); },
		obj0proto1Properties(){ return Object.create({x:1}).*properties(); },
		obj0proto1OwnProperties(){ return Object.create({x:1}).*ownProperties(); },
		objProperties(){ return {7:1, 3:2, 15:3}.*properties().*mapKey( toNumeric ); },
		objOwnProperties(){ return {7:1, 3:3, 15:3}.*ownProperties().*mapKey( toNumeric ); },
	};
	const transformers = {
		map: [ (n)=>n*n ],
		filter: [ (n)=>n%2 ],
		iter: [],
		reordered: [],
		uniq: [],
		// groupBy: [ (v)=>`g${(v%2===0) + (v%3===0)}` ],
	};
	const consumers = {
		collect: [ Array ],
		sum: [],
		avg: [],
		min: [],
		max: [],
		isEmpty: [],
		every: [ n=>n>3 ],
		some: [ n=>n>3 ],
		only: [],
		first: [],
		len: [],
		count: [],
	};

	function traitCallDescriptionToCalls( obj ) {
		for( let traitName in obj ) {
			const trait = scontainers[traitName];
			assert( trait, `Unknown trait ${traitName}` );
			const args = obj[traitName];

			obj[traitName] = function( coll ) {
				return coll[trait].apply( coll, args );
			};
		}
	}

	traitCallDescriptionToCalls( transformers );
	traitCallDescriptionToCalls( consumers );

	return {
		generators,
		transformers,
		consumers,
	};
}

function test( objs, maxDepth ) {
	// testing everything automatically with a bunch of transformations...

	// given a set of collections `colls`, applies all the functions in `obj`
	const applyAll = function( colls, obj, nextFn ) {
		_.forEach( obj, (fnObj, fnName)=>{
			const nextColls = {};
			_.forEach( fnObj, (fn, lib)=>{
				try {
					nextColls[lib] = fn( colls[lib] );
				}
				catch( err ) {
					assert( err instanceof Error );
					nextColls[lib] = err;
				}
			});
			nextFn( fnName, nextColls );
		});
	};

	for( let depth = 0; depth <= maxDepth; ++depth ) {
		let outerIt = it;
		let innerIt = function( str, fn ) { this::fn(...arguments); };
		outerIt(`automatically combined collections with up to ${depth} intermediate transformations match`, function(){
			/*
			// `rec` is meant to run...
			applyAll( {}, objs.generators, (stepName, results)=>{
				applyAll( results, objs.transformers, (stepName, results)=>{
					applyAll( results, objs.transformers, (stepName, results)=>{
						applyAll( results, objs.consumers, (stepName, results)=>{
						});
					});
				});
			});
			*/
			const rec = function( opObjs, values={}, str=`` ) {
				if( opObjs.length === 0 ) {

					innerIt( str, function(){
						expect( values.generated, str ).to.deep.equal( values.derived );
					});

					return;
				}

				const opObj = opObjs[0];
				const nextOpObjs = opObjs.slice( 1 );

				applyAll( values, opObj, (stepName, results)=>{

					for( let lib in results ) {
						const res = results[lib];
						if( res instanceof Error ) {
							innerIt( `${str}     [throws]`, function(){
								expect( res.generated, str ).to.equal( res.derived );
							});

							return;
						}
					}

					const newStr = str ? `${str}.${stepName}()` : `${stepName}()`;
					// describe( str, function(){
					rec( nextOpObjs, results, newStr );
					// });
				});
			};

			// rec( [objs.generators, objs.transformations, objs.transformations, objs.transformations, objs.consumers] )
			rec( [objs.generators, ...Array(depth).fill(objs.transformers), objs.consumers] );
		}).timeout( 5000 );
	}
}

describe(`compare generated with derived traits`, function() {
	// const generatedData = prepareData( scontainers.onlyGeneration );
	const generatedData = prepareData( scontainers.full );
	const derivatedData = prepareData( scontainers.onlyDerivation );

	// merging data together
	const mergeData = function( ...dataSets ) {
		const dataSet = dataSets[0];

		const data = {};
		for( let opName in dataSet ) {
			data[opName] = {};

			for( let key in dataSet[opName] ) {
				data[opName][key] = {
					generated: generatedData[opName][key],
					derived: derivatedData[opName][key],
				};
			}
		}

		return data;
	};

	test( mergeData(generatedData, derivatedData), 2 );
});
