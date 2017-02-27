'use strict';

var util = require('util');
var Duplex = require('stream').Duplex;
var LinkedList = require('linkedlist');

util.inherits(BufferingDuplexStream, Duplex);

function BufferingDuplexStream() {
    Duplex.call(this);
    this.chunks = new LinkedList();
	 this.unfullfilledReadCount = 0;
	 this.onEnd = this.onEnd.bind(this);
	 this.onFinish = this.onFinish.bind(this);

	 this.on('end', this.onEnd);
	 this.on('finish', this.onFinish);

}

BufferingDuplexStream.prototype._read = function () {
    if (this.chunks.length) {
	    var chunk = this.chunks.shift();
	    this.push(chunk);
	    this.unfullfilledReadCount =  this.unfullfilledReadCount - 1;
    }
    else {
	    this.unfullfilledReadCount = this.unfullfilledReadCount + 1;
    }
};

BufferingDuplexStream.prototype._write = function (chunk, encoding, next) {
	//  self.emitters[key]._buffer.push(chunk);
	//  self.emitters[key].emit('data', chunk);
	 if (this.unfullfilledReadCount) {
		  this.push(chunk);
		  this.unfullfilledReadCount =  this.unfullfilledReadCount - 1;
	 }
	 else {
		  this.chunks.push(chunk);
	 }
	 next();
};

BufferingDuplexStream.prototype.onEnd = function(){
    this.removeAllListeners();
};

BufferingDuplexStream.prototype.onFinish = function(){
    if (this.unfullfilledReadCount) {
        this.push(null);
    }
    else {
        this.chunks.push(null);
    }
};

module.exports = BufferingDuplexStream;
