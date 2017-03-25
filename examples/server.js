
/**

In this example we create a simple server that serves the first file from disk and subsequent
requests from cache

**/
'use strict';
var http = require('http');
var PORT = 8080;

var fs = require('fs');
var Cache = require('../index.js');
var cache = new Cache();

var server = http.createServer(handleRequest);
var FILENAME = './stream.jpg';

server.listen(PORT, function () {
	console.log('Server listening on: http://localhost:%s', PORT);
});

function handleRequest(request, response) {
	if (cache.exists(FILENAME)) {
		response.setHeader('From-Cache', 'true');
		cache.get(FILENAME).pipe(response);
	}
	else {
		response.setHeader('From-Cache', 'false');
		fs.createReadStream(FILENAME)
		.pipe(cache.set(FILENAME))
		.pipe(response);
	}
}
