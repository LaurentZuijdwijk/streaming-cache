'use strict';

var Cache = require('../index.js');

var cache = new Cache();

var fs = require('fs');

var readstream = fs.createReadStream('readme.md');
var writestream = fs.createWriteStream('test2.md');
var writestream2 = fs.createWriteStream('test3.md');

readstream.pipe(cache.set('a')).pipe(writestream)
//readstream.pipe(writestream);

setTimeout(function () {
    cache.get('a').pipe(writestream2);
}, 10);

// cache.get('a').pipe(writestream);
process.nextTick(function () {
})
