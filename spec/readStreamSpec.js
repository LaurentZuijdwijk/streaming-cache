/* jshint jasmine: true */
'use strict';
var ReadStream = require('../lib/readStream');

describe('readstream spec', function () {
    var readStream;

    beforeEach(function () {
        readStream = new ReadStream();
    });

    it('should be able to set a buffer', function () {
        readStream.updateBuffer(new Buffer(100));
        expect(readStream._object.length).toBe(100);
        expect(readStream.complete).toBe(false);
        expect(readStream._readableState.ended).toBe(false);
        readStream.setBuffer('abc');
        expect(readStream._object).toEqual('abc');
        expect(readStream.complete).toBe(true);
    });
    it('should be able to read from the stream', function () {
        readStream.updateBuffer(new Buffer(100));

        expect(readStream.read(100).length).toEqual(100);
        expect(readStream.read(100)).toEqual(undefined);
    });
    it('should be able to read from a finished stream', function () {
        readStream.setBuffer(new Buffer(100));

        expect(readStream.read(100).length).toEqual(100);
        expect(readStream.read(100)).toEqual(null);
    });
    it('should be able to read parts from a finished stream', function () {
        readStream.setBuffer(new Buffer(10000));

        expect(readStream.read(450).length).toEqual(450);
        expect(readStream.read(550).length).toEqual(550);
        expect(readStream.read(4000).length).toEqual(4000);
        expect(readStream.read(5000).length).toEqual(5000);
        expect(readStream.read(100)).toEqual(null);
        expect(readStream._readableState.ended).toBe(true);
    });
    it('should be able to read strings', function () {
        readStream.setBuffer('abc');
        expect(readStream.read(10).toString()).toEqual('abc');
    });
    it('after reading the stream should be finished', function (done) {
        readStream.setBuffer(new Buffer(100));
        var endSpy = jasmine.createSpy();
        readStream.on('end', endSpy);
        readStream.read(500);
        readStream.read(500);
        readStream.read(500);
        expect(readStream._readableState.ended).toBe(true);
        setTimeout(function () {
            expect(endSpy).toHaveBeenCalled();
            done();
        }, 30);
    });

    describe('with flowing stream', function () {
        beforeEach(function () {
            // Adding a 'data' event handler changes
            // a stream from "paused" mode to "flowing" mode
            readStream.on('data', () => null);
        })

        it('should be able to set a buffer', function () {
            var len = 1;
            expect(readStream.read(2)).toEqual(null);
            readStream.setBuffer(new Buffer(len));

            expect(readStream.complete).toBe(true);
            expect(readStream._offset).toBe(len);
            expect(readStream._object.length).toBe(len);
        });
    });

});
