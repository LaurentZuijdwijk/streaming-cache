'use strict';

var fs = require('fs');

var Cache = require('../index.js');
var cache = new Cache({max: 5, maxAge: 15});
var stream = cache.set('a');

var counter = 0;
var intervalId = setInterval(function () {
    if (counter >= 50) {
        clearInterval(intervalId);
        stream.end();
    } else {
        stream.write(counter + ' hello\n');
        counter++;
    }
}, 100);

stream.pipe(process.stdout);
cache.get('a').pipe(process.stdout);
