
const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;

const generatorSymbols = new protocols.util.Protocol();

// core protocol generators: static methods, explicitely implemented by a collection
// these are used to dynamically generate core and derived protocols for higher performance
generatorSymbols[utilSymbols.defineAndAssign]( {}, {
	// naturally-indexed collections (e.g. Array, Range)
	nthKVN( compiler, n ){},	// return the ${n}-th element - O(1)
	setNth( compiler, n, value ){},
	// needed to make naturally-indexed collections compatible with the associative collection API
	nToKey( compiler, n ){},	// return the key associated to the ${n}-th element (${get( nToKey(n) ) === nth(n)})
	keyToN( compiler, key ){},

	// associative collections (e.g. Map)
	// note that naturally-indexed collections are also associative, thanks to `nToKey` and `keyToN`
	getKVN( compiler, key ){},	// return the value of key ${key} - O(1)
	set( compiler, key, value ){},	// set ${value} as value for ${key} - O(1)
	hasKey( compiler, key ){},	// return true if ${this} has a key ${key}, false otherwise - O(1)

	//
	// delete( ? ){},	// deletes

	// unindexed collections (Set)
	has( compiler, item ){},	// return true or false depending on whether ${item} is in ${this} - O(1)

	// collections without a key, or with automatic key (e.g. Set, extendible naturally-indexed collections)
	add( compiler, value ){},	// adds ${value} to ${this} - O(1)

	// collections with known size
	len( compiler ){},	// return the number of elements in the collection - O(1)

	// clearable collection
	clear( compiler ){},	// removes every item from ${this} - O(n)

	// iterable collections
	loop( compiler,  ){},
});

module.exports = generatorSymbols;
