/*jslint strict: false, indent: 2, nomen: false */
/*global define: false, console: false */

define(function (require) {
  var redis = require('../redis'),
      clientSend = require('../clientSend');

  return function user(data, client) {
    var userId = data.id,
        multi;

    // Get the peep ID and return it.
    multi = redis
              .multi()
              .hgetall(userId)
              .exec(function (err, items) {
                clientSend(client, data, {
                  action: 'userResponse',
                  user: items[0],
                  _deferId: data._deferId
                });
              });
  };

});