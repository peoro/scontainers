
const assert = require('assert');
const chai = require('chai');
const scontainers = require('./scontainers.js');
const {id} = require('../src/utils.js');

const {expect} = chai;

const flags = {
	missing: Symbol(`missing`),
	throwing: Symbol(`throwing`),
};

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
		if( data.values !== undefined && data.flatten === undefined ) {
			data.flatten = data.values;
		}
		if( data.flatten !== undefined && data.flattenDeep === undefined ) {
			data.flattenDeep = data.flatten;
		}

		if( data.len === undefined ) {
			data.len = flags.missing;
		}
		if( data.ns === undefined ) {
			data.ns = flags.missing;
		}

		function getTraitValue( traitName ) {
			try {
				switch( traitName ) {
					case id`ns`:
						return container.*nth ?
							container.*map( (v,k,n)=>n ).*collect( Array ) :
							flags.missing;
					}

				const trait = scontainers[traitName];
				assert( trait, `${traitName} not a scontainers trait` );
				if( ! container[trait] ) {
					return flags.missing;
				}

				switch( traitName ) {
					case id`values`:
					case id`keys`:
					case id`flatten`:
					case id`flattenDeep`:
						return container[trait]().*collect( Array );
					default:
						return container[trait]();
				}
			}
			catch( err ) {
				return flags.throwing;
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
	testContainer( [[], 2, [7, [3]]], {
		toString: `[[], 2, [7, [3]]]`,
		len: 3,
		values: [[], 2, [7, [3]]],
		keys: [0, 1, 2],
		ns: [0, 1, 2],
		flatten: [2, 7, [3]],
		flattenDeep: [2, 7, 3],
	});

	// testing `Set`
	testContainer( new Set(), {
		toString: `Set{}`,
		len: 0,
		sum: 0,
		values: [],
		keys: [],
	});
	testContainer( new Set([5, 3, 9]), {
		toString: `Set{5, 3, 9}`,
		len: 3,
		sum: 17,
		values: [5, 3, 9],
		keys: [undefined, undefined, undefined],
	});

	// testing `Map`
	testContainer( new Map(), {
		toString: `Map{}`,
		len: 0,
		sum: 0,
		values: [],
		keys: [],
	});
	testContainer( new Map([ ['a',1], [1,5], ['x', 3] ]), {
		toString: `Map{"a":1, 1:5, "x":3}`,
		len: 3,
		sum: 9,
		values: [1, 5, 3],
		keys: ['a', 1, 'x'],
	});

	// testing objects properties and own properties
	testContainer( {}.*properties(), {
		toString: `*{}`,
		count: 0,
		sum: 0,
		values: [],
		keys: [],
	});
	testContainer( {a:1, b:2}.*properties(), {
		toString: `*{"a":1, "b":2}`,
		count: 2,
		sum: 3,
		values: [1, 2],
		keys: ['a', 'b'],
	});
	testContainer( Object.assign( Object.create({a:1}), {b:2}).*properties(), {
		toString: `*{"b":2, "a":1}`,
		count: 2,
		sum: 3,
		values: [2, 1],
		keys: ['b', 'a'],
	});

	testContainer( {}.*ownProperties(), {
		toString: `*{}`,
		count: 0,
		sum: 0,
		values: [],
		keys: [],
	});
	testContainer( {a:1, b:2}.*ownProperties(), {
		toString: `*{"a":1, "b":2}`,
		count: 2,
		sum: 3,
		values: [1, 2],
		keys: ['a', 'b'],
	});
	testContainer( Object.assign( Object.create({a:1}), {b:2}).*ownProperties(), {
		toString: `*{"b":2}`,
		count: 1,
		sum: 2,
		values: [2],
		keys: ['b'],
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
