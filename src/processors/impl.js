
const assert = require('assert');

const symbols = require('../symbols');
const {get, set, hasKey, has, nth, setNth, nToKey, add, len, reverse, clear, kvIterator, kvReorderedIterator} = symbols
const {hasSymbols, implementSymbolsFromFactory} = require('../util.js');

const {ReorderedIterator} = require('./reordered_iterator.js');

// implements collection protocols for the type `this` whose parent type is `ParentType`,
// using the functions from `src`'s factories
function implementCoreProtocols( src={} ) {
	assert( this, `implementCoreProtocolsForTransformation() must be called on an object` );

	const Type = this;
	const proto = Type.prototype;

	proto::implementSymbolsFromFactory( src );

	proto::implementSymbolsFromFactory({
		get() {
			// must be provided
		},
		set() {
			// must be provided
		},
		hasKey() {
			// must be provided
		},
		has() {
			// must be provided
		},
		nToKey() {
			// must be provided
		},
		nth() {
			if( proto.*get && proto.*nToKey ) {
				return function( n ) {
					return this.*get( this.*nToKey(n) );
				};
			}
		},
		setNth() {
			if( proto.*set && proto.*nToKey ) {
				return function( n, value ) {
					return this.*set( this.*nToKey(n), value );
				};
			}
		},
		add() {
			// must be provided
		},
		len() {
			// must be provided
		},
		reverse() {
			// must be provided
		},
		clear() {
			// must be provided
		},

		// iterable
		kvIterator() {
			if( proto.*nth ) {
				return function kvIterator() {
					return {
						collection: this,
						i: 0,
						next() {
							const coll = this.collection;
							if( this.i < coll.*len() ) {
								const n = this.i ++;
								return {
									value:[coll.*nToKey(n), coll.*nth(n)],
									done:false
								};
							}
							return { done:true };
						}
					};
				};
			}
		},
		kvReorderedIterator() {
			if( proto.*kvIterator ) {
				return function kvReorderedIterator() {
					const it = this.*kvIterator();
					const rit = new ReorderedIterator({
						alwaysPropagate: true,
						propagateMulti: false,
						needState: false,
						reorder: false
					});

					let next;
					rit.proceed = ()=>{
						next = it.next();
						rit.resume();
					};
					rit.resume = ()=>{
						while( ! next.done ) {
							const [key, value] = next.value;
							next = it.next();

							rit.pushNext( new ReorderedIterator.KV(key, value) );
						}
					};
					rit.stop = ()=>{
						next.done = true; // ugly hack just to spare an extra var and check, lol
					};

					return rit;
				};
			}
		},
	});
}

const {values, iterator} = symbols;

function implementDerivedProtocols() {
	assert( this, `implementDerivedProtocols() must be called on an object` );

	const Type = this;
	const proto = Type.prototype;

	// running a quick validity check on `this`
	{
		if( proto.*nth && proto.*nToKey ) {
			assert( proto.*nToKey, `${Type.fullName} misses .\*nToKey()` );
			assert( proto.*len, `${Type.fullName} misses .\*len()` );
			// assert( proto.*get, `${Type.fullName} misses .\*get()` );
		}
		//assert( proto.*kvIterator || proto.*kvReorderedIterator, `${Type.name} is not iterable` );
	}

	proto::implementSymbolsFromFactory({
	});

	proto::implementSymbolsFromFactory({
		iterator() {
			if( proto.*nth || proto.*has ) {
				return function() {
					return this.*values().*iterator();
				};
			}

			if( proto.*kvIterator ) {
				return function() {
					return this.*kvIterator();
				};
			}
		},
	});
}

module.exports = {
	implementCoreProtocols,
	implementDerivedProtocols
};
