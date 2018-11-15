
const assert = require('assert');
const chai = require('chai');
const scontainerSet = require('./scontainers.js');
const loadScontainers = require('../src/loader.js');

const {expect} = chai;

describe(`scontainers`, function(){
	it(`loader works`, function() {
		let getFn;
		let mapTrait;

		{
			const scontainers = scontainerSet.standard;
			use traits * from scontainers;

			expect( [].*iter ).to.equal(undefined);
			expect( [1,2,3].*map(x=>x).*toString() ).to.equal(`*[1, 2, 3]`);

			getFn = [].*map( x=>x ).*get.factory().toString();
			mapTrait = scontainers.map;
			expect( getFn ).to.equal( [].*map( x=>x ).*get.factory().toString() );
			expect( mapTrait ).to.equal( scontainers.map );
		}

		{
			const scontainers = scontainerSet.onlyDerivation;
			use traits * from scontainers;

			expect( [].*iter ).to.be.a(`function`);
			expect( [1,2,3].*map(x=>x).*toString() ).to.equal(`*[1, 2, 3]`);
			expect( getFn ).not.to.equal( [].*map( x=>x ).*get.factory().toString() );
			expect( mapTrait ).not.to.equal( scontainers.map );
		}

		{
			const scontainers = loadScontainers();
			use traits * from scontainers;

			expect( [].*iter ).to.equal(undefined);
			expect( [1,2,3].*map(x=>x).*toString() ).to.equal(`*[1, 2, 3]`);
			expect( getFn ).to.equal( [].*map( x=>x ).*get.factory().toString() );
			expect( mapTrait ).not.to.equal( scontainers.map );
		}
	});

	require('./manual_tests.js');
	require('./derived_vs_generated.js');
	require('./lodash.js');
	require('./test.js');
});
