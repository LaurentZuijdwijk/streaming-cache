
var http = require('http');
const PORT = 8080;

var fs = require('fs');
var Cache = require('../index.js');
var cache = new Cache();

function handleRequest(request, response) {
    var _cache = cache.get('a');
    var meta;
    if (_cache) {
        // meta = cache.getMetadata('a');
        // if (meta && meta.length) {
        //     response.setHeader('Content-Length', meta.length)
        //     response.setHeader('Content-Type', 'image/jpeg');
        // }
        _cache.pipe(response);
    }
    else {
        var readstream = fs.createReadStream('./stream.jpg');
        readstream.pipe(cache.set('a')).pipe(response)
    }
}

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function () {
    //Callback triggered when server is successfully listening. Hurray!
    console.log('Server listening on: http://localhost:%s', PORT);
});
