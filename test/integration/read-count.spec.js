'use strict';

describe('/', function () {

	var request = require('supertest');
	var http = require('http');
	var PORT = 58080;
	var fileName = 'test/fixtures/text-file-large.txt';
	var fs = require('fs');
	var Cache = require('../../index.js');
	var server;
	var cache = new Cache();


	before(function (done) {
		server = http.createServer(handleRequest);
		//server.listen(PORT, done);
		server.listen(PORT, function () {
			console.log('Integration test server running on: http://localhost:%s', PORT);
			done();
		});
	});

	after(function () {
		server.close();
	});

	function handleRequest(request, response) {
		console.log('Connection request');
		if (cache.exists(fileName)) {
				response.setHeader('From-Cache', 'true');
				cache.get(fileName)
					.pipe(response);
		} else {
				response.setHeader('From-Cache', 'false');
				fs.createReadStream(fileName)
					.pipe(cache.set(fileName))
					.pipe(response)
		}
	}

	it('serves a file first time from file, through cache', function(done) {
		request(server)
			.get('/')
			.expect('From-Cache', 'false')
			.expect(200)
			.end(function(err, res) {
				if (err) throw err;
			});
		});

	it('serves a file the second time from cache', function(done) {
		request(server)
			.get('/')
			.expect('From-Cache', 'true')
			.expect(200)
			.end(function(err, res) {
				if (err) throw err;
			});
		});
});
