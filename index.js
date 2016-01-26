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

    var hit = this.cache.get(key);
    return !!(hit && hit.status);
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

    var object = this.cache.get(key);
    var stream;

    if (!object) {
        return undefined;
    }
    else if (object.status === STATUS_PENDING) {
        return this.returnPendingStream(key);
    }
    else {
        stream = new ReadStream();
        stream.setBuffer(object.data);
        return stream;
    }
};

StreamingCache.prototype.set = function (key) {
    var self = this;
    utils.ensureDefined(key, 'Key');

    var metadata = self.getMetadata(key) || {};

    self.cache.set(key, { status: STATUS_PENDING, metadata: metadata });
    self.emitters[key] = new EventEmitter();
    self.emitters[key].setMaxListeners(250);
    self.emitters[key]._buffer = [];

    var chunks = new LinkedList();
    var stream = new Streams.Duplex()
    stream._read = function () {
        if (!chunks) {
            this.needRead = true;
            return;
        }
        var chunk = chunks.shift();
        if (!chunk) {
            this.needRead = true;
        }
        else {
            this.push(chunk);
            this.needRead = false;
        }
    }
    stream._write = function (chunk, encoding, next) {
        self.emitters[key]._buffer.push(chunk);
        self.emitters[key].emit('data', chunk);
        if (this.needRead) {
            this.push(chunk);
        }
        else {
            chunks.push(chunk);
        }
        next(null, chunk);
    }

    stream.on('error', function (err) {
        self.cache.del(key);
        if (self.emitters[key] && self.emitters[key]._events.error) {
            self.emitters[key].emit('error', err);
        }
        stream.removeAllListeners();
        self.emitters[key].removeAllListeners();
        delete self.emitters[key];
    });

    stream.on('finish', function () {
        if (this.needRead) {
            this.push(null);
        }
        else {
            chunks.push(null);
        }
        var c = self.cache.get(key);
        chunks = null;
        if (!c) {
            self.emitters[key].emit('end', Buffer.concat(self.emitters[key]._buffer));
            delete self.emitters[key];
            return;
        }
        var buffer = Buffer.concat(self.emitters[key]._buffer);
        c.metadata = c.metadata || {};
        c.metadata.length = buffer.toString().length;
        c.metadata.byteLength = buffer.byteLength;
        c.data = buffer;
        c.status = STATUS_DONE;
        self.cache.set(key, c);
        self.emitters[key].emit('end', Buffer.concat(self.emitters[key]._buffer));
        delete self.emitters[key];
    });
    return stream;
};

StreamingCache.prototype.reset = function () {
    this.cache.reset();
    this.emitters = {};
};

module.exports = StreamingCache;
