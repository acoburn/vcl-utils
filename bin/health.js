var health = require('../').Health;

health.on('error', function(err) {
  console.log("Error :: " + err);
});

health.on('incorrectImage', function(host) {
  console.log("Incorrect Revision :: " + host);
});

health.on('failed', function(host) {
  console.log('Failed :: ' + host);
});

health.check({
    config: '/etc/vcl/vcld.conf',
    sshKey: '/etc/vcl/vcl.key'
  });
      
