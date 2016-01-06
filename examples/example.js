'use strict';
var Cache = require('../index.js');
var cache = new Cache({max: 5, maxAge: 15});
var fs = require('fs');
var cnt = 0;
var s = cache.set('a');
var intervalId = setInterval(function () {
    if (cnt >= 50) {
        clearInterval(intervalId);
        s.end();
    } else {
        s.write(cnt + ' hello\n');
        cnt++;
    }
}, 100);

s.pipe(process.stdout);
cache.get('a').pipe(process.stdout);


    
