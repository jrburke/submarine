
/*jslint strict: false, indent: 2, nomen: false */
/*global define: false, console: false */

define(function (require) {
  var redis = require('../redis'),
      clientSend = require('../clientSend'),
      serverUrl = require('../serverUrl'),
      getInvite = require('./getInvite');

  function signInInvite(data, client) {

    var invite = data.invite,
        parts = invite.split('/'),
        urlId = parts[0],
        targetId = parts[1],
        key = getInvite.prefix + urlId;

    redis.hmget(key, targetId, function (err, value) {
      if (value && (value = value.toString())) {
        var user = JSON.parse(value);

        clientSend(client, data, {
          action: 'signInComplete',
          user: user
        });
      } else {
        console.error('signInInvite: no value for ' + targetId + ' for key: ' + key);
      }
    });
  }

  return signInInvite;
});
