
# Scontainers
Scontainers is a container/collection/iterator library for JavaScript, extremely comfortable to use, performant and versatile.

Scontainers offers functional-style operations like `forEach`, `map`, `filter`, `reduce` etc, similarly to [lodash](https://lodash.com/) and [underscore](https://underscorejs.org/), but it...

 - can be used with a nicer, more natural syntax. Scontainers is built using [`straits`](https://github.com/peoro/straits/): its functions can be called using the [straits syntax](https://github.com/peoro/straits/#straits-syntax), as free functions or as member symbols.
 - is blazing fast. Even million of times faster than the alternatives: as fast as writing a hand-tuned for loop.
 - it's more powerful and versatile: it works lazily and can be used on any kind of collection (objects, arrays of any kind, ES6 `Set` and `Map`, lazy structures like `Range` and so on). Iterators and collection's data can also be collected into any container of your choice.

  * [Quick example](#quick-example)
  * [How it works](#how-it-works)
    + [Core and derived traits](#core-and-derived-traits)
    + [Iterators](#iterators)
    + [Transformations](#transformations)
    + [Examples of some types and their traits](#examples-of-some-types-and-their-traits)
    + [Code generation and trait generators](#code-generation-and-trait-generators)
  * [API](#api)
    + [Types](#types)
      - [Range](#range)
      - [KVN](#kvn)
    + [Standard Types](#standard-types)
    + [Operations](#operations)
  * [Status of scontainers](#status-of-scontainers)

## Quick example
This example uses the [straits syntax](https://github.com/peoro/straits/#straits-syntax). Refer to the straits documentation to see how to use it with free functions or member symbols.

The following example transforms a string into the binary representation of its ASCII characters, then back to a string:
```javascript
import scontainers from 'scontainers';

use traits * from scontainers; // enabling the .* operator

const encoded =
  "★Hey!★"                           // "★Hey!★"
  .*map( char=>char.charCodeAt(0) )  // 9733, 72, 101, 121, 33, 9733
  .*filter( num=>num<128 )           // 72, 101, 121, 33
  .*map( num=>num.toString(2) )      // "1001000", "1100101", "1111001", "100001"
  .*map( str=>str.padStart(8, '0') ) // "01001000", "01100101", "01111001", "00100001"
  .*join( ' ' );                     // "01001000 01100101 01111001 00100001"

const decoded =
  encoded.split(' ')                     // "01001000", "01100101", "01111001", "00100001"
  .*map( bin=>parseInt(bin, 2) )         // 72, 101, 121, 33
  .*map( num=>String.fromCharCode(num) ) // "H", "e", "y", "!"
  .*join();                              // "Hey!"
```

## How it works
Scontainers introduces a set of traits (i.e. `symbol`s to be used as property keys) used to express the capabilities relevant to *collections* and *containers*:
 - *containers* are collections that store each of their elements in memory. An example could be `[1,2,3]`,
 - *collections* are objects that can logically contain zero or more elements. Some examples are `[1,2,3].*map(n=>n*n)` or `new Range(2, 7)`; of course `[1,2,3]` is a collection as well.

For instance, if an object has the `symbol` `nth`, then we know that such object is a collection whose elements can be enumerated, and the `n`th element of the collection can be accessed as `object.nth(n)`.

Scontainers currently supports collections that can be accessed the following ways:
 1. using a key, that can be of any kind. An example of this is `Map`.
 2. using an index: an integer between 0 and the size of the collection. Unless a different key access function is provided, the index can also be used as a key to access elements in the collection using the previous mechanism.

Elements of collections are represented as a [KVN object](#kvn), rather than a key-value pair.

### Core and derived traits
Scontainers defines a set of "core traits" that define some core properties of containers and collections and ways to access to these: the size of the collection, a way to access the `n`th element, the way to access an element with a given `key`, a way to tell whether an element belongs to the collection, ways to modify the collection, ways to iterate through the collection's elements etc. These core traits should be implemented only for those types or objects that can implement them natively and efficiently: the `len` trait to compute the size of a collection shouldn't be implemented by traversing the whole collection.

Other traits can be derived from existing ones, and these are called "derived traits". For instance, if all the elements of a collection can be accessed with indices ranging from `0` to `len()`, then the `forEach` and `reverse` operations can be automatically derived; if the `len` is available, or if it's possible to iterate through the whole collection, then `count` can be derived. These traits can of course be explicitly implemented as well, in case a smarter or more efficient implementation is available.

### Iterators
Scontainers implements the `Symbol.iterator` trait compatible to [the iterable protocol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#iterable), but it also defines other iterators: `kvIterator` and `kvReorderedIterator`.

`kvIterator` is used the same way as `iterator`, but the objects `next()` returns is either a [KVN](#kvn) or `undefined`.

`kvReorderedIterator` is able to handle synchronous iteration on reordered collections, like `[3,1,2].*sort()`.

### Transformations
Some of the traits defined by scontainers can be used to derive new collections from existing ones.

For instance `map`: it operates on a collection and returns a new collection with the same size; for each element `<index,key,value>` in the original collection, the resulting one has an element `<index,key,f(value,key,index)>`.

Another example is `filter`: it returns a collection like the original one stripped of the elements for which `f(value,key,index)` returns `false`.

Unless otherwise specified, transformations are lazy: they return a wrapper around the original collection, without processing or allocating any new data.

### Examples of some types and their traits
Let's look at some examples of some types and the traits they can implement...

 - `[1,2,3]`'s size is known (it's stored in its `.length` property) and its elements are enumerated and can be accessed using an index: `len` and `nth` are both implemented (for `Array.prototype`). Most scontainers operations are automatically derived for `Array`s and are available on `[1,2,3]`. The `get` trait that allows accessing items using a key is also implemented for `Array.prototype`: it behaves like `nth` (but it doesn't fail if the key is not a number or greater than `len`).
 - `[1,2,3].*map(n=>n*n)` implements the same traits as its `len` and `nth` traits wrap the ones of `[1,2,3]`.
 - `[1,2,3].*filter(n=>n%2)` cannot implement neither `len` nor `nth`: the size of this collection is unknown and we can't tell which element is the `n`th, unless we test every element starting from the first one. This collection can still be iterated through though, so the `count`, `forEach`, `map` traits, as well as many others, are still available.
 - `[1,2,3].*filter(n=>n%2).map(n=>n*n)`, `[1,2,3].*map(n=>n*n).*filter(n=>n%2)` and `[1,2,3].*map(n=>n*n).filter(n=>n%2).*filter(n=>n%3)` implement the same traits as `[1,2,3].*filter(n=>n%2)`: no further properties are lost by these operations, nor gained.

### Code generation and trait generators
In order to massively speed up scontainers operations, the code for some traits can be generated at runtime.

Take the following example:
```javascript
const c = [1,2,3];
const rc = c.*reverse();
const mrc = rc.*map( fn );
console.log( mrc.*nth(n) );
```
`mrc.*nth(n)` would call `rc.*nth(n)` which would call `c.*nth(m)` (with `m=c.*len()-n`) which would return `c[m]`. These nested calls are quite slow with the existing JavaScript engines. If you were to manually implement `mrc.*nth(n)`, the efficient version you would write would simply be `c[c.*len()-n]`.

Of course it's not possible to manually implement every operation for every collection and all their combination of transformations (which are infinite). What scontainers do is using "trait generators": some traits that expose all the necessary information to dynamically generate efficient code.

The code generation efforts are still ongoing: the generated code can be further optimized and code is not yet generated for many traits, but for many common operations scontainers is already achieving astonishing results.

## API

### Types

#### Range
Scontainers introduces `Range`: a virtual collection made of all the integers in a certain range.

```javascript
new Range( [[begin,] end] )
```

`Range` has the members properties `begin` and `end` and the method `len()`.

```javascript
new Range();        // Range from 0 to Infinity
new Range(10);      // Range from 0 to 10
new Range(20, 55);  // Range from 20 to 55

const assert = require('assert');
const rng = new Range();
assert.eq( rng.begin, 0 );
assert.eq( rng.end, Infinity );
assert.eq( rng.len(), Infinity );
```

#### KVN
A KVN is an object used to describe an element of a collection.

A KVN has up to three fields:
 - `key`: the key of an element
 - `value`: the element's value
 - `n`: the element's index

This concept is similar to a key-value pair, but is also able to carry information on the element's enumerable order.

Let's see a couple of examples: the KVN of the only element of `new Map([[2,"hey"]])` is `{key:2, value:"hey"}`. The KVN of the only element of `["yo"]` is `{key:0, n:0, value:"yo"}`. The KVN of the only element of `["a", "b"].*slice(1)` is `{key:1, n:0, value:"b"}`.

Most transformations try to preserve the original key of an element, while the index, if available, is always between `0` and `.*len()-1`.

Scontainers' native iterators (see the `kvIterator` and `kvReorderedIterator` traits) as well as functions meant to search for elements (e.g. `first`, `random`) return a KVN if an element is found or `undefined` if no element was found or if the end of the iterator has been reached.

### Standard Types

The scontainers traits are implemented for the following types:

 - `Array`
 - `Map`
 - `Set`
 - `String`: a collection of all the UTF-16 characters in the string.

`Object` doesn't implement the scontainers traits directly, but the traits are implemented for the own properties and the enumerable properties of an object:

 - `object.*ownProperties()`: a collection of all the own properties of `object`.
 - `object.*properties()`: a collection of all the enumerable properties of `object`.

### Operations

Scontainers defines the following traits:

 - `ContainerType.*from( collection )`, returns a new instance of a container of type `ContainerType` containing the elements of `collection`.

The following operations must be asymptotically fast; preferably O(1).

 - `collection.*len()`, returns the amount of elements of `collection`.

 - `collection.*nth( n )`, returns the value of the `n`th element of `collection`.
 - `collection.*nthKVN( n )`, returns the KVN (an object with `key`, `value` and `n` fields) for the `n`th element of `collection`.
 - `collection.*get( key )`, returns the value of the element with key `key` of `collection`.
 - `collection.*getKVN( key )`, returns the KVN of the element with key `key` of `collection`.

 - `collection.*has( value )`, tells whether `value` is an element of `collection`.
 - `collection.*hasKey( key )`, tells whether `collection` has an element with key `key`.


 - `collection.*nToKey( n )`, returns the key of the `n`th element of `collection`.
 - `collection.*keyToN( key )`, returns the index of the element of `collection` with key `key`.

 - `collection.*add( value )`, adds `value` to the collection.
 - `collection.*setNth( n, value )`, sets `value` as the `n`th element of `collection`.
 - `collection.*set( key, value )`, sets `value` as the element with key `key` in `collection`.

Consumers:

 - `collection.*forEach( fn )`, calls `fn(value, key, n)` for every item in `collection`
 - `collection.*whileEach( fn )`, calls `fn(value, key, n)` for every item in `collection`, it stops when `fn(value, key, n)` returns false.
 - `collection.*untilEach( fn )`, calls `fn(value, key, n)` for every item in `collection`, it stops when `fn(value, key, n)` returns true.
 - `collection.*every( fn )`, returns true if `fn(value, key, n)` returned true for every element of `collection`, false otherwise.
 - `collection.*some( fn )`, returns true if `fn(value, key, n)` returned true for at least one element of `collection`, false otherwise.

 - `collection.*count()`, returns the amount of elements of `collection`. It's semantically identical to `collection.*len()`, but could be way slower (it might be implemented by traversing the whole collection, if a better way is not available).
 - `collection.*isEmpty()`, true if `collection` has no elements, false othrwise.

 - `collection.*only()`, returns the only item in `collection`. If `collection` has more than one item, it throws an exception.
 - `collection.*one()`, returns one item in `collection`, whatever is faster to retrieve.
 - `collection.*first()`, returns the first item in `collection`. Asymptotically fast.
 - `collection.*last()`, returns the last item in `collection`. Asymptotically fast.
 - `collection.*random()`, returns a random item in `collection`. Asymptotically fast.

 - `collection.*swapNs( n1, n2 )`, swaps the elements with indices `n1` and `n2` in `collection`.
 - `collection.*swapKeys( k1, k2 )`, swaps the elements with keys `k1` and `k2` in `collection`.
 - `collection.*reduce( fn, initialValue )`, applies a function against an accumulator and each element in the collection (from left to right) to reduce it to a single value. Semantically similar to `Array.prototype.reduce`.
 - `collection.*reduceFirst( fn )`, like `collection.*reduce()`, except that it uses the first element of `collection` as initial value and it doesn't iterate on it.
 - `collection.*sum()`, returns the sum of all the numbers in `collection`.
 - `collection.*avg()`, returns the average of the numbers in `collection`.
 - `collection.*min()`, returns the smallest number in `collection`.
 - `collection.*max()`, returns the largest number in `collection`.
 - `collection.*join( sep='' )`, returns a string obtained joining all the string in `collection` together, with `sep` in between each couple of strings.

Decorators:

 - `collection.*iterator()`, an alias for `Symbol.Iterator`
 - `collection.*kvIterator()`, returns a KVN Iterator: either `null`, if `collection` was empty, or an object with three properties `key`, `value` and `n` and a method `next()`. The properties represent an element of `collection` we're iterating on, while `next()` returns `null`, if the end of the collection has been reached, or an element like itself representing the following element in the collection.
 - `collection.*kvReorderedIterator()`, returns a KVN Reordered Iterator: an object that has a property `state` and two callbacks `onNextFn` and `onEndFn`. It has the methods `proceed()`, `resume()` and `stop()` to control the state of the KVN Reordered Iterator and `onNext(cb)` and `onEnd(cb)` to register callback. A KVN Reordered Iterator is a more generic way to iterate on collections, which supports collections that are not in order (e.g. the result of `collection.*sort()` or `collection.*groupBy()`), although it's slower.

 - `collection.*collect(ContainerType)`
 - `collection.*collectInto(ContainerType)`

 - `collection.*reverse()`, returns a collection with the same elements as `collection`, but in reversed order.
 - `collection.*keys()`, returns a collection whose `iterator()` trait iterates on the keys of `collection`.
 - `collection.*values()`, returns a collection whose `iterator()` trait iterates on the values of `collection`.
 - `collection.*entries()`, returns a collection whose `iterator()` trait iterates on the entries of `collection` (arrays whose first element is the key and the second the value).

 - `collection.*enumerate()`, returns a collection identical to `collection`, but whose indices are numerated continuously when iterating on it.
 - `collection.*filter(fn)`, returns a collection containing the same elements as `collection` excluding those `fn(value, key, n)` returns false for.
 - `collection.*uniq(eq)`, returns a collection containing the same elements as `collection` excluding those that follow the same value as themselves.
 - `collection.*slice(begin, end)`, returns a slice of `collection`, between the element with index `begin` and that with index `end`.
 - `collection.*chunk(n)`, returns a collection made of slices of `collection`, each containing `n` elements.
 - `collection.*map(fn)`, returns a collection derived from `collection`, whose values are the result of `fn(value, key, index)`.
 - `collection.*mapKey(fn)`, returns a collection derived from `collection`, whose keys are the result of `fn(value, key, index)`.
 - `collection.*cache(ContainerType=Map)`, returns a collection that caches the values of `collection`. When directly accessing an element of this container, the element is cached in a container of type `ContainerType` and it will be retrieved from there for the following accesses.
 - `collection.*flatten()`: `collection` must be a collection of collections; returns a collection of the element inside the collections inside `collection`.
 - `collection.*flattenDeep()`, like `flatten()`, but recursive.
 - `collection.*concat(...collections)`, returns a collection with the element of `collection` and then the ones of the `collections`.
 - `collection.*skipWhile(fn)`, returns a collection identical to `collection` excluding all the elements `fn(value, key, n)` returns true for until the first element for which false is returned.
 - `collection.*takeWhile(fn)`, returns a collection identical to `collection` containing only the elements `fn(value, key, n)` returns true for until the first elements for which false is returned.
 - `collection.*skip(n)`, returns a collection containing all except the first `n` elements of `collection`.
 - `collection.*take(n)`, returns a collection containing the first `n` elements of `collection`.
 - `collection.*groupBy(fn)`, returns a collection of collections: each element of `collection` belongs to the collection with key `fn(value, key, n)`.
 - `collection.*cow(ContainerType=Map)`, returns a wrapper around `collection` which implements the modification traits and allocates a new container of type `ContainerType` with all the values of `collection` the first time it's modified.
 - `collection.*remap(fn)`, returns a collection whose keys and values are those of the KV returned by `fn(value, key, n)` for each element of `collection`.
 - `collection.*kvMap(fn)`, returns a collection with an element for each element of `collection`: the key for each element is a KV with the current key and the current value and the value is the one returned by `fn(value, key, n)`.
 - `collection.*unmap()`: `collection` must be a collection of collections; returns a collection with the key and value of the KV of each element of `collection`.
 - `collection.*unmapKeys()`: `collection` must be a collection whose keys are KV; returns a collection with the key and value of the KV of each key of `collection`.
 - `collection.*sort(cmp)`, returns a collection with the same elements as `collection`, sorted according to `cmp(kvn1, kvn2)`.
 - `collection.*shuffle()`, returns a collection with the same elements as `collection`, randomly sorted.
 - `collection.*permute()`, .
 - `collection.*groupWhile(fn)`, returns a collection of collections, each containing all the continuous elements `fn(value, key, n)` returned true for.
 - `collection.*repeat(n=Infinity)`, returns a collection identical to `collectcion` repeated `n` times.
 - `collection.*assign(...collections)`, return a collection where the elements of `collections` have been added (overwriting if necessary) to those of `collection`.
 - `collection.*defaults(...collections)`, return a collection where the elements of `collections` have been added to those of `collection`, without overwriting existing ones.

## Status of scontainers

Scontainers is still in its alpha stage. Some of its traits already work, but some might be broken and a few extremely important features are still missing.

In particular we still need to...

 - implement or fix several missing or broken traits,
 - implement or fix code generation for many traits,
 - expand test coverage,
 - make it possible to derive third party traits on existing collections and handle new versions better (see [status of straits](https://github.com/peoro/straits/#status-of-straits)),
 - improve documentation.
