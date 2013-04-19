# vcl-utils


## Requirements

* [node.js](http://nodejs.org/) -- v0.8.7 or newer
* [Apache-VCL](http://vcl.apache.org/) -- version 2.3 or newer

## Install

```bash
npm install vcl-utils
```

## Introduction

This is a [node.js](http://nodejs.org) tool for monitoring an [apache-vcl](http://vcl.apache.org) infrastructure. It quickly checks on the status of all nodes controlled by a given management node.

## Examples

Here is an example for how to use it:

```js
var health = require('vcl-utils').Health;

health.on('info', function(msg) {
    console.log('INFO :: ' + msg);
});

health.check({
    config: '/etc/vcl/vcld.conf'
  });
```

Or, you can check only for computers with incorrect image revisions:

```js
var health = require('vcl-utils').Health;

health.on('incorrectImage', function(host) {
    console.log('Incorrect Image :: ' + host);
  });

health.check({
    config: '/etc/vcl/vcld.conf'
  });
```

## API

### Health events

* **info**() - Information about each computer managed by this management node.

* **error**() - Any errors encountered in connecting to computers.

* **incorrectImage**() - All computers with a non-matching image.

All other events correspond to the `state` value of a VCL node. Some of these include:

* **available**() - All computers in an **_available_** state.

* **failed**() - All computers in a **_failed_** state.

* **inuse**() - All computers currently in use.

* **reloading**() - All computers currently reloading.

* **reserved**() - All currently reserved computers.

* **maintenance**() - All computers in the maintenance state.

### Health methods

```js
health.check({
    config: '/etc/vcl/vcld.conf'
  });
```

The `check()` method will find all computers for a given management node, and
(if the computer is 'available'), it will login and check that the image 
revisionid matches what is listed in the database. For any other state,
the computer will not be checked, but an event corresponding to that state
will be emitted.

### Health.check() options

When issuing a health check, you can set the following option:

* `config`: The path to the vcld.conf file. (Default: `/etc/vcl/vcld.conf`) 
  
It is typically unnecessary to set additional values. If, however, it is
necessary to pass additional values to the MySQL connection, these can be set
here. The full list of MySQL configuration values are available at the
[node-mysql](https://github.com/felixge/node-mysql/) page.

