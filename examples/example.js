'use strict';

var Cache = require('../index.js');

var cache = new Cache();

var fs = require('fs');

// var readstream = fs.createReadStream('readme.md');
// var writestream = fs.createWriteStream('test.md');
var writestream2 = fs.createWriteStream('test2.txt');

// readstream.pipe(cache.put('a'));
// readstream.pipe(writestream);
// readstream.pipe(process.stderr);

// setTimeout(function(){
// 	writestream2.write('written from cache\n\n');
// 	cache.get('a').pipe(writestream2);
// }, 200);

// setTimeout(function(){}, 2000);

//process.stdin.pipe(cache.put('a'));

var cnt = 0;
var s = cache.set('a')
var intervalId = setInterval(function () {
    if (cnt >= 5) {
        // console.log('cnt', cnt)
        clearInterval(intervalId)
        cache.get('a').pipe(process.stdout);
        s.end();
    } else {
        s.write(cnt + ' hello', function () {})
        cnt++;
    }
}, 1000)

//setTimeout(function () {
cache.get('a').pipe(process.stdout);
// }, 5000);
