var fs           = require('fs')
  , EventEmitter = require('events').EventEmitter
  , Util         = require('util') 
  , _            = require('underscore')
  , mysql        = require('mysql')
  , async        = require('async')
  , SSHConnection   = require('ssh2');


var parseConfig = function (filename, next) {
  fs.readFile(filename, function (err, data) {
    if (err) {
      self.emit('error', 'Could not read config file: ' + options.config);
      next(err);
    } else {
      // Parse the vcld.conf file into an object
      next(null, data.toString()
                     .split(/\r?\n/)
                     .map(function(x){ return x.replace(/#.*$/, ''); })
                     .filter(function(x){ return x.match(/^[\w\.-]+=[\w\.-]+$/); })
                     .reduce(function (acc, x) {
                         var d = x.split('=');
                         acc[d[0]] = d[1];
                         return acc;
                       }, {}));
    }
  });
};



var checkVM = function (row, i, next) {
  var self = this;
  var sshConnection = new SSHConnection();

  sshConnection.on('error', function(err) {
    console.log(i);
    if (i < 5) {
      setTimeout(function () {
        checkVM.call(self, row, i + 1, next); }, 1000 * 10);
    } else {
      self.emit('error', 'Error connecting to ' + row.hostname + ' :: ' + err);
    }
  });

  sshConnection.on('ready', function() {
    sshConnection.exec('cat currentimage.txt', function(err, stream) {
      if (err) {
        self.emit('error', 'Could not read currentimage.txt on ' + row.hostname + ' :: ' + err);
        sshConnection.end();
        next(null, {error: row.hostname});
      } else {
        var data = '';
        stream.on('data', function(buffer) {
          data += buffer.toString();
        });
        stream.on('close', function () {
          var lines = data.split(/\r?\n/)
            , imageData = _.extend({
                              name: lines.shift()
                            },
                            lines.reduce(function (acc, x) {
                                var d = x.split('=');
                                acc[d[0]] = d[1];
                                return acc;
                              }, {})
                            );
          sshConnection.end();
          if (_.isUndefined(imageData.imagerevision_id)) {
            self.emit('error', 'Could not extract imageRevision from currentimage.txt on ' + row.hostname);
            next(null, {error: row.hostname, msg: 'Could not extract imageRevision'});
          } else if (row.imagerevisionid != imageData.imagerevision_id) {
            self.emit('incorrectRevision', row.hostname);
            self.emit('info', row.hostname + ' (incorrectRevision)');
            next(null, {error: row.hostname, msg: 'incorrect revision'});
          } else {
            self.emit(row.state, row.hostname);
            self.emit('info', 'checked ' + row.hostname + ' (' + row.state + ')');
            var d = {};
            d[row.state] = row.hostname;
            next(null, d);
          }
        });
      }
    });
  });
  if (row.state === 'available') {
    if (row.image === 'noimage') {
      self.emit('info', 'skipped ' + row.hostname + ' (' + row.image + ')');
      next(null, {skipped: row.hostname});
    } else {
      sshConnection.connect({
        host: row.hostname,
        username: process.env.USER,
        privateKey: fs.readFileSync(row.keys)
      });
    }
  } else {
    self.emit(row.state, row.hostname);
    self.emit('info', 'skipped ' + row.hostname + ' (' + row.state + ')');
    next(null, {skipped: row.hostname});
  }
};




// Health constructor
// ------------------
function Health() {
  EventEmitter.call(this);
}; // Health

Util.inherits(Health, EventEmitter);



Health.prototype.checkhost = function(/*host, options, next*/) {
  var self = this
    , hostname = _.first(arguments)
    , options = _.defaults(_.isObject(arguments[1]) && !_.isFunction(arguments[1])
        ? arguments[1] : {}, {
          config: '/etc/vcl/vcld.conf'
        })
    , next = _.isFunction(_.last(arguments)) ? _.last(arguments) : new Function ()
    ;

  parseConfig(options.config, function (err, config) {
    var connection = mysql.createConnection(_.extend({
          host  : config.server,
          user  : config.LockerWrtUser,
          password : config.wrtPass,
          database : config.database
        }, options)
    );

    connection.connect(function (err) {
      if (err) {
        self.emit('error', 'Error connecting to MySQL :: ' + err);
      } else {
          connection.query("SELECT c.hostname, c.imagerevisionid, ci.name AS image, ci.prettyname, cs.name AS state, mn.keys " +
                 "FROM managementnode AS mn " +
                 "INNER JOIN state AS mns ON mns.id = mn.stateid AND mns.name = 'available'" +
                 "INNER JOIN resource AS r1 ON mn.id = r1.subid " +
                 "INNER JOIN resourcetype AS rt1 ON r1.resourcetypeid=rt1.id AND rt1.name = 'managementnode' " +
                 "INNER JOIN resourcegroupmembers AS rgm1 ON r1.id = rgm1.resourceid " +
                 "INNER JOIN resourcegroup AS rg1 ON rgm1.resourcegroupid = rg1.id " +
                 "INNER JOIN resourcemap AS rm ON rg1.id = rm.resourcegroupid1 " +
                 "INNER JOIN resourcegroup AS rg2 ON rm.resourcegroupid2 = rg2.id " +
                 "INNER JOIN resourcegroupmembers AS rgm2 ON rgm2.resourcegroupid = rg2.id " +
                 "INNER JOIN resource AS r2 ON rgm2.resourceid = r2.id " +
                 "INNER JOIN resourcetype AS rt2 ON r2.resourcetypeid = rt2.id AND rt2.name = 'computer' " +
                 "INNER JOIN computer AS c ON r2.subid = c.id " +
                 "INNER JOIN state AS cs ON c.stateid = cs.id AND cs.name != 'vmhostinuse' " +
                 "INNER JOIN image AS ci ON c.currentimageid = ci.id " +
                 "WHERE mn.hostname = ? AND c.hostname = ? " +
                 "GROUP BY c.id", [config.FQDN, hostname], function(err, rows, fields) {
            if (err) {
              self.emit('error', 'Could not execute query :: ' + err);
            } else {
              self.emit('info', 'Number of nodes on ' + config.FQDN + ': ' + rows.length);
              async.map(rows, function (row, next) {
                checkVM.call(self, row, 0, next); 
              }, next);
            }
            connection.end();
          });
      }
    });
  });
}; // Health.prototype.checkhost



// Health.check(opts, callback) method
//
//  @param {object} options
//  @param {function} callback
// -------------------------
Health.prototype.check = function(/*options, next*/) {
  var self = this
    , options = _.defaults(_.isObject(_.first(arguments)) && !_.isFunction(_.first(arguments)) ? _.first(arguments) : {}, {
        config: '/etc/vcl/vcld.conf'
      })
    , next = _.isFunction(_.last(arguments)) ? _.last(arguments) : new Function ()
    ;
  
  parseConfig(options.config, function (err, config) {
      var connection = mysql.createConnection(_.extend({
          host  : config.server,
          user  : config.LockerWrtUser,
          password : config.wrtPass,
          database : config.database
        }, options)
      );

      connection.connect(function(err) {
        if (err) {
          self.emit('error', 'Error connecting to MySQL :: ' + err);    
          next(err);
        } else {
          // Select all computers controlled by the configured mgmt node
          connection.query("SELECT c.hostname, c.imagerevisionid, ci.name AS image, ci.prettyname, cs.name AS state, mn.keys " +
                 "FROM managementnode AS mn " +
                 "INNER JOIN state AS mns ON mns.id = mn.stateid AND mns.name = 'available'" +
                 "INNER JOIN resource AS r1 ON mn.id = r1.subid " +
                 "INNER JOIN resourcetype AS rt1 ON r1.resourcetypeid=rt1.id AND rt1.name = 'managementnode' " +
                 "INNER JOIN resourcegroupmembers AS rgm1 ON r1.id = rgm1.resourceid " +
                 "INNER JOIN resourcegroup AS rg1 ON rgm1.resourcegroupid = rg1.id " +
                 "INNER JOIN resourcemap AS rm ON rg1.id = rm.resourcegroupid1 " +
                 "INNER JOIN resourcegroup AS rg2 ON rm.resourcegroupid2 = rg2.id " +
                 "INNER JOIN resourcegroupmembers AS rgm2 ON rgm2.resourcegroupid = rg2.id " +
                 "INNER JOIN resource AS r2 ON rgm2.resourceid = r2.id " +
                 "INNER JOIN resourcetype AS rt2 ON r2.resourcetypeid = rt2.id AND rt2.name = 'computer' " +
                 "INNER JOIN computer AS c ON r2.subid = c.id " +
                 "INNER JOIN state AS cs ON c.stateid = cs.id AND cs.name != 'vmhostinuse' " +
                 "INNER JOIN image AS ci ON c.currentimageid = ci.id " +
                 "WHERE mn.hostname = ? " +
                 "GROUP BY c.id", [config.FQDN], function(err, rows, fields) {
            if (err) {
              self.emit('error', 'Could not execute query :: ' + err);
            } else {
              self.emit('info', 'Number of nodes on ' + config.FQDN + ': ' + rows.length);
              async.map(rows, function (row, next) {
                checkVM.call(self, row, 0, next); 
              }, next);
            }
            connection.end();
        });
      }
    });
  });
}; // Health.prototype.check()

module.exports = Health;
