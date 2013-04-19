
Description
===========

This is a [node.js](http://nodejs.org) tool for monitoring an apache-vcl infrastructure.

Development/testing is done against Apache-VCL version 2.3.x.

Requirements
============

* [node.js](http://nodejs.org/) -- v0.8.7 or newer


Install
=======

    npm install vcl-utils

Examples
========

Here is an example for how to use it:

```js
var health = require('vcl-utils').Health;

health.on('info', function(msg) {
    console.log('INFO :: ' + msg);
});

health.check({
    config: '/etc/vcl/vcld.conf',
    sshKey: '/etc/vcl/vcl.key'
  });
```

Or, you can check only for computers with incorrect image revisions:

```js
var health = require('vcl-utils').Health;

health.on('incorrectImage', function(host) {
    console.log('Incorrect Image :: ' + host);
  });

health.check({
    config: '/etc/vcl/vcld.conf',
    sshKey: '/etc/vcl/vcl.key'
  });
```

API
===

Health events
--------------

* **info**() - Information about each computer managed by this management node.

* **error**() - Any errors encountered in connecting to computers.

* **incorrectImage**() - All computers with a non-matching image.

* **available**() - All computers in an **_available_** state.

* **failed**() - All computers in a **_failed_** state.

* **inuse**() - All computers currently in use.

* **reloading**() - All computers currently reloading.

Health methods
---------------

```js
health.check({
    config: '/path/to/vcld.conf',
    sshKey: '/path/to/vcl.key'
  });
```

The `check()` method will find all computers for a given management node, and
(if the computer is 'available'), it will login and check that the image 
revisionid matches what is listed in the database. For any other state,
the computer will not be checked, but an event corresponding to that state
will be emitted.

