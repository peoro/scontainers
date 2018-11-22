
const straits = require('straits');

use traits * from straits.core;

// core traits
const coreTraits = straits.utils.TraitSet.fromKeys({
	// *** static methods
	from( collection ){},	// return a new instance of the collection constructed from `collection`

	// naturally-indexed collections (e.g. Array, Range)
	nth( n ){},	// return the ${n}-th element - O(1)
	nthKVN( n ){},	// NOTE: it doesn't check to see if `n` is there - O(1)
	setNth( n, value ){},	// sets the ${n}-th element to ${value} - O(1)
	truncate( n ){},	// shortens ${this} to contain the first ${n} elements only, discarding the others - O(1)
	// needed to make naturally-indexed collections compatible with the associative collection API:
	nToKey( n ){},	// return the key associated to the ${n}-th element (${get( nToKey(n) ) === nth(n)})
	keyToN( key ){},	// return the index associated to the element with key ${key} (${get(key) === nth(keyToN(key))})

	// associative collections (e.g. Map)
	// note that naturally-indexed collections are also associative, thanks to `nToKey` and `keyToN`
	get( key ){},	// return the value of key ${key} - O(1)
	getKVN( key ){},	// NOTE: it doesn't check to see if ${key} is there - O(1)
	set( key, value ){},	// set ${value} as value for ${key} - O(1)
	hasKey( key ){},	// return true if ${this} has a key ${key}, false otherwise - O(1)
	deleteKey( key ){},	// remove the item with key ${key} from ${this}

	// unindexed collections (e.g. Set, a list)
	has( item ){},	// return true or false depending on whether ${item} is in ${this} - O(1)
	delete( item ){},	// removes ${item} from ${this} - O(1)

	// collections without a key, or with automatic key (e.g. Set, naturally-indexed collections)
	add( value ){},	// adds ${value} to ${this} - O(1)

	// collections with known size
	len(){},	// return the number of elements in the collection - O(1)

	// reversible collections
	reverse(){},	// reverse iteration order - O(1)

	reserve( n ){},	// makes ${this} ready to host a total of ${n} items - O(1)

	clear(){},	// remove every item from ${this} - O(1)

	// iterable collections
	//iterator(){}, // not redefining it: reusing `[Symbol.Iterator]`
	kvIterator(){}, // identical to `[Symbol.Iterator]`, except the returned value is always in the form [key, value]
	kvReorderedIterator(){},
	// kvAsyncIterator(){}, // TODO: hmmmm...

	inplace(){},	// like ${consume}, but it must modify ${this} in place, otherwise it fails
});

// automatically implemented traits
const derivedTraits = straits.utils.TraitSet.fromKeys({
	// madifying functions
	// TODO: shouldn't these be core? they need to make assumptions on how to grow e.g. Array
	push( value ){},	// add ${value} to the end of ${this} - O(1)
	unshift( value ){},	// add ${value} to the beginning of ${this} - O(1)
	pop(){},	// remove the element at the end of ${this} - O(1)
	shift(){},	// remove the element at the beginning of ${this} - O(1)
	insert( n, value ){},	// insert ${value} after the ${n}-th element of ${this}
	remove( n ){},	// remove the ${n}-th element of ${this}, shifting all the following ones

	// iterating functions
	forEach( fn ){},	// call ${fn(value, key)} for every item in ${this} - O(n)
	whileEach( fn ){},	// - O(n)
	untilEach( fn ){},	// - O(n)

	// length information functions
	count(){},	// return the number of elements in the collection - any cost, often O(n)
	isEmpty(){},	// return true if the collection is empty, false otherwise - O(1)

	// special access functions - they all return KVNs
	only(){},	// return the only item in ${this} - O(1)
	first(){},	// return the first item in ${this} - O(1)
	last(){},	// return the last item in ${this} - O(1)
	random(){},	// return a random item in ${this} - O(n) // TODO: or O(1) ?
	find( fn ){},	// returning a KV
	findLast( fn ){},	// returning a KV

	swapNs( n1, n2 ){},	// swap two elements (by n)
	swapKeys( k1, k2 ){},	// swap two elements (by key)
	reduce( fn, initialValue ){},
	reduceFirst( fn ){},

	// reductions
	sum(){},
	avg(){},
	min(){},
	max(){},
	join( sep='' ){},	// returns a string
	every( fn ){},
	some( fn ){},

	sort( TargetArrayType=Array ){},
	shuffle(){},
	permute(){},

	collect( TargetType ){},	// creates a new ${TargetType} made of the content of ${this}
	consume( TargetType ){},	// like ${collect}, but might modify (and even return) ${this}

	// TODO: the following still need to be implemented
	remap( fn ){},	// [k:v]::remap( fn(v,k)->(k':v') ) -> [k':v']
	kvMap( fn ){},	// [k:v]::kvMap( fn(v,k)->v' ) -> [(k,v):v'] // .*mapKey( (v,k)=>{k,v} ).*map( (v,{k})=>fn(v,k) )
	unmap( fn ){},	// [(k,v)]::unmap() -> [k:v]
	unmapKeys( fn ){},	// .*keys().*unmap()
	allProperties(){},	// not iterable - manages all properties, owned or not, enumerable or not

	collectInto( target ){},
	repeat( n ){},
	// loop(){}, // repeat( Infinity )
});

const decoratorTraits = straits.utils.TraitSet.fromKeys({
	auto(){},	// after this, any operation will be available regardless of supported traits and complexity - if some are not supported, we automatically `collect` into a working type.
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
	cow( CopyType ){},	// copy on write: collects() as soon as you try to modify it
	groupBy( fn ){},
	flatten(){},
	flattenDeep(){},
	concat( ...collections ){},
	skipWhile( fn ){},
	takeWhile( fn ){},
	skip( n ){},
	take( n ){},
	assign( ...collections ){},
	defaults( ...collections ){},

	groupWhile(){},	// like `.*uniq`
});


derivedTraits.*assign({
	iterator: Symbol.iterator,
	toString: straits.common.toString,
});

const traits = ({}).*assign( derivedTraits, coreTraits, decoratorTraits );
traits.coreTraits = coreTraits;
traits.derivedTraits = derivedTraits;
traits.decoratorTraits = decoratorTraits;

module.exports = traits;

if( require.main === module ) {
	console.log( Object.keys(traits).join(`, `) );
}
