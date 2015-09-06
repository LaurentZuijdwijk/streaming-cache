'use strict';

var util = require('util');
var Readable = require('stream').Readable;

util.inherits(ReadStream, Readable);

function ReadStream() {
    Readable.call(this);
    this._offset = 0;
    this.readable = false;
}

ReadStream.prototype.setBuffer = function (_object) {
    this._object = _object;
    var self = this;
    if (_object.length) {
        this._push(_object.length);
        this.emit('readable');
    }
};
ReadStream.prototype.updateBuffer = function (_object) {
    var self = this;
    this._object = _object;
    this.emit('readable');
    // this._push(_object.length);
};

ReadStream.prototype.complete = false;

ReadStream.prototype.finish = function () {
    // console.log('------finish')
    if (this._offset < this._object.length) {
        var offset = this._offset;
        this._offset = this._object.length;
        this.push(this._object.slice(this._offset, this._object.length));
    }
    this.push(null);
    this.emit('end');
}
ReadStream.prototype._push = function (size) {
    if (!this._object.length) {
        return
    }
    if (this._offset + size > this._object.length) {
        size = this._object.length - this._offset;
    }
    if (this._offset < this._object.length) {
        var offset = this._offset;
        this._offset += size;
        if (this.push(this._object.slice(offset, (offset + size)))) {
            this._push(size);
        }
    }
    else if (this.complete && this._offset >= this._object.length) {
        this.push(null);
    }
}

ReadStream.prototype._read = function (size) {
    this._push(size);
};

module.exports = ReadStream;
