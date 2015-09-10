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
        s.end();

        setTimeout(function () {
            console.log(spy.calls)
            expect(spy).toHaveBeenCalled()
            expect(spy.calls.length).toEqual(4);
            expect(spy.calls[0].args.toString()).toEqual('hhh');
            expect(spy.calls[1].args.toString()).toEqual('ggg');
            done();
        }, 200)
    });
});
