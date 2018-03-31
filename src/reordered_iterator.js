
const assert = require('assert');

const {KVN} = require('./util.js');

class ReorderedIterator {
	constructor() {
		this.state = ReorderedIterator.state.ready;
		this.onNextFn = ()=>{};
		this.onEndFn = ()=>{};
	}

	// public interface
	proceed() {
		assert( this.state === ReorderedIterator.state.ready, `proceed() should be called only once.` );
		this.state = ReorderedIterator.state.proceeding;
	};
	resume() {
		assert( this.state === ReorderedIterator.state.proceeding, `resume() should be called only when the ReorderedIterator is already proceeding and not stopped.` );
	};
	stop() {
		assert( this.state === ReorderedIterator.state.proceeding, `stop() should be called only when the ReorderedIterator is proceeding and not yet stopped.` );
		this.state = ReorderedIterator.state.stopped;
	};

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
	_pushNext( kvn ) {
		if( ! kvn ) {
			return;
		}

		assert( kvn instanceof KVN, `Received a ${kvn}` );
		this.onNextFn( kvn );
	}
	_pushEnd() {
		this.onEndFn();
	}

	toString( ) {
		return `${this.constructor.name}{state:${this.state.*toString()}}`;
	}
}
ReorderedIterator.state = {
	ready: Symbol(`ready`),
	proceeding: Symbol(`proceeding`),
	stopped: Symbol(`stopped`),
};

ReorderedIterator.MapReorderedIterator = class extends ReorderedIterator {
	constructor( rit, mapFn ) {
		super();

		this.rit = rit;
		this.mapFn = mapFn;

		this.rit.onNext( (kvn)=>this._pushNext( this.mapFn(kvn) ) )
			.onEnd( ::this._pushEnd );
	}

	proceed() {
		super.proceed();
		this.rit.proceed();
	};
	resume() {
		super.resume();
		this.rit.resume();
	};
	stop() {
		super.stop();
		this.rit.stop();
	};
};

ReorderedIterator.FromIterator = class extends ReorderedIterator {
	constructor( it ) {
		super();

		this.it = it;
		this.state = ReorderedIterator.state.ready;
		this.next = this.it.next();
	}

	proceed() {
		super.proceed();
		this._work();
	}
	resume() {
		super.resume();
		this._work();
	}
	stop() {
		super.stop();
		this.next = undefined;
	}

	_work() {
		while( this.next ) {
			const next = this.next;
			this.next = this.it.next();
			this._pushNext( next );
		}
		this._pushEnd( );
	}
};

module.exports = {ReorderedIterator};
