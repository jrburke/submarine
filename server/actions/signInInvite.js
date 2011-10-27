
/*jslint strict: false, indent: 2, nomen: false */
/*global define: false, console: false */

define(function (require) {
  var redis = require('../redis'),
      clients = require('../clients'),
      clientSend = require('../clientSend'),
      createInvite = require('./createInvite');

  function signInInvite(data, client) {

    var invite = data.invite,
        parts = invite.split('/'),
        urlId = parts[0],
        targetId = parts[1],
        key = createInvite.prefix + urlId;

    redis.hmget(key, targetId, function (err, value) {
      if (value && (value = value.toString())) {
        var user = JSON.parse(value),
            id = user && user.id,
            clientList;

        // Tie the user ID to the client connection.
        if (id) {
          clientList = clients[id] || (clients[id] = []);
          client._deuxUserId = id;

          clientList.push(client);
        }

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
