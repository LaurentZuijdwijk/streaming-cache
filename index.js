'use strict';

var STATUS_PENDING = 1;
var STATUS_DONE = 2;

var LRU = require('lru-cache');
var EventEmitter = require('events').EventEmitter;
var LinkedList = require('linkedlist');
var Streams = require('stream');
var ReadStream = require('./lib/readStream');
var assign = require('lodash.assign');
var utils = require('./lib/utils');

var DEFAULT_LENGTH = function (value) {
    return value.data ? value.data.length : 1;
};

var StreamingCache = function StreamingCache(options) {
    this.cache = LRU(assign({ length: DEFAULT_LENGTH }, options));
    this.emitters = {};

    Object.defineProperties(this, {
        'length': {
            get: function () {
                return this.cache.length;
            }
        },
        'itemCount': {
            get: function () {
                return this.cache.itemCount;
            }
        }
    });
};

StreamingCache.prototype.setData = function (key, data) {
    utils.ensureDefined(key, 'Key');

    this.cache.set(key, {
        data: data,
        metadata: this.getMetadata(key) || {},
        status: STATUS_DONE
    });

    return this;
};

StreamingCache.prototype.getData = function (key, callback) {
    utils.ensureDefined(key, 'Key');
    utils.ensureDefined(callback, 'Callback');

    var self = this;
    var hit = self.cache.get(key);

    if (!hit) {
        return callback('Cache miss');
    }

    if (hit.status === STATUS_DONE) {
        return callback(null, hit.data);
    }

    self.emitters[key].on('error', function (error) {
        callback(error);
    })

    self.emitters[key].on('end', function (data) {
        callback(null, self.cache.get(key).data);
    })
};

StreamingCache.prototype.setMetadata = function (key, metadata) {
    utils.ensureDefined(key, 'Key');

    var data = assign({}, this.cache.get(key), { metadata: metadata })
    this.cache.set(key, data);
};

StreamingCache.prototype.getMetadata = function (key) {
    utils.ensureDefined(key, 'Key');

    var hit = this.cache.get(key);
    return hit && hit.metadata ? hit.metadata : null;
};

StreamingCache.prototype.exists = function (key) {
    utils.ensureDefined(key, 'Key');

    var hit = this.cache.has(key);
    return hit;
};

StreamingCache.prototype.del = function (key) {
    this.cache.del(key);
};

StreamingCache.prototype.returnPendingStream = function (key) {
    var self = this;
    var stream = new ReadStream();

    self.emitters[key].on('error', function (error) {
        stream.emit('error', error);
    });
    self.emitters[key].on('end', function (data) {
        stream.setBuffer(data);
    });
    self.emitters[key].on('data', function (chunk) {
        stream.updateBuffer(Buffer.concat(self.emitters[key]._buffer));
    });

    stream.updateBuffer(Buffer.concat(self.emitters[key]._buffer));
    return stream;
};

StreamingCache.prototype.get = function (key) {
    utils.ensureDefined(key, 'Key');

    var hit = this.cache.get(key);
    if (!hit) {
        return undefined;
    }

    if (hit.status === STATUS_PENDING) {
        return this.returnPendingStream(key);
    }

    var stream = new ReadStream();
    stream.setBuffer(hit.data);
    return stream;
};

StreamingCache.prototype.set = function (key) {
    utils.ensureDefined(key, 'Key');

    var self = this;
    var metadata = self.getMetadata(key) || {};

    self.cache.set(key, { status: STATUS_PENDING, metadata: metadata });
    self.emitters[key] = new EventEmitter();
    self.emitters[key].setMaxListeners(250);
    self.emitters[key]._buffer = [];

    var chunks = new LinkedList();
    var stream = new Streams.Duplex();
	stream.unfullfilledReadCount = 0;

	stream._read = function () {
		if(chunks.length){
			var chunk = chunks.shift();
			this.push(chunk);
			this.unfullfilledReadCount =  (this.unfullfilledReadCount > 0) ? this.unfullfilledReadCount - 1 : this.unfullfilledReadCount;
		}
		else{
			this.unfullfilledReadCount = this.unfullfilledReadCount + 1;
		}
    };

    stream._write = function (chunk, encoding, next) {
        if (!self.emitters[key]) return next(new Error("emitter already destroyed"));

        self.emitters[key]._buffer.push(chunk);
        self.emitters[key].emit('data', chunk);
        if (this.unfullfilledReadCount > 0) {
            this.push(chunk);
            this.unfullfilledReadCount =  this.unfullfilledReadCount - 1;
        }
        else {
            chunks.push(chunk);
        }
        next();
    }

    stream.on('error', function (err) {
        self.cache.del(key);
        if (self.emitters[key] && self.emitters[key]._events.error) {
            self.emitters[key].emit('error', err);
        }
        stream.removeAllListeners();
        if (self.emitters[key]) {
            self.emitters[key].removeAllListeners();
            delete self.emitters[key];
        }

    });

    stream.on('finish', function () {
        if (this.unfullfilledReadCount > 0) {
            this.push(null);
       }
        else {
			chunks.push(null);
        }

        if (!self.emitters[key]) return;

        var hit = self.cache.get(key);
        if (hit) {
            var buffer = Buffer.concat(self.emitters[key]._buffer);
            hit.metadata = hit.metadata || {};
            utils.assign(hit.metadata, {
                length: buffer.toString().length,
                byteLength: buffer.byteLength
            });
            utils.assign(hit, {
                data: buffer,
                status: STATUS_DONE
            });
            self.cache.set(key, hit);
        }

        self.emitters[key].emit('end', Buffer.concat(self.emitters[key]._buffer));
        delete self.emitters[key];
    });
    return stream;
};

StreamingCache.prototype.reset = function () {
    this.cache.reset();
};

module.exports = StreamingCache;
