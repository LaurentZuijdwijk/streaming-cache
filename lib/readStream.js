'use strict';

var util = require('util');
var Readable = require('stream').Readable;

util.inherits(ReadStream, Readable);

function ReadStream() {
    Readable.call(this);
    this._offset = 0;
    this.readable = false;
    this._object = new Buffer(0);
}

ReadStream.prototype.setBuffer = function (_object) {
    this.complete = true;
    this._object = _object;
    this._push();
};

ReadStream.prototype.updateBuffer = function (_object) {
    this._object = _object;
};

ReadStream.prototype.complete = false;

ReadStream.prototype._push = function (size) {
    if (this.ended) {
        return;
    }
    if (this.complete && this._offset === this._object.length && !this._readableState.ended) {
        this.push(null);
        this.ended = true;
        return;
    }
    if (!size) {size =  24 * 1024;}
    if (!this._object.length) {
        return;
    }
    if (this._offset + size > this._object.length) {
        size = this._object.length - this._offset;
    }
    if (this._offset < this._object.length) {
        var offset = this._offset;
        this._offset += size ;
        this.push(this._object.slice(offset, (offset + size)));
    }
};
ReadStream.prototype._read = function (size) {
    this._push(size);
};

module.exports = ReadStream;
