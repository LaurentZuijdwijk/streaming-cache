/* jshint jasmine: true */
'use strict';

var StreamingCache = require('../index');
var cache = new StreamingCache();
describe('my test suite', function () {
    it('cache.put should return a writeStream', function () {
        expect(cache.put()).toThrowError(Error, 'Key expected');
    });
});
