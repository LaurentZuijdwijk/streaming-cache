'use strict';

var util = require('util');
var Readable = require('stream').Readable;

util.inherits(ReadStream, Readable);

function ReadStream() {
    Readable.call(this);
    this._offset = 0;
    this.readable = false;
    this.complete = false;
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

ReadStream.prototype._push = function (size) {
    if (this.ended || !this._object.length) {
        return;
    }
    if (this.complete && this._offset === this._object.length && !this._readableState.ended) {
        this.push(null);
        this.ended = true;
        return;
    }

    size = size || 24 * 1024;
    size = Math.min(size, this._object.length - this._offset);

    if (this._offset < this._object.length) {
        var currentOffset = this._offset;
        var nextOffset = this._offset + size;
        this._offset = nextOffset;

        try {
            this.push(this._object.slice(currentOffset, nextOffset));
        }
        catch (err) {
            this.emit('error', err)
        }
    }
};

ReadStream.prototype._read = function (size) {
    this._push(size);
};

module.exports = ReadStream;
