Streaming Cache
===============

This is a stream and a cache at the same time. 

We use it to stream data into the cache and make any waiting connections for the same data queue up until the data is in the cache.

If there are for example 3 requests for a certain file in close succession, then we can pipe the result for the first request into the cache. The 2 other requests will receive a stream which will start when the first one is finished.

Usefull for caching streaming connections, such as S3.  