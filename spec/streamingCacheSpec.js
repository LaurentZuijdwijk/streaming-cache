/* jshint jasmine: true */
'use strict';

var StreamingCache = require('../index');
var Transform = require('stream').Transform;

var cache = new StreamingCache();
describe('streaming cache', function () {
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
        var dataSpy = jasmine.createSpy();
        var endSpy = jasmine.createSpy();
        s.write('hhh');
        var r = cache.get('a');

        r.on('data', dataSpy);
        r.on('end', endSpy);

        s.write('ggg');
        s.end('iii');

        setTimeout(function () {
            expect(spy).toHaveBeenCalled();
            expect(dataSpy.calls.length).toEqual(1);
            expect(dataSpy.calls[0].args.toString()).toEqual('hhhgggiii');
            expect(endSpy.calls.length).toEqual(1);

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
