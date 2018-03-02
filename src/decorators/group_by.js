
'use strict';

const assert = require('assert');
const protocols = require('js-protocols');
const utilSymbols = protocols.util.symbols;
const subminus = require('../');
const {ReorderedIterator} = subminus;

use protocols from subminus.symbols;

module.exports = subminus.makeDecoratorFactory( (Type)=>{
	const proto = Type.prototype;

	if( ! proto.*kvReorderedIterator ) {
		return;
	}

	class GroupBy {
		constructor( coll, fn ) {
			this.wrapped = coll;
			this.fn = fn;
		}

		kvReorderedIterator() {
			if( proto.*kvReorderedIterator ) {
				return function kvReorderedIterator() {
					const prit = this.wrapped.*kvReorderedIterator();
					const groups = new Map();
					const rit = new ReorderedIterator({
						alwaysPropagate: true,
						propagateMulti: false
					});

					rit.proceed = ()=>{
						prit.onNext( (kv)=>{
							const groupName = this.fn( kv.value, kv.key );
							// console.log(`group by: ${kv.key}:${kv.value}=>${groupName}`);

							if( ! groups.*hasKey(groupName) ) {
								const group = new Group( prit, kv.key, kv.value );
								groups.*set( groupName, group );

								const groupKV = new ReorderedIterator.KV( groupName, group );
								rit.pushNext( groupKV );
							}
							else {
								const group = groups.*get( groupName );
								group.__push( kv.value, kv.key );
							}

							/*
							let git;
							if( ! groups.*hasKey(groupName) ) {
								// creating a new reordered iterator for this group
								// TODO: should return an iterable collection, not an iterator!
								git = {}; // new ReorderedIterator();
								git.proceed = ()=>{
									git.onNext( {key:kv.key, value:kv.value} );
									prit.resume();
								};
								git.resume = ()=>{
									prit.resume();
								};
								groups.*set( groupName, git );
								rit.onNext( {key:groupName, value:git} );
							}
							else {
								git = groups.*get( groupName );
								git.onNext( {key:kv.key, value:kv.value} );
							}
							*/
						});
						prit.proceed();
					};
					rit.resume = ()=>prit.resume();
					rit.stop = ()=>{ TODO(); };

					return rit;
				};
			}
		}

		toString( ) {
			return `${this.wrapped}.groupBy(⋯)`;
		}
	};
	/*
	GroupBy.Propagator = {
		parentCollection( iter ) {
			return iter.wrapped;
		},
		// start( state ) { return state; },
		next( kv, state ) {
			const group = this.fn( kv.key, kv.value );

			let git; // group iterator
			if( ! state[group] ) {
				git = state[group] = {}; // new ReorderedIterator();
				git.proceed = ()=>{
					// a single `proceed` is needed for the `groupBy` and all its groups, but...
					// TODO: when called, the `groupBy` iterator should immediately resume proceeding
				};
			} else {
				git = state[group];
			}
			// state.xxx = ...
			return kv;
		},
		// end( state ) { return state.xxx },
		alwaysPropagate: false,
		propagateMulti: false,
		needState: true,
		reorder: true
	}
	*/

	return GroupBy;
});

const Group = subminus.implementForNewType( class Group {
	constructor( baseIterator, firstKey, firstValue ) {
		this.state = Group.State.inactive;

		this.it = new ReorderedIterator({
			alwaysPropagate: true,
			propagateMulti: false
		});
		this.it.asyncProceed = ()=>{
			assert( this.state === Group.State.preproceeding, `Something already happened to this group before the iterator was listened to...` );
			this.state = Group.State.proceeding;
			this.__push( firstValue, firstKey );
		};
		this.it.proceed = ()=>{
			this.it.asyncProceed();
			this.it.resume();
		};
		this.it.resume = ()=>{
			/* TODO: this can be avoided...
			but if it is, the thing becomes asynchronous...
			...imagine:
			> groupBy(...).*map( group=>group.*sum() );
			that's fine, buuut,
			the result of `sum` is not immediately ready - you can't do:
			> groupBy(...).*map( group=>(group.*sum() * 2) );
			either the consumers/sinks/call-them-whatever listen to the base iterator, or they become asynchronous...
			if they're asynchronous, `.*map` from the example above gets a promise or equivalent...
			`.*groupBy` though knows that the promise will be resolved before finishing to loop.

			asynchronous stuff shouldn't be handled at the moment.
			we should override collectors/consumers/sincs (e.g. `collect` and `reduce`) in `GroupBy` to avoid `proceeding`
			*/
			baseIterator.resume();
		};
		this.it.sync = ()=>{
			this.it.proceed();
			baseIterator.resume();
		};
		this.it.stop = ()=>{
			assert( this.state === Group.State.proceeding, `Only proceeding iterators can be stopped...` );
			this.state = Group.State.proceeding;
		};
	}
	// this is not part of the Collection interface
	__push( value, key ) {
		assert( this.state !== Group.State.preproceeding, `After taking a group's iterator, you're supposed to call \`iterator.proceed()\`` );

		if( this.state === Group.State.proceeding ) {
			const kv = new ReorderedIterator.KV( key, value );
			this.it.pushNext( kv );
		}
		else {
			this.state = Group.State.stopped;
		}
	}

	/*
	// TODO: GroupBy needs to support this thing in GroupBy.*map etc
	reduce() {
		let state = start;
		{
			const rit = this.*kvReorderedIterator();
			rit.onNext = ({key, value})=>{
				state = fn( state, value, key, this );
				result.value = state;
			};
			rit.asyncProceed();
		}
		const result = {};
		return result;
	}
	*/

	kvReorderedIterator() {
		// return function kvReorderedIterator() {
			assert( this.state === Group.State.inactive, `A GroupByGroup is iterable only once` );
			this.state = Group.State.preproceeding;
			return this.it;
		//};
	}

	toString( ) {
		return `GroupBy.Group`;
	}
});
Group.State = {
	inactive: 0,
	preproceeding: 1,
	proceeding: 2,
	stopped: 3
};
