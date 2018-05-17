
const straits = require('js-protocols');

const generatorTraits = straits.utils.TraitSet.fromKeys({
	// core protocol generators: static methods, explicitely implemented by a collection
	// these are used to dynamically generate core and derived protocols for higher performance

	// naturally-indexed collections (e.g. Array, Range)
	nthKVN( n ){},	// return the ${n}-th element - O(1)
	setNth( n, value ){},
	// needed to make naturally-indexed collections compatible with the associative collection API
	nToKey( n ){},	// return the key associated to the ${n}-th element (${get( nToKey(n) ) === nth(n)})
	keyToN( key ){},

	// associative collections (e.g. Map)
	// note that naturally-indexed collections are also associative, thanks to `nToKey` and `keyToN`
	getKVN( key ){},	// return the value of key ${key} - O(1)
	set( key, value ){},	// set ${value} as value for ${key} - O(1)
	hasKey( key ){},	// return true if ${this} has a key ${key}, false otherwise - O(1)

	//
	// delete( ? ){},	// deletes

	// unindexed collections (Set)
	has( item ){},	// return true or false depending on whether ${item} is in ${this} - O(1)

	// collections without a key, or with automatic key (e.g. Set, extendible naturally-indexed collections)
	add( value ){},	// adds ${value} to ${this} - O(1)

	// collections with known size
	len(){},	// return the number of elements in the collection - O(1)

	// clearable collection
	clear(){},	// removes every item from ${this} - O(n)

	// iterable collections
	loop(){},
});

module.exports = generatorTraits;
