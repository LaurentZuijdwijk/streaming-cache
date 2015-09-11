/* jshint jasmine: true */
'use strict';

var StreamingCache = require('../index');
var Transform = require('stream').Transform;

var cache = new StreamingCache();
describe('my test suite', function () {
    var s;
    beforeEach(function () {
        s = cache.set('a');
    })
    it('cache.set needs to be called with a key', function () {
        expect(function () {cache.set();}).toThrow('Key expected');
    });
    it('cache.set should return a stream', function () {
        expect(s).toEqual(jasmine.any(Transform));
    });
    it('Writing to stream should set data', function (done) {
        s.write('a');
        s.write('b');
        cache.getData('a', function (err, data) {
            expect(data.toString()).toEqual('ab')
            done();
        });
        s.end();
    });
    it('getting stream should return readstream', function () {
        var r = cache.get('a');
        expect(r).toEqual(jasmine.any(require('../lib/readStream')));
    });
    it('should be written to and readable when set has ended', function (done) {
        s.write('ggg');
        var r = cache.get('a');
        r.on('data', function (chunk) {
            expect(chunk.toString()).toEqual('ggg')
            done()
        })
        s.end();

        expect(r).toEqual(jasmine.any(require('../lib/readStream')));
    });
    it('should be written to and readable when set is pending', function (done) {
        var spy = jasmine.createSpy();
        s.write('hhh');
        var r = cache.get('a');

        r.on('data', spy)
        r.on('end', spy)

        s.write('ggg');
        s.end('iii');

        setTimeout(function () {
            expect(spy).toHaveBeenCalled()
            expect(spy.calls.length).toEqual(4);
            expect(spy.calls[0].args.toString()).toEqual('hhh');
            expect(spy.calls[1].args.toString()).toEqual('gggiii');
            done();
        }, 200)
    });

    it('should handle metadata', function () {
        cache.cache.set('abc', {data: 1});

        cache.setMetadata('abc', 1234);
        cache.setMetadata('def', {a: 'b'});
        cache.setMetadata('ghi', 'abc');
        expect(cache.getMetadata('abc')).toEqual(1234);
        expect(cache.getMetadata('def').a).toEqual('b');
        expect(cache.getMetadata('ghi')).toEqual('abc');
        expect(cache.cache.get('abc').data).toEqual(1);
    });
});
