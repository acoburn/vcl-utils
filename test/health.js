var health = require('../').Health;

var opts = {
  config: '/etc/vcl/vcld.conf'};

health.on('error', function(err) {
  console.log("Error :: " + err);
});


health.on('incorrectImage', function(host) {
  console.log("Incorrect Revision :: " + host);
});


health.on('info', function(msg) {
  console.log(msg);
});


health.on('failed', function(host) {
  console.log('Failed :: ' + host);
});


health.on('available', function(host) {
  console.log('OK :: ' + host);
});


health.check(opts, function (err, results) {
  results.forEach(function (x) {
            console.log('Summary :: ' + JSON.stringify(x));
          });
});
      
