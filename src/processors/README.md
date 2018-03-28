
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
 - `core protocols` should include a function to access the parent collection (for decorators) and the root one... Or not?


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

`properties` and `ownProperties` need to be NOT collection protocols...

Add a `DefaultMap` type: it works like a `Map`, except it needs a `defaultConstructor(key)` function, and when you use `get` on a non existing item, it creates a new value using `defaultConstructor(key)`, adds it to the inner `Map` and returns it.
...Actually it could be a decorator! `Collection::default( defaultConstructor )` - only works with writable collections

Instead of `extractKeys`, use object deconstructors!!!

Rename `parent` to `inner`

CompilationFrame shouldn't have a weird `protocols` property with functions named like symbol that generate the symbol-calling code, ugh!
It should directly have the symbols, implemented to generate the symbol-calling code.
This way the code generator becomes easier to read, the symbol-call generators don't need to capture anything, and `frame.inner` can return the lower compilation frame, rather than the weird thing it currently returns...

I need to reintroduce a `use protocols from ${EXPR}` symbol, and resume using `.*` strictly.
With a regex I translate this stuff to regular JavaScript that can be parsed:
 - `.*${ID}` => `[_jsProtocol(ID)]`
 - `use protocols from ${EXPR}` => `_jsProtocolProvider(EXPR)`
 - `.*(${ID})` => `[ID]`
Then I can manipulate the AST, using e.g. a Babel plugin:
I find all the `_jsProtocolProvider` identifiers. I recurse the AST from them to the root, marking all the traversed `BlockStatement`s and the root's `Program` but the first one (note: the first traversed node needs to be one of them) with all the `EXPR` found in `_jsProtocolProvider` - this marking tell us that our `use protocols from` can be affected by others...
