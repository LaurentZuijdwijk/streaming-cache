'use strict';

var LRU = require('lru-cache') ;

var EventEmitter = require('events').EventEmitter;
var emitters = {};

var STATUS_PENDING = 1;
var STATUS_DONE = 2;

var ReadStream = require('./lib/readStream');
var Transform = require('stream').Transform;

var lruOptions = {
    length: function (cachedObject) {
        if (cachedObject.data) {
            return cachedObject.data.length;
        }
        else {
            return 0;
        }
    }
};

var StreamingCache = function (options) {
    this.cache = LRU(options);
}

StreamingCache.prototype.setData = function (key, data) {
    var self = this;
    checkKey(key);

    var c = {};
    c.data = data;
    c.status = STATUS_DONE;
    self.cache.set(key, c);
    return this;
}

StreamingCache.prototype.getData = function (key, cb) {
    var self = this;
    checkKey(key);

    if (!cb) {
        throw(new Error('callback expected'));
    }
    var object = this.cache.get(key);
    if (!object) {
        cb('cache miss');
    }
    else if (object.status === STATUS_PENDING) {
        emitters[key].on('error', function (err) {
            cb(err);
        })
        emitters[key].on('end', function (data) {
            cb(null, self.cache.get(key).data);
        })
    }
    else {
        cb(null, object.data);
        return;
    }
}
StreamingCache.prototype.setMetadata = function (key, metadata) {
    checkKey(key);

    var data = this.cache.get(key);
    if (!data) {
        data = {};
    }
    data.metadata = metadata;
    this.cache.set(key, data);
};

StreamingCache.prototype.getMetadata = function (key) {
    checkKey(key);

    var data = this.cache.get(key);
    if (data && data.metadata) {
        return data.metadata;
    }
    return null;
};

StreamingCache.prototype.exists = function (key) {
    checkKey(key);
    var object = this.cache.get(key);
    if (object && object.status) {
        return true;
    }
    else {
        return false;
    }
};

StreamingCache.prototype.del = function (key) {
    this.cache.del(key);
};
function checkKey(key) {
    if (!key) {
        throw(new Error('Key expected'));
    }
}
StreamingCache.prototype.get = function (key) {
    checkKey(key);

    var object = this.cache.get(key);
    var stream;
    var self = this;

    if (!object) {
        return undefined;
    }
    else if (object.status === STATUS_PENDING) {
        stream = new ReadStream();
        emitters[key].on('error', function (error) {
            stream.emit('error', error);
        });
        emitters[key].on('end', function (data) {
            stream.setBuffer(self.cache.get(key).data);
        });

        stream.updateBuffer(Buffer.concat(emitters[key]._buffer));

        emitters[key].on('data', function (chunk) {
            stream.updateBuffer(Buffer.concat(emitters[key]._buffer));
        });
        return stream;
    }
    else {
        stream = new ReadStream();
        stream.setBuffer(object.data);
        return stream;
    }
};

StreamingCache.prototype.set = function (key) {
    var self = this;
    checkKey(key);

    self.cache.set(key, {status : STATUS_PENDING});
    emitters[key] = new EventEmitter();
    emitters[key]._buffer = [];
    var dataBuffer = emitters[key]._buffer;

    var stream = new Transform();

    stream._transform = function (chunk, encoding, done) {
        dataBuffer.push(chunk);
        emitters[key].emit('data', chunk);
        done(null, chunk);
    };

    stream.on('error', function (err) {
        self.cache.del(key);
        emitters[key].emit('error', err);
        stream.removeAllListeners();
        emitters[key].removeAllListeners();
        delete emitters[key];
    });
    stream.on('finish', function () {
        var c = self.cache.get(key);
        var buffer = Buffer.concat(dataBuffer)
        c.metadata = c.metadata || {};
        c.metadata.length = buffer.length;
        c.metadata.byteLength = buffer.byteLength;
        c.data = buffer;
        c.status = STATUS_DONE;
        self.cache.set(key, c);
        emitters[key].emit('end');
        delete emitters[key];
    });
    return stream;
};

module.exports = StreamingCache;
