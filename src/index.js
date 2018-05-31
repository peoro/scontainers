
const straits = require('js-protocols');
const scontainerTraits = require('./traits/scontainers.js');

require('./utils.js');
require('./impl/core_generators.js');
require('./impl/core_traits.js');

const traits = new straits.utils.TraitSet();
Object.assign( traits, scontainerTraits );

traits.Range = require('./types/range');
require('./types/array');
require('./types/set');
require('./types/map');
require('./types/object.js');

module.exports = traits;
