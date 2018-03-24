
const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;

const symbols = new protocols.util.Protocol();

// static methods
symbols[utilSymbols.defineAndAssign]( {}, {
	from( collection ){},	// return a new instance of the collection constructed from `collection`
});

// core protocols: a collection should explicitely implement them
symbols[utilSymbols.defineAndAssign]( {}, {
	// naturally-indexed collections (e.g. Array, Range)
	nth( n ){},	// return the ${n}-th element - O(1)
	setNth( n, value ){},
	// needed to make naturally-indexed collections compatible with the associative collection API
	nToKey( n ){},	// return the key associated to the ${n}-th element (${get( nToKey(n) ) === nth(n)})
	keyToN( key ){},	// return the index associated to the element with key ${key} (${get(key) === nth(keyToN(key))})

	// associative collections (e.g. Map)
	// note that naturally-indexed collections are also associative, thanks to `nToKey` and `keyToN`
	get( key ){},	// return the value of key ${key} - O(1)
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

	// reversible collections
	reverse(){},	// reverse iteration order - O(1)

	// clearable collection
	clear(){},	// removes every item from ${this} - O(n)

	// iterable collections
	// iterator(){}, // not redefining it: reusing `[Symbol.Iterator]`
	kvIterator(){}, // identical to `[Symbol.Iterator]`, except the returned value is always in the form [key, value]
	kvReorderedIterator(){},
	// kvAsyncIterator(){}, // TODO: hmmmm...
});

// derived protocols, automatically implemented
symbols[utilSymbols.defineAndAssign]( {}, {
	forEach( fn ){},	// call ${fn(value, key)} for every item in ${this} - O(n)
	whileEach( fn ){},
	untilEach( fn ){},

	// TODO: should we remove these?
	forAny( fn ){},	// like `forEach`, but also works with reordered iterators
	whileAny( fn ){},
	untilAny( fn ){},

	count(){},	// return the number of elements in the collection - any cost, often O(n)
	isEmpty(){},	// return true if the collection is empty, false otherwise - O(1)

	only(){},	// return the only item in ${this} - O(1)
	first(){},	// return the first item in ${this} - O(1)
	last(){},	// return the last item in ${this} - O(1)
	random(){},	// return a random item in ${this} - O(n) // TODO: or O(1) ?

	swap( k1, k2 ){}, // swap two elements (by key)
	reduce( fn ){},
	reduceFirst( fn ){},
	sum(){},
	avg(){},
	min(){},
	max(){},
	every( fn ){},
	some( fn ){},
	// TODO: the following still need to be implemented
	find( fn ){},	// returning a KV
	findLast( fn ){},	// returning a KV

	toString(){},	// prints the content of the collection (prefixed with a `*`)
	collect( TargetType ){},	// creates a new `TargetType` made of the content of `this`
	consume( TargetType ){},	// like `collect`, but might modify (and even return) `this`

	// stream functions
	keys(){},	// mostly needed because of `iterator`: iterates on a single value, rather than a KV
	values(){},	// mostly needed because of `iterator`: iterates on a single value, rather than a KV
	entries(){},	// mostly needed because of `iterator`: iterates on a KV
	properties(){},	// iterable: it's the enumerable properties
	ownProperties(){},	// the own properties of `this`
	enumerate(){},	// map( value => {count, value} )
	filter( fn ){},
	uniq(){},	// removes consecutive duplicates
	slice( begin, end ){},
	chunk( n ){},
	map( fn ){},
	mapKey(){},
	cache( CacheType ){},	// cache values resulting from `get()`, `nth()` etc. NOTE: it doesn't cache iteration!
	iter(){},	// removes other properties, leaves kvIterator only
	reordered(){},	// removes other properties, leaves kvReorderedIterator only
	flatten(){},
	flattenDeep(){},
	concat( ...collections ){},
	skipWhile( fn ){},
	takeWhile( fn ){},
	skip( n ){},
	take( n ){},
	groupBy( fn ){},
	cow( CopyType ){},	// copy on write: collects() as soon as you try to modify it

	// TODO: the following still need to be implemented
	remap( fn ){}, // [k:v]::remap( fn(v,k)->(k':v') ) -> [k':v']
	kvMap( fn ){}, // [k:v]::kvMap( fn(v,k)->v' ) -> [(k,v):v'] // .*mapKey( (v,k)=>{k,v} ).*map( (v,{k})=>fn(v,k) )
	unmap( fn ){}, // [(k,v)]::unmap() -> [k:v]
	unmapKeys( fn ){}, // .*keys().*unmap()
	sort(){},
	shuffle(){},
	permute(){},
	groupWhile(){},
	allProperties(){}, // not iterable - manages all properties, owned or not, enumerable or not

	assign( ...collections ){},
	defaults( ...collections ){},

	collectInto( target ){},
	repeat( n ){},
	loop(){}, // repeat( Infinity )
});

symbols.iterator = Symbol.iterator;

module.exports = symbols;
