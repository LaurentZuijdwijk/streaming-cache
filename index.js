'use strict';

var cache = require('memory-cache');

var EventEmitter = require('events').EventEmitter;
var emitters = {};

var STATUS_PENDING = 1;
var STATUS_DONE = 2;

var ReadStream = require('./lib/readStream');
var Transform = require('stream').Transform;

var StreamingCache = function (options) {
    if (options && options.pendingTimeout) {
    }
}

StreamingCache.prototype.getData = function (key, cb) {
    if (!key) {
        throw(new Error('Key expected'));
    }
    if (!cb) {
        throw(new Error('callback expected'));
    }
    var object = cache.get(key);
    if (!object) {
        cb('cache miss');
    }
    else if (object.status === STATUS_PENDING) {
        emitters[key].on('error', function (err) {
            cb(err);
        })
        emitters[key].on('end', function (data) {
            cb(null, cache.get(key).data);
        })
    }
    else {
        cb(null, object.data);
        return;
    }
}

StreamingCache.prototype.get = function (key) {
    var object = cache.get(key);
    var stream;
    if (!object) {
        return undefined;
    }
    else if (object.status === STATUS_PENDING) {
        console.log('pending')
        stream = new ReadStream();
        emitters[key].on('error', function (error) {
            stream.emit('error', error);
        });
        emitters[key].on('end', function (data) {
            stream.setBuffer(cache.get(key).data);
            stream.complete = true;
            stream.finish();
        });

        stream.setBuffer(Buffer.concat(emitters[key]._buffer));

        emitters[key].on('data', function (chunk) {
            stream.updateBuffer(Buffer.concat(emitters[key]._buffer));
        });
        return stream;
    }
    else {
        stream = new ReadStream();
        stream.setBuffer(object.data);
        stream.complete = true;
        return stream;
    }
};

StreamingCache.prototype.set = function (key) {
    if (!key) {
        throw(new Error('Key expected'));
    }
    console.log('set!!!', key)
    cache.put(key, {status : STATUS_PENDING});
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
        console.log('error', err.toString())
        cache.del(key);
        emitters[key].emit('error', err);
        stream.removeAllListeners();
        emitters[key].removeAllListeners();
        delete emitters[key];
    });
    stream.on('finish', function () {
        var c = cache.get(key);
        var buffer = Buffer.concat(dataBuffer)
        c.metadata = c.metadata || {};
        c.metadata.length = buffer.length;
        c.metadata.byteLength = buffer.byteLength;
        c.data = buffer;
        c.status = STATUS_DONE;
        cache.put(key, c);
        emitters[key].emit('end');
        delete emitters[key];
    });
    return stream;
};

StreamingCache.prototype.del = cache.del;

StreamingCache.prototype.setMetadata = function (key, metadata) {
    if (!key) {
        throw(new Error('Key expected'));
    }
    var data = cache.get(key);
    if (!data) {
        data = {};
    }
    data.metadata = metadata;
    cache.put(key, data);
};

StreamingCache.prototype.getMetadata = function (key) {
    if (!key) {
        throw(new Error('Key expected'));
    }
    var data = cache.get(key);
    if (data && data.metadata) {
        return data.metadata;
    }
    return null;
};

module.exports = StreamingCache;
