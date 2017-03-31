/* jshint jasmine: true */
'use strict';

var StreamingCache = require('../index');
var Duplex = require('stream').Duplex;
var Writable = require('stream').Writable;


var cache = new StreamingCache();
describe('streaming cache', function () {
    var s;

    beforeEach(function () {
        cache = new StreamingCache()
        s = cache.set('a');
    })

    it('cache.set needs to be called with a key', function () {
        expect(function () {cache.set();}).toThrow('Key expected');
    });

    it('cache.set should return a stream', function () {
        expect(s).toEqual(jasmine.any(Duplex));
    });

    it('Writing to stream should set data', function (done) {
        s.write('a');
        s.write('b');
        cache.getData('a', function (err, data) {
            expect(data.toString()).toEqual('ab')
            done();
        });
        s.end(null);
    });

    it('reading from a duplex stream should return all data', function(done){
        var res = '';
        var stream = new Writable({
            write(chunk, encoding, callback) {
                res += chunk;
                callback();
            }
        });
        stream.on('finish', function(){
            expect(res).toEqual('abc');
            done();
        })

        var cacheStream = s;
        cacheStream.pipe(stream);
        cacheStream._read();
        cacheStream._read();
        cacheStream.write('a');

        cacheStream.write('b');
        cacheStream.write('c');
        cacheStream.end();
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
            expect(dataSpy).toHaveBeenCalled();
            expect(dataSpy.calls.length).toEqual(1);
            expect(dataSpy.calls[0].args.toString()).toEqual('hhhgggiii');
            expect(endSpy.calls.length).toEqual(1);

            done();
        }, 200)
    });

    it('should handle sync setData', function () {
        expect(cache.setData).toThrow();
        cache.setData('b', new Buffer(100));
        expect(cache.cache.get('b').status).toEqual(2);
        expect(cache.cache.get('b').data.length).toEqual(100);
    });

    it('should handle getData when data is missing', function (done) {
        expect(cache.getData).toThrow();
        expect(function () { cache.getData('c') }).toThrow();
        expect(cache.getData('c', function (err, data) {
            expect(data).toEqual(undefined);
            expect(err).toEqual('Cache miss');
            done();
        }));
    });

    it('should handle setmetadata', function () {
        cache.setMetadata('abc', {a: 'c'});
        cache.setData('abc', 'test');
        expect(cache.setMetadata).toThrow();
        expect(cache.cache.get('abc').data).toEqual('test');
        expect(cache.getMetadata('abc').a).toEqual('c');
    });

    it('should save the length to metadata', function (done) {
        cache.setMetadata('abc', {a: 'b'});
        var s = cache.set('abc');
        s.write('a');
        s.write('b');
        s.end('');

        setTimeout(function () {
            expect(cache.cache.get('abc').data.toString()).toEqual('ab');
            expect(cache.getMetadata('abc').a).toEqual('b');
            expect(cache.getMetadata('abc').length).toEqual(2);
            done();
        }, 10)
    });

    it('should handle getmetadata', function () {
        cache.cache.set('abc', {data: 1, metaData: 'bbb'});
        expect(cache.getMetadata).toThrow();

        cache.getMetadata('abc', 'bbb');
    });

    it('should initially set metadata once key is set', function () {
        cache.set('abc', {data: 'test'});
        expect(cache.getMetadata('abc')).toEqual({});
    });

    it('should reset the cache when called', function () {
        cache.setData('aaa', 'value');
        cache.reset();
        expect(cache.exists('aaa')).toEqual(false);
    });

    it('should handle getData', function (done) {
        cache.setData('b', new Buffer(100));
        cache.getData('b', function (err, data) {
            expect(data.length).toEqual(100);
            done();
        });
    });

    it('should handle key exists', function () {
        expect(cache.exists).toThrow();
        expect(cache.exists('aaa')).toEqual(false);
        cache.setData('aaa', 'value');
        expect(cache.exists('aaa')).toEqual(true);
    });
});

describe('streaming cache short timeout', function () {
    var s;

    beforeEach(function () {
        cache = new StreamingCache({maxAge: 100})
        s = cache.set('b');
    });

    it('Writing to stream should set data', function (done) {
        s.write('a');
        s.write('b');
        s.end(null);
        setTimeout(function () {
            expect(s.read().toString() + s.read().toString()).toEqual('ab')
            cache.getData('b', function (err, data) {
                expect(data).toEqual(null)
                done();
            });
        }, 130);
    });
});
