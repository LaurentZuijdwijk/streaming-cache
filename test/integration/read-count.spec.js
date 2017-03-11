'use strict';

describe('/', function () {

	const request = require('supertest');
	const http = require('http');
	const PORT = 8080;
	const fileName = './fixtures/text-file-large.txt';
	const fs = require('fs');
	const Cache = require('../../index.js');
	var server;
	var cache = new Cache();


	before(function (done) {
		server = http.createServer(handleRequest);
		//server.listen(PORT, done);
		server.listen(PORT, function () {
			console.log(`Server listening on: http://localhost:${PORT}`);
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

