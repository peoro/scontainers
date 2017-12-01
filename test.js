
'use strict';

const assert = require('assert');

const symbols = {};
const localSymbols = {};


// utility functions to define symbols;

localSymbols.set = Symbol('set');
Symbol.prototype[localSymbols.set] = function(target, fn) {
	target[this] = fn;
	return this;
}

function define( name ) {
	return localSymbols[name] = symbols[name] = Symbol(name);
}
function defineAndAssign( name, target, fn ) {
	return define(name)[localSymbols.set]( target, fn );
}

function renameFunction( fn, name ) {
	return new Function(`const ${name}=${fn.toString()}; return ${name}`)();
}
function createFunction( name, code, argLength=0 ) {
	const args = Array(argLength).fill().map( (_, i)=>`arg${i}` );
	const argList = args.join(', ');

	return new Function(`return function ${name}(${argList}) { ${code.replace('{{args}}', argList)} }`)();
}
function createFunctionWrapper( type, fnName ) {
	const fn = type[fnName];
	return createFunction( fn.name, `return ${type.name}.${fnName}.call(${type.name}, ${fn.length>1 ? `this, {{args}}` : `this`});`, fn.length-1 );
}

// each key-value of `isTypeObj` is `(is-type, type)`: `is-type` is the name of the symbol: a function that will return `true` for objects of type `type`, and `false` for all the others.
function defineIsTypeFunctions( isTypeObj ) {
	Object.entries( isTypeObj ).forEach( ([isType, type])=>{
		const symbol = define( isType );
		Object.prototype[symbol] = createFunction(isType, `return false;`);
		type.prototype[symbol] = createFunction(isType, `return true;`);
	});
}
function defineIsTypeFunctions( types ) {
	types.forEach( (type)=>{
		assert( type && type.name, `Type with no name ${type}` );
		const isType = `is${type.name}`;
		console.log( isType );
		const symbol = define( isType );
		Object.prototype[symbol] = createFunction(isType, `return false;`);
		type.prototype[symbol] = createFunction(isType, `return true;`);
	});
}

// for each member function of `type`, whose name is listed in `fnNames`, turns it into a method for all the objects of type `type`.
function staticFunctionsToProtocol( type, fnNames ) {
	fnNames.forEach( (fnName)=>{
		assert( type[fnName] && type[fnName][localSymbols.isFunction]() );

		const symbol = define( fnName );
		type.prototype[symbol] = createFunctionWrapper( type, fnName );
		// console.log( `${type.name}.prototype.${symbols[localSymbols.fnName].toString()} = ${type.prototype[localSymbols.symbol]}` );
	});
}
// fns.forEach( obj[fns] )
function staticFunctionsToProtocol2( type, obj, fns ) {
	fns.forEach( (fn)=>{
		const fnName = fn.name;
		const symbol = define( fnName );
		type.prototype[symbol] = createFunctionWrapper( obj, fnName );
	});
}


// defining a bunch of symbols
{
	/*
	defineIsTypeFunctions({
		isArray: Array,
		isBoolean: Boolean,
		isDate: Date,
		isFunction: Function,
		isNumber: Number,
		isRegExp: RegExp,
		isString: String
	});
	*/
	defineIsTypeFunctions([
		Function,
		Boolean,
		Symbol,
		Error,
		EvalError,
		// InternalError,
		RangeError,
		ReferenceError,
		SyntaxError,
		TypeError,
		URIError,
		Number,
		Date,
		String,
		RegExp,
		Array,
		Int8Array,
		Uint8Array,
		Uint8ClampedArray,
		Int16Array,
		Uint16Array,
		Int32Array,
		Uint32Array,
		Float32Array,
		Float64Array,
		Map,
		Set,
		WeakMap,
		WeakSet,
		ArrayBuffer,
		DataView,
		Promise,
		// Generator,
		// GeneratorFunction,
		// AsyncFunction,
		Proxy,
	]);

	staticFunctionsToProtocol2( Object, Object, [
		Object.assign,	// takes a variadic list of arguments
		Object.getOwnPropertyDescriptor,
		Object.getOwnPropertyDescriptors,
		Object.keys,
		Object.values,
		Object.entries,
		Object.is,	// we'd rather specialize this
		Object.defineProperty,
		Object.defineProperties,
		Object.getOwnPropertyNames,
		Object.getOwnPropertySymbols,
		Object.isExtensible,
		Object.preventExtensions,
		Object.freeze,
		Object.isFrozen,
		Object.seal,
		Object.isSealed,
	]);

	staticFunctionsToProtocol2( Number, Number, [
		Number.isFinite,
		Number.isInteger,
		Number.isNaN,
		Number.isSafeInteger,
	]);

	symbols.assign
		[localSymbols.set]( Object.prototype, function assign(arg){ Object.assign.apply(Object, [this].concat(arguments)); });

	symbols.is
		[localSymbols.set]( Object.prototype, function is(obj2){ return this === obj2; })
		[localSymbols.set]( Number.prototype, function is(num2){ return Number.isNaN(this) === Number.isNaN(num2); });

	defineAndAssign('parseInt', String.prototype, function parseInt(radix){ return Number.parseInt(this, radix); });
	defineAndAssign('parseFloat', String.prototype, function parseFloat(){ return Number.parseInt(this); });

	staticFunctionsToProtocol2( String, global, [
		encodeURI,
		decodeURI,
		encodeURIComponent,
		decodeURIComponent,
	]);
}



symbols[localSymbols.entries]().forEach( ([symName])=>{
	const sym = symbols[symName];
	const fn = Object.prototype[sym];
	if( fn ) {
		console.log( `Object.prototype.*${symName} = ${fn}` );
	}

	([Array, Date, Function, Number, RegExp, String]).forEach( (type)=>{
		const tfn = type.prototype[sym];
		if( tfn !== fn ) {
			console.log( `${type.name}.prototype.*${symName} = ${tfn}` )
		}
	});
});
