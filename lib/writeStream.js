'use strict';

var util = require('util');
var Writable = require('stream').Writable;

util.inherits(WriteStream, Writable);

function WriteStream() {
    Writable.call(this);
}
WriteStream.prototype._write = function (chunk, encoding, cb) {
    this.emit('data', chunk)
    cb();
    return true;
};

module.exports = WriteStream;
