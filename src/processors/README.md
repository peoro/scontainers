
# Processors

The modules in this directory offer "processors": functions that implement protocols for our collections.

When defining a new collection only a few core protocols need to specified. Using them, the processors can generate the remaining core protocols and the derived ones.

 - impl processes protocols in a straightforward way, implementing them using the supplied ones directly.
 - propagator uses the "propagator" approach: an object that defines a bunch of properties for the Collection, simplifying the definition of some protocols.
 - compiler uses the "compiler" approach: generating code for `new Function`.
 - properties should be used to define some static properties of the collection, useful to compiler and propagator

## Propagator

## Compiler

A Collection that wishes to use the compiler module should use a "Compiler Definition", an object providing everything necessary for the compilation.

Decorators's Properties need to have:
 - `parentType()`

 And their Compiler Definition needs to have:
 - `parentCollection()`: a function that returns the parent collection `this` is transforming


Every compilable collection's Properties needs to include:
 - `args`: an object with the argument of the collection. The keys are the names of the arguments and their value is a function returning the argument for the collection instance `this`.

Besides `args`, a Compiler Definition should provide compilers for the functions it wishes to use for compilation:
 - `len()`, returning an Expression with the length of the collection
 - `next( compiler )`, generating the code to do the equivalent of Propagator's `next`. It finds `code`, `key`, `value`, `loop` and `body` in `compiler`, and can use and modify these values freely.
 - `get( compiler, value, key )`
 - `stage( compiler, parentStage )`, `nStage( compiler, parentStage )`, only for derived compilers

 Note that these functions have a slightly different semantics from the core protocols. These functions should will be called with a `this` object with the following properties:
  - `this.parent`, to be used to call parent's compiler functions
  - `this.args`: an objects matching `Properties.args` whose values are Expressions nodes carrying the value of the arg.
  - the available methods (e.g. `len` etc)

The processor will create an object with functions meant to compile code for the core prototypes, set it as the [compilerSymbol] property of the collection.

### Implementation NOTEs

The Compiler Definition functions are very simple.
The ones for decorators receive an extra parameter compared to the root type ones: the result computed by the lower level.
The Compiler processor uses these definitions to generate the actual protocols. While the thing is straightforward for root types, it's slightly more complicated for decorators.
For decorators, Compiler recurses through the parents. If one ancestor lacks a core function we need, we give up and generate no function. We can end the recursion in two other cases: reaching the root type, or reaching a type with no Compiler Definition. In either case we get their value, and start bubbling up, effectively `reduce`ing the computed value.

# To think about

The following stuff can be automatically generated in a number of ways...

## For Decorators

 - `kvIterator` <- `next`+`parent.kvIterator`
 - `kvReorderedIterator` <- `next`+`parent.kvReorderedIterator`
 - `get` <- `next`+`parent.get`+`keyToParentKey` // same for `nth`

## For everything

 - `kvReorderedIterator` <- `kvIterator`

Enumerable stuff should provide `nToKey` and `keyToN`. Using this the following pairs can be derived from each other:

 - `get` - `nth`
 - `hasKey` - `hasNth`
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

 - Rename `nthKey` to `nToKey`
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
