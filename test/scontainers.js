
const scontainers = require('../src/index.js');
const loadScontainers = require('../src/loader.js');

module.exports = {
	standard: scontainers,
	debug: loadScontainers({ debug:true }),
	onlyGeneration: loadScontainers({ debug:true, generation:true, derivation:false }),
	onlyDerivation: loadScontainers({ debug:true, generation:false, derivation:true }),
	full: loadScontainers({ debug:true, generation:true, derivation:true }),
};
