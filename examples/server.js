/**

In this example we create a simple server that serves the first file from disk and subsequent
requests from cache

**/

'use strict';

const http = require('http');
const PORT = 8080;
const fileName = 'stream.jpg';

const fs = require('fs');
const Cache = require('../index.js');
let cache = new Cache();

const server = http.createServer(handleRequest);

server.listen(PORT, function () {
    console.log('Server listening on: http://localhost:%s', PORT);
});

function handleRequest(request, response) {
    if (cache.exists(fileName)) {
        response.setHeader('From-Cache', 'true');
        cache.get(fileName)
            .pipe(response);
    } else {
        response.setHeader('From-Cache', 'false');

        fs.createReadStream(fileName)
            .pipe(cache.set(fileName))
            .pipe(response);
    }
}
