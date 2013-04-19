var common = exports
  , path   = require('path');

common.lib = path.join(__dirname, '../lib');

var monitor = require('../').Health;

monitor.on('error', function(err) {
  console.log("Error :: " + err);
});

monitor.on('incorrectImage', function(host) {
  console.log("Incorrect Revision :: " + host);
});

monitor.on('info', function(msg) {
  console.log(msg);
});

monitor.on('failed', function(host) {
  console.log('Failed :: ' + host);
});

monitor.on('available', function(host) {
  console.log('OK :: ' + host);
});

monitor.check({
    config: '/etc/vcl/vcld.conf',
    sshKey: '/etc/vcl/vcl.key',
    insecureAuth: true
  });
      
