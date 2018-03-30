
'use strict';

const assert = require('assert');
const {defineProperties, deriveProtocolsForTransformation, deriveProtocolsForRootType} = require('../processors/index.js');
const {ReorderedIterator} = require('../');

use protocols from require('../symbols');


module.exports = function( ParentCollection ) {
	const parentProto = ParentCollection.prototype;
	if( ! parentProto.*kvReorderedIterator ) {
		return;
	}

	return function() {
		class GroupBy {
			static get name() { return `${ParentCollection.name}::GroupBy`; }

			constructor( coll, fn ) {
				this.wrapped = coll;
				this.fn = fn;
			}

			toString( ) {
				return `${this.wrapped}.groupBy(${this.fn.name || 'ƒ'})`;
			}
		}

		GroupBy::defineProperties({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`fn`],
		});

		GroupBy::deriveProtocolsForTransformation({
			kvReorderedIterator() {
				if( parentProto.*kvReorderedIterator ) {
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
							});
							prit.proceed();
						};
						rit.resume = ()=>prit.resume();
						rit.stop = ()=>{ TODO(); };

						return rit;
					};
				}
			}
		});

		return GroupBy;
	};
};



class Group {
	static get name() { return `GroupBy.Group`; }

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

	toString( ) {
		return `GroupBy.Group{state:${this.state.*toString()}}`;
	}
}
Group.State = {
	inactive: Symbol(`inactive`),
	preproceeding: Symbol(`preproceeding`),
	proceeding: Symbol(`proceeding`),
	stopped: Symbol(`stopped`),
};

Group::defineProperties({
	argKeys: [id`state`],
});

Group::deriveProtocolsForRootType({
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
});
