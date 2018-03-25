
# Processors

The modules in this directory offer "processors": helpers to implement all the protocols for our collections.

When defining a new collection only a few core protocols or helping functions are needed. The processors can use those to generate many of the remaining protocols.

Currently we have two different processors, that can be used simultaneously:
 - `impl` is the simpler one. It's fed with JavaScript functions or protocol definitions, and expands the collection with other protocols that call the supplied ones.
  - `compiler` dynamically compiles the protocols for our collections, resulting in superior performance, or zero-cost abstraction.

Both processors offer two functions to implement protocols for our collections: one for root collections (e.g. `Array`, `Range` etc) and one for decorators (e.g. `Filter`, `Zip`).
These take a processor configuration object that can contain protocol implementations or helper functions (usually most useful for decorators).

## Definitions

 - `protocol`: a function with a well defined signature and semantics, set to a Symbol key of an object.
 - `collection`: an object that implements all the applicable `protocols`.
 - `root collection`: a collection generating data out of stuff which is not a collection. It includes `Array`, `Map`, `Range`, `Fibonacci` etc.
 - `decorator`: a collection that is built on top of another. The data it contains is derived from the data of the inner collection.
 - `(collection) core protocols`: the core protocols to manipulate a collection. For instance `nth`, `get`, `len` etc. They're defined in "/src/symbols.js".
 - `(collection) derived protocols`: higher level protocols that are generated from `core protocols`. For instance `forEach`, `reduce`, `count`. They're defined in "/src/symbols.js".

 Definitions useful to our Compiler processor:
 - `compiler`: the component that stores the AST we're generating and offers functions to manipulate it and turn into actual code.
 - `collection compiler`: a `compiler` meant to compile collection protocols. It keeps track of stuff like `value`, `key`, loop's `body` etc.
 - `code generator`: a function that modifies the AST of a compiler to implement some semantics.
 - `protocol generator`: a protocol that work as a `code generator` and is meant to dynamically generate the code for `core protocols`. They're defined in "/src/generator_symbols.js".

## Impl processor

The Impl Processor Configuration is an object whose keys are protocol names or special keywords, and whose values are functions: protocol implementations for root collections, or protocol factories for derived collections.

The special functions are:
 - `nStage( n, innerStage )`: to ease the implementation of `nth` and `stage`.
 - `stage( key, innerStage )`: to ease the implementation of `get` and `hasKey`.
 - `nToParentN( n )`: to ease the implementation of `nToKey` and `keyToParentKey`.
 - `keyToParentKey( key )`: to ease the implementation of `keyToN`.

## Compiler Processor

The Compiler Processor Configuration is an object whose keys are protocol generator names or special keywords, and whose values are functions: protocol implementations for root collections, or protocol factories for derived collections.

The special functions are:
 - `nStage( compiler, n, innerStage )`: to ease the implementation of `nth` and `stage`.
 - `stage( compiler, key, innerStage )`: to ease the implementation of `get` and `hasKey`.
 - `nToParentN( compiler, n )`: to ease the implementation of `nToKey` and `keyToParentKey`.
 - `keyToParentKey( compiler, key )`: to ease the implementation of `keyToN`.





# TODOs
 - `Collection` or `Container`?
 - I should get rid of `Propagator`, but rather do something similar to `core generators`: the object passed to the impl processor should be allowed to contain stuff which is not a core protocol (e.g. `nToParentN`, `parentCollection`, `stage`, `nStage`), and this should be used to generate `core protocols` when necessary.
 - both the compiler and the impl (which includes propagator) processor, should use the same collection properties. These should also include stuff like writable.
 - `core protocols` should include a function to access the parent collection (for decorators) and the root one... Or not?
 - instead of `propertiesSymbol`, we should have a whole set of symbols used for properties, like we're doing for collection protocols and collection protocol generators.


## For Decorators

 - `kvIterator` <- `next`+`parent.kvIterator`
 - `kvReorderedIterator` <- `next`+`parent.kvReorderedIterator`
 - `get` <- `next`+`parent.get`+`keyToParentKey` // same for `nth`

## For everything

 - `kvReorderedIterator` <- `kvIterator`

Enumerable stuff should provide `nToKey` and `keyToN`. Using this the following pairs can be derived from each other:

 - `get` - `nth`
 - `hasKey`
 - `setNth` - `set`
 - `keyToParentKey` - `nToParentN`

The following options can automate the implementation of some protocols:

 - `isInfinite:true` -> no `reverse`
 - `alwaysPropagate:true`+`propagateMulti:false` -> `hasKey`, `len`

## Last minute ideas:

`map`, `entries`, `values`, `keys`, `map_key`, `cache`, `cow`, `iter`, `reordered` should all specialize the same base class

Stuff like Cache and Cow should return a memoized specialized function dynamically, rather than statically.

It should be possible to compile a super efficient function call...
```
p = placeholder
new Range( 10, p(0) )::map( squareFn )::filter( p(1) )::reduce::compile( sumFn )
```

When compiling, If we detect that the same non-Literal-nor-Identifier expression is used in multiple places,
we should store that in a variable.

Stuff like `sorted` should have `len`, `get`, maybe(?) `nth` (it's log n, hmmm, maybe another name? logNth? lol), but no iteration etc.

### Properties:

 - `args`
 - `isInfinite`

Decorators:
 - `parentCollection`
 - `ParentType`
 - `alwaysPropagate`
 - `propagateMulti`
 - `needState`
 - `reorder`
 - `changeKey`
 - `changeValue`

## TODOs

 - get rid of `forAny` and the others: `forEach` should do it -- TODO: should we??

## NOTEs

### Chunk
Compiling into a loop within a loop.
If the parent iterator can be duplicated, it should return an iterator of iterators, otherwise reordered iterators.
### Filter
### Flatten
### GroupBy
Compiling into a loop within a loop.
### SkipWhile
Iterable only.
Should generate a pre-loop where it keeps skipping, and then a good one.
### TakeWhile
Iterable only.
### Slice
It's like skip+take+mapKey



TODO: Whenever assigning any "standard" protocol, whether it's a generator or an impl one, I should always set a generic function and implement a [[compiled]] and [[impl]] protocols to it.
the generic function chooses a version between [[compiled]] and [[impl]], takes it, assigns it, and reassigns all the old protocols to the new function.

Probably also for `impl` we need some symbols that are semantically different from the standard ones...
The standard symbols could do extra stuff, like `nth(n)` should assert that `n` is an integer, and make sure that it's between 0 and len-1...
The `impl` one should return a `KV` instead, that can be used to implement `hasNth` and all the rest.
Should we have a `KVN`, instead of a `KV`, if the collection is also enumerable?
And then, maybe... a `K` for sets? :F
