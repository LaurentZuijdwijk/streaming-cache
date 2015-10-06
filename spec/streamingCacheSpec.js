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

    it('should handle setmetadata', function () {
        cache.cache.set('abc', {data: 'test'});
        expect(cache.setMetadata()).toThrow();
        cache.setMetadata('abc', 1234);
        expect(cache.cache.get('abc').data).toEqual('test');
        expect(cache.cache.get('abc').data.metaData).toEqual(1234);
    });

    it('should handle getmetadata', function () {
        cache.cache.set('abc', {data: 1, metaData: 'bbb'});
        expect(cache.getMetadata()).toThrow();

        cache.getMetadata('abc', 'bbb');
    });

    it('should handle sync setData', function (done) {
        expect(cache.setData()).toThrow();
        cache.setData('b', new Buffer(100));
        expect(cache.cache.get('b').status).toEqual(2);
        expect(cache.cache.get('b').data.length).toEqual(100);
    });
    it('should handle getData', function (done) {
        expect(cache.getData()).toThrow();
        expect(cache.getData('b')).toThrow();
        expect(cache.getData('b', function (err, data) {
            expect(err).toEqual('cache miss');
            done();
        }));
    });
    it('should handle getData', function (done) {
        cache.setData('b', new Buffer(100));
        cache.getData('b', function (err, data) {
            expect(data.length).toEqual(100);
        });
    });
});
