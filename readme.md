!['Build status'](https://travis-ci.org/LaurentZuijdwijk/streaming-cache.svg?branch=master)

Streaming Cache
===============

Cache, queue and distribute streams immediately. Streams can be replayed immediately, even if the source is not finished.

Usefull for caching (slow) streaming connections, such as S3 requests or complex database queries.  

We use it to stream data into the cache and make any waiting connections for the same data queue up until the data is in the cache.

If there are for example 3 requests for a certain file in close succession, then we can pipe the result for the first request into the cache. The 2 other requests will receive a stream which will start when the first one is finished.


Installation
------------

```npm i streaming-cache --save```

Quick example
-------------

```javascript

var Cache = require('../index.js');
var cache = new Cache();
var fs = require('fs');

var readstream = fs.createReadStream('readme.md');
var writestream = fs.createWriteStream('test2.txt');

readstream.pipe(cache.set('a'));

setTimeout(function(){
  writestream2.write('written from cache\n\n');
  cache.get('a').pipe(writestream);
 }, 200);

```


API
---

##### set(key)
returns a transform stream that can be piped to
```
fileStream.pipe(cache.set('key')).pipe(res);
```


##### get(key):ReadableStream 

```javascript
var cached = cache.get('key');
if(cached){
	cached.pipe(res);
}
```


#### setData(key, data)
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

