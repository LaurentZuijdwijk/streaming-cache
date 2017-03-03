/**

In this example we create a simple server that serves the first file from disk and subsequent
requests from cache

**/

const http = require('http');
const PORT = 8080;

const fs = require('fs');
const Cache = require('../index.js');
let cache = new Cache();

const server = http.createServer(handleRequest);

server.listen(PORT, function () {
    console.log('Server listening on: http://localhost:%s', PORT);
});

function handleRequest(request, response) {
    if (cache.exists('stream.jpg')) {
        response.setHeader('From-Cache', 'true');
        cache.get('stream.jpg').pipe(response);
    }
    else {
        response.setHeader('From-Cache', 'false');

        fs.createReadStream('./stream.jpg')
        .pipe(cache.set('stream.jpg'))
        .pipe(response);
    }
}
