var fs           = require('fs')
  , EventEmitter = require('events').EventEmitter
  , Util         = require('util') 
  , _            = require('underscore')
  , mysql        = require('mysql')
  , SSHConnection   = require('ssh2');

// Health constructor
// ------------------
function Health() {
  EventEmitter.call(this);
}; // Health

Util.inherits(Health, EventEmitter);

// Health.check(opts) method
// -------------------------
Health.prototype.check = function(options) {
  var self = this;

  options = _.defaults(options, {
      config: '/etc/vcl/vcld.conf'
    });
  
  fs.readFile(options.config, function (err, data) {
    if (err) {
      self.emit('error', 'Could not read config file: ' + options.config);
      return;
    }
    
    // Parse the vcld.conf file into an object
    var config = _.chain(data.toString().split(/\r?\n/))
                      .map(function(x){ return x.replace(/#.*$/, ''); })
                      .filter(function(x){ return x.match(/^[\w\.-]+=[\w\.-]+$/); })
                      .map(function(x){ return x.split('='); })
                      .object()
                      .value();
    
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
            _.each(rows, function(row) {
              var sshConnection = new SSHConnection();

              sshConnection.on('error', function(err) {
                self.emit('error', 'Error connecting to ' + row.hostname + ' :: ' + err);
              });

              sshConnection.on('ready', function() {
                sshConnection.exec('cat currentimage.txt', function(err, stream) {
                  if (err) {
                    self.emit('error', 'Could not read currentimage.txt on ' + row.hostname + ' :: ' + err);
                    sshConnection.end();
                  } else {
                    stream.on('data', function(buffer) {
                      var lines = buffer.toString().split(/\r?\n/)
                        , imageData = _.extend({
                                          name: lines.shift()
                                        },
                                        _.chain(lines)
                                         .map(function(x) { return x.split('='); })
                                         .object()
                                         .value());
                      if (_.isUndefined(imageData.imagerevision_id)) {
                        self.emit('error', 'Could not extract imageRevision from currentimage.txt on ' + row.hostname);
                      } else if (row.imagerevisionid != imageData.imagerevision_id) {
                        self.emit('incorrectRevision', row.hostname);
                        self.emit('info', row.hostname + ' (incorrectRevision)');
                      } else {
                        self.emit(row.state, row.hostname);
                        self.emit('info', 'checked ' + row.hostname + ' (' + row.state + ')');
                      }
                    });
                    stream.on('close', function() {
                      sshConnection.end();
                    });
                  }
                });
              });
              if (row.state === 'available') {
                if (row.image === 'noimage') {
                  self.emit('info', 'skipped ' + row.hostname + ' (' + row.image + ')');
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
              }
            });
          }
          connection.end();
        });
      }
    });
  });
}; // Health.check()

module.exports = Health;
