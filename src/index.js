
// @flow
'use strict';



/*
interface Iter<K, T> {};

declare class Object implements Iter<string, T> {};
declare class Array<T> implements Iter<number, T> {};
declare class Map<K, T> implements Iter<K, T> {};
declare class Set<T> implements Iter<T, T> {};
*/

const assert = console.assert.bind( console );

const Symbols = {
	Get: Symbol(),
	Set: Symbol(),
	InstantiateSameType: Symbol(),
	ForEach: Symbol(),
	Map: Symbol()
};

// OK
Object.prototype[Symbols.Get] = function( k: string ): * { return this[k]; }

// OK
Object.prototype[Symbols.Set] = function<T>( k: string, value: T ): void { this[k] = value; }

// ERROR: can't use `typeof this`
// Object.prototype[Symbols.InstantiateSameType] = function(): typeof this { return Object.create( Object.getPrototypeOf(this) ); }
Object.prototype[Symbols.InstantiateSameType] = function(): * { return Object.create( Object.getPrototypeOf(this) ); }

// ERRORS: 
//  1: no `typeof this`
//  2: T and K aren't incompatible with the lambda function types
//  3: I'd like to somehow say that if `this` is Object then `K: string`; if `this` is Array then `K: number`; if `this` is Set then `T===K`...
// Object.prototype[Symbols.ForEach] = function<T, K>( fn: (T, K, typeof this)=>void ): void {
// 	if( this.forEach ) this.forEach( (value, key)=>fn(value, key, this) );
// 	else Object.entries(this).forEach( ([key, value])=>fn(value, key, this) );
// }
Object.prototype[Symbols.ForEach] = function( fn: (mixed, mixed, mixed)=>void ): void {
	if( this.forEach ) this.forEach( (value, key)=>fn(value, key, this) );
	else Object.entries(this).forEach( ([key, value])=>fn(value, key, this) );
}

type Iter<K,T> = {[string]: T};

// ERROR:
// ???<R>
Object.prototype[Symbols.Map] = function<K,T,U>( fn: (T, K, mixed)=>U ):  {
	const result = this[Symbols.InstantiateSameType]();
	this[Symbols.ForEach]((value, key)=>{
		result[Symbols.Set]( key, fn(value, key, this) );
	});
	return result;
}



/*
// type Iter<K,T> = Array<T> | {[string]:T} | Set<T> | Map<K,T>;
type Iter<K,T> = {[string]: T};

// declare function forEach<T>( arr: Array<T>, fn: (T, number, Array<T>)=>* ): void;
declare function forEach<T>( obj: {[string]:T}, fn: (T, string, {[string]:T})=>* ): void;
// declare function forEach<T>( set: Set<T>, fn: (T, T, Set<T>)=>* ): void;
// declare function forEach<K,T>( map: Map<K,T>, fn: (T, K, Map<K,T>)=>* ): void;

// declare function instantiateSameType<T>( arr: Array<T> ): Array<*>;
declare function instantiateSameType<T>( obj: {[string]:T} ): {[string]:*};
// declare function instantiateSameType<T>( set: Set<T> ): Set<*>;
// declare function instantiateSameType<K, T>( map: Map<K, T> ): Map<K, *>;

function map<K, T, R>(
	it: Iter<K,T>,
	fn: (T, K, Iter<K,T>)=>R
): Iter<K,R> {
	const newObj = instantiateSameType( it );
	forEach( it, (value, key)=>{
		newObj[key] = fn(value, key, it);
	});
	return newObj
}
*/

/*
declare module.exports: {
	map<K, T, R>(
		it: Iter<K,R>,
		fn: (T, K, Iter<K,T>)=>R
	): Iter<K,R>
}
*/

//function filter<T>( arr: iterable, fn:)

/*
declare type OIterateeWithResult<V, O, R> =
	| Object
	| string
	| ((value: V, key: string, object: O) => R);
declare type OIteratee<O> = OIterateeWithResult<any, O, any>;

declare type _Iteratee<T> = (
	item: T,
	index: number,
	array: ?Array<T>
) => mixed;
declare type Iteratee<T> = _Iteratee<T> | Object | string;


forEach<T>( iteratee: Iteratee<T> | OIteratee<T> ): (collection: Array<T> | { [id: any]: T }) => Array<T>;
forEach<T>(
	iteratee: Iteratee<T> | OIteratee<T>,
	collection: Array<T> | { [id: any]: T }
): Array<T>;


forEach<T>(array: ?Array<T>, iteratee?: Iteratee<T>): Array<T>;
forEach<T: Object>(object: T, iteratee?: OIteratee<T>): T;
*/
