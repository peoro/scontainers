
const {assert, traits, toStr, id, ReorderedIterator, KVN} = require('../utils.js');

use traits * from traits.utils;
use traits * from traits.scontainers;
use traits * from traits.semantics;

module.exports = function( ParentCollection ) {
	const parentProto = ParentCollection.prototype;
	if( ! parentProto.*kvReorderedIterator ) {
		return;
	}

	return function() {
		class GroupBy {
			static get name() { return `${ParentCollection.name}::GroupBy`; }

			constructor( coll, groupByFn ) {
				this.wrapped = coll;
				this.groupByFn = groupByFn;
			}

			toString( ) {
				return `${this.wrapped}.groupBy(${this.groupByFn.name || 'ƒ'})`;
			}
		}

		GroupBy.*describeScontainer({
			InnerCollection: ParentCollection,
			innerCollectionKey: id`wrapped`,
			argKeys: [id`groupByFn`],
		});

		GroupBy.*implCoreTraits({
			kvReorderedIterator() {
				if( parentProto.*kvReorderedIterator ) {
					return function kvReorderedIterator() {
						const rit = this.wrapped.*kvReorderedIterator();
						return new GroupBy.ReorderedIterator( rit, this.groupByFn );
					};
				}
			}
		});
		GroupBy.ReorderedIterator = class extends ReorderedIterator {
			constructor( rit, groupByFn ) {
				super();

				this.rit = rit;
				this.groupByFn = groupByFn;
				this.groups = new Map();

				this.rit.onNext( kvn=>{
					const groupName = this.groupByFn( kvn.value, kvn.key, kvn.n );

					if( ! this.groups.*hasKey(groupName) ) {
						const group = new Group( this, kvn );
						this.groups.*set( groupName, group );
						this._pushNext( new KVN(groupName, group) );
					}
					else {
						const group = this.groups.*get( groupName );
						group.rit._pushNext( kvn );
					}
				});
			}

			proceed() {
				super.proceed();
				this.rit.proceed();
			}
			resume() {
				super.resume();
				this.rit.resume();
			}
			stop() {
				super.stop();
				TODO(`We should stop creating new groups, but keep iterating for old ones - but only if some are still active...`);
			}
		};

		return GroupBy;
	};
};



class Group {
	static get name() { return `GroupBy.Group`; }

	constructor( groupByRIt, firstKVN ) {
		this.state = Group.state.ready;
		this.rit = new Group.ReorderedIterator( groupByRIt, firstKVN );
	}

	toString( ) {
		return `GroupBy.Group{state:${this.state.*toString()}}`;
	}
}
Group.state = {
	ready: Symbol(`ready`),
	done: Symbol(`done`),

	preproceeding: Symbol(`preproceeding`),
	proceeding: Symbol(`proceeding`),
	stopped: Symbol(`stopped`),
};
Group.ReorderedIterator = class extends ReorderedIterator {
	constructor( groupByRIt, firstKVN ) {
		super();

		this.groupByRIt = groupByRIt;
		this.firstKVN = firstKVN;
	}

	proceed() {
		super.proceed();

		this._pushNext( this.firstKVN );
		this.firstKVN = undefined;
		this._work();
	}
	resume() {
		super.resume();
		this._work();
	}
	stop() {
		super.stop();
	}

	_work() {
		this.groupByRIt.resume();
	}
	_pushNext( kvn ) {
		if( this.state === ReorderedIterator.state.ready ) {
			// if the main iterator (this.`groupByRIt`) pushes a new item before were told to proceed, we want to stop:
			// we don't want to let the user `proceed` on a group iterator some iterations after the group was created.
			this.stop();
		}
		else if( this.state === ReorderedIterator.state.proceeding ) {
			super._pushNext( kvn );
		}
	}
};

Group.*describeScontainer({
	argKeys: [id`state`],
});

Group.*implCoreTraits({
	kvReorderedIterator() {
		assert( this.state === Group.state.ready, `A GroupBy.Group is iterable only once` );
		this.state = Group.state.done;
		return this.rit;
	}
});
