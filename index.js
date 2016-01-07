'use strict';

var LRU = require('lru-cache') ;
var EventEmitter = require('events').EventEmitter;
var STATUS_PENDING = 1;
var STATUS_DONE = 2;

var ReadStream = require('./lib/readStream');
var Streams = require('stream');

var LinkedList = require('linkedlist');
var emitters = {};

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

var StreamingCache = function StreamingCache(options) {
    options = options || {};
    options.length = lruOptions.length;
    this.cache = LRU(options);
    Object.defineProperty(this, 'length', {
        get: function () {
            return this.cache.length;
        }
    });
    Object.defineProperty(this, 'itemCount', {
        get: function () {
            return this.cache.itemCount;
        }
    });
}

StreamingCache.prototype.setData = function (key, data) {
    var self = this;
    checkKey(key);

    var c = {};
    c.data = data;
    c.metadata = self.getMetadata(key) || {};

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

StreamingCache.prototype.returnPendingStream = function (key) {
    var stream = new ReadStream();
    emitters[key].on('error', function (error) {
        stream.emit('error', error);
    });
    emitters[key].on('end', function (data) {
        stream.setBuffer(data);
    });

    stream.updateBuffer(Buffer.concat(emitters[key]._buffer));

    emitters[key].on('data', function (chunk) {
        stream.updateBuffer(Buffer.concat(emitters[key]._buffer));
    });
    return stream;
}

StreamingCache.prototype.get = function (key) {
    checkKey(key);

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

StreamingCache.prototype.reset = function () {
    this.cache.reset();
};

StreamingCache.prototype.set = function (key) {
    var self = this;
    checkKey(key);

    var metadata = self.getMetadata(key) || {};

    self.cache.set(key, { status : STATUS_PENDING, metadata: metadata});
    emitters[key] = new EventEmitter();
    emitters[key].setMaxListeners(250);
    emitters[key]._buffer = [];

    var chunks = new LinkedList();
    var stream = new Streams.Duplex()
    stream._read = function () {
        var chunk = chunks.shift();
        if (!chunk) {
            this.needRead = true;
        }
        else {
            this.push(chunk);
            this.needRead = false;
        }
    }
    stream._write =  function (chunk, encoding, next) {
        emitters[key]._buffer.push(chunk);
        emitters[key].emit('data', chunk);
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
        if (emitters[key] && emitters[key]._events.error) {
            emitters[key].emit('error', err);
        }
        stream.removeAllListeners();
        emitters[key].removeAllListeners();
        delete emitters[key];
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
            emitters[key].emit('end', Buffer.concat(emitters[key]._buffer));
            delete emitters[key];
            return;
        }
        var buffer = Buffer.concat(emitters[key]._buffer);
        c.metadata = c.metadata || {};
        c.metadata.length = buffer.toString().length;
        c.metadata.byteLength = buffer.byteLength;
        c.data = buffer;
        c.status = STATUS_DONE;
        self.cache.set(key, c);
        emitters[key].emit('end', Buffer.concat(emitters[key]._buffer));
        delete emitters[key];
    });
    return stream;
};

module.exports = StreamingCache;
