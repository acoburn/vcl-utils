
Description
===========

This is a [node.js](http://nodejs.org) tool for monitoring an apache-vcl infrastructure.

Development/testing is done against Apache-VCL version 2.3.x.

Requirements
============

* [node.js](http://nodejs.org/) -- v0.8.7 or newer


Install
=======

    npm install vcl-monitor

Examples
========

Here is an example for how to use it:

```js
var vcl = require('vcl-monitor');

var monitor = vcl.createMonitor({
    mysql: {
        host: 'localhost',
        user: 'vcl',
        database: 'vcl',
        password: 'secret'
      },
    ssh: {
        privateKey: '/etc/vcl/vcl.key',
        username: 'root'
      }
  });

monitor.on('info', function(msg) {
    console.log('INFO :: ' + msg);
});

monitor.check('vcl-m01.example.org');
```

Or, you can check only for computers with incorrect image revisions:

```js
var vcl = require('vcl-monitor');

var monitor = vcl.createMonitor({
    mysql: {...},
    ssh: {...}
  });

monitor.on('incorrectImage', function(host) {
    console.log('Incorrect Image :: ' + host);
});

monitor.check('vcl-m01.example.org');
```

API
===

Monitor events
--------------

* **info**() - Information about each computer managed by this management node.

* **error**() - Any errors encountered in connecting to computers.

* **incorrectImage**() - All computers with a non-matching image.

* **available**() - All computers in an **_available_** state.

* **failed**() - All computers in a **_failed_** state.

* **inuse**() - All computers currently in use.

* **reloading**() - All computers currently reloading.

Monitor methods
---------------

```js
monitor.check(managementNode);
```

The `check()` method will find all computers for a given management node, and
(if the computer is 'available'), it will login and check that the image 
revisionid matches what is listed in the database. For any other state,
the computer will not be checked, but an event corresponding to that state
will be emitted.







