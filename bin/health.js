var monitor = require('../').Health;

monitor.on('error', function(err) {
  console.log("Error :: " + err);
});

monitor.on('incorrectImage', function(host) {
  console.log("Incorrect Revision :: " + host);
});


monitor.on('failed', function(host) {
  console.log('Failed :: ' + host);
});

monitor.check({
    config: '/etc/vcl/vcld.conf',
    sshKey: '/etc/vcl/vcl.key'
  });
      
