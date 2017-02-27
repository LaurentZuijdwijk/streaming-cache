/* jshint jasmine: true */
/*global describe beforeEach it expect jasmine*/

'use strict';

var BufferingDuplexStream = require('../lib/BufferingDuplexStream');
var Duplex = require('stream').Duplex;
var LinkedList = require('LinkedList');

var stream;

describe('BufferingDuplexStream', function () {
    var s;
    beforeEach(function () {
        stream = new BufferingDuplexStream();
    });
    it('Should extend Duplex', function () {
        expect(stream).toEqual(jasmine.any(Duplex));
    });
    it('Should be initialized correctly', function () {
        expect(stream.unfullfilledReadCount).toEqual(0);
		//   expect(stream.chunks).toEqual(jasmine.any(LinkedList));
    });

    it('cache.set needs to be called with a key', function () {
      //   expect(function () {cache.set();}).toThrow('Key expected');
    });
});
