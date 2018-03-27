
const assert = require('assert');

class ReorderedIterator {
	constructor( propagator ) {
		this.propagator = propagator;

		this.proceed = ()=>{ MUST_BE_IMPLEMENTED(); };
		this.resume = ()=>{ MUST_BE_IMPLEMENTED(); };
		this.stop = ()=>{ MUST_BE_IMPLEMENTED(); };
		this.onNextFn = ()=>{};
		this.onEndFn = ()=>{};

		{
			this.pushNext = ReorderedIterator.prototype.pushNext;
			if( propagator.propagateMulti ) {
				this.pushNext = function next( kv ) {
					TODO();
				};
			}
			else if( ! propagator.alwaysPropagate ) {
				this.pushNext = function next( kv ) {
					if( kv ) {
						this::ReorderedIterator.prototype.pushNext( kv );
					}
				};
			}
		}
	}
	// register handlers for some common events...
	onNext( fn ) {
		this.onNextFn = fn;
		return this;
	}
	onEnd( fn ) {
		this.onEndFn = fn;
		return this;
	}
	// sends the events above
	pushNext( kv ) {
		if( ! kv && ! this.propagator.propagateMulti && ! this.propagator.alwaysPropagate ) {
			// in this case `kv` is goig to be `undefined`...
		}

		assert( kv instanceof ReorderedIterator.KV, `${kv}` );
		this.onNextFn( kv );
		if( ! kv ) {
			this.stop();
		}
		return kv;
	}
	pushEnd() {
		this.onEndFn();
	}
}
ReorderedIterator.KV = class KV {
	constructor( key, value ) {
		this.key = key;
		this.value = value;
		this.skip = false;
	}
};

module.exports = {ReorderedIterator};
