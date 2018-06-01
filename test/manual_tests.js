
const assert = require('assert');
const chai = require('chai');
const scontainers = require('./scontainers.js');
const {id} = require('../src/utils.js');

const {expect} = chai;

function test( scontainers ) {
	const {Range} = scontainers;

	use traits * from scontainers;

	function testContainer( container, data ) {
		if( data.ns !== undefined && data.keys === undefined ) {
			data.keys = data.ns;
		}
		if( data.len !== undefined && data.count === undefined ) {
			data.count = data.len
		}

		function getTraitValue( traitName ) {
			const trait = scontainers[traitName];

			switch( traitName ) {
				case id`values`:
				case id`keys`:
					return container[trait]().*collect( Array );
				case id`ns`:
					return container.*map( (v,k,n)=>n ).*collect( Array );
				default:
					return container[trait]();
			}
		}

		describe( container.toString(), function(){
			for( let key in data ) {
				it( `.*${key}()`, function(){
					const value = getTraitValue( key );
					if( typeof value === 'object' ) {
						expect( getTraitValue(key) ).to.deep.equal( data[key] );
					}
					else {
						expect( getTraitValue(key) ).to.equal( data[key] );
					}
				});
			}
		});
	}

	// testing `Range`
	testContainer( new Range(0), {
		toString: `*[]`,
		len: 0,
		sum: 0,
		values: [],
		keys: [],
		ns: [],
	});
	testContainer( new Range(3), {
		toString: `*[0, 1, 2]`,
		len: 3,
		sum: 3,
		values: [0, 1, 2],
		ns: [0, 1, 2],
	});
	testContainer( new Range(2, 5), {
		toString: `*[2, 3, 4]`,
		len: 3,
		sum: 9,
		values: [2, 3, 4],
		ns: [0, 1, 2],
		keys: [2, 3, 4],
	});
	testContainer( new Range(3, 10).*slice(2, 5), {
		toString: `*[5, 6, 7]`,
		len: 3,
		sum: 18,
		values: [5, 6, 7],
		ns: [0, 1, 2],
		keys: [5, 6, 7],
	});

	// testing `Array`
	testContainer( [], {
		toString: `[]`,
		len: 0,
		sum: 0,
		values: [],
		ns: [],
	});
	testContainer( [2, 7, 3], {
		toString: `[2, 7, 3]`,
		len: 3,
		sum: 12,
		values: [2, 7, 3],
		keys: [0, 1, 2],
		ns: [0, 1, 2],
	});
	testContainer( [7, 1, 9, 5, 2].*slice(1, 4), {
		toString: `*[1, 9, 5]`,
		len: 3,
		sum: 15,
		values: [1, 9, 5],
		ns: [0, 1, 2],
		keys: [1, 2, 3],
	});

	// testing `Set`
	testContainer( new Set(), {
		toString: `Set{}`,
		len: 0,
		sum: 0,
		values: [],
	});
	testContainer( new Set([5, 3, 9]), {
		toString: `Set{5, 3, 9}`,
		len: 3,
		sum: 17,
		values: [5, 3, 9],
	});

	// testing `Map`
	testContainer( new Map(), {
		toString: `Map{}`,
		len: 0,
		sum: 0,
		values: [],
	});
	testContainer( new Map([ ['a',1], [1,'a'], ['x', 'y'] ]), {
		toString: `Map{"a":1, 1:"a", "x":"y"}`,
		len: 3,
		values: [1, 'a', 'y'],
		keys: ['a', 1, 'x'],
	});
}

describe(`hand written tests`, function() {
	describe(`using derived traits only`, function() {
		test( scontainers.onlyDerivation );
	});
	describe(`using generated and derived traits`, function() {
		test( scontainers.full );
	});
});
