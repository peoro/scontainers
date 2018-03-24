
When implementing a derived protocol or a core protocol for a decorator, it could have multiple possible implementations, each of which depend on the presence of core protocols, or of protocols in the inner collection.

Ideally, a syntax similar to the following should be used:
```
function forEach( fn ) {
	if( proto.nth ) {
		for( let i = 0; i < this.len(); ++i ) {
			fn(this.nth(i), this.nToKey(i), this);
		}
	}
	else if( proto.entries ) {
		for( let [key, value] of this.entries() ) {
			fn( value, key, this );
		}
	}
}
```

We know "statically" the value of those conditions, so the branches of the `if` that are never executed should be cut off, and if the function remains empty it shouldn't be declared at all.

This however cannot happen in JavaScript, thus our approach is using a factory function that returns the actual function implementing the protocol (or none):
```
function forEach() {
	if( proto.nth ) {
		return function forEach( fn ) {
			for( let i = 0; i < this.len(); ++i ) {
				fn(this.nth(i), this.nToKey(i), this);
			}
		};
	}
	else if( proto.kvIterator ) {
		return function forEach( fn ) {
			for( let [key, value] of this.entries() ) {
				fn( value, key, this );
			}
		};
	}
}
```

Maybe, in the future, we could introduce some kind of macro to allow ourselves to write code as in the first snippet, and compile it into the approach we're using.
