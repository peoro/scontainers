
module.exports = function( api ) {
	api.cache.forever();

	return {
		"plugins": [
			"@straits",
			"@babel/plugin-transform-strict-mode",
			"@babel/plugin-proposal-function-bind",
		]
	};
};
