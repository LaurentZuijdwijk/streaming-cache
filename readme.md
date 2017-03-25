[![Circle CI](https://circleci.com/gh/LaurentZuijdwijk/streaming-cache/tree/master.svg?style=svg)](https://circleci.com/gh/LaurentZuijdwijk/streaming-cache/tree/master)

Streaming Cache
===============

Speed up your services.

Cache, queue and distribute streams immediately. Streams can be replayed immediately, even if the source is not finished.

Uses a fixed size LRU-cache in the background.

Usefull for caching (slow) streaming connections, such as S3 requests or complex database queries.  

If there are for example 3 requests for a certain file in close succession, then we can pipe the result for the first request into the cache. The 2 other requests will receive a stream which will start even before the first one is finished.

Performance
-----------

Serving from this cache is extremely fast. On my local machine I get 2.5GB per second for a single process on localhost using AB. (4th gen i7).

Installation
------------

```npm i streaming-cache --save```

Quick example
-------------

```javascript

var Cache = require('../index.js');
var cache = new Cache();
var fs = require('fs');

var inputStream = fs.createReadStream('readme.md');
var outputStream = fs.createWriteStream('test2.txt');

inputStream.pipe(cache.set('myKey'));

setTimeout(function(){
  outputStream.write('written from cache\n\n');
  cache.get('myKey').pipe(outputStream);
 }, 200);

```

Options
-------

For a list of options see: https://www.npmjs.com/package/lru-cache


API
---

##### set(key)
returns a Duplex stream
```
fileStream.pipe(cache.set('key')).pipe(res);
```


##### get(key) => ReadableStream

```javascript
var cached = cache.get('key');
if(cached){
	cached.pipe(res);
}
```


#### setData(key, data) => WriteableStream
A set data synchronously to stream at a later moment

#### getData
Get data with a callback.

```javascript
cache.getData('key', function(err, data){
	if(err){
	  //handle error
	}
	// do something with data
}));
```
#### setMetadata(key, data)
Set metadata for a stream to be used later.

#### getMetadata(key, data)
Get metadata

#### exists(key)
returns true or false if a key exists.
