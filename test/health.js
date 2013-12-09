var health = require('../').Health;

var opts = {
  insecureAuth: true,
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
//  console.log('OK :: ' + host);
});


health.check(opts, function (err, results) {
  results.filter(function (x) { return x.error; })
         .forEach(function (x) {
            console.log('recheck ' + x.error);
            setTimeout(health.checkhost(x.error, opts), 1000 * 60 * 5);
          });
});
      
