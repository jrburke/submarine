
/*jslint strict: false, indent: 2, nomen: false */
/*global define: false, console: false */

define(function (require) {
  var redis = require('../redis'),
      md5 = require('../md5'),
      clients = require('../clients'),
      clientSend = require('../clientSend');

  function sendSignInComplete(data, client, user) {
    var id = user && user.id,
        clientList;

    if (id) {
      clientList = clients[id] || (clients[id] = []);
      client._deuxUserId = id;

      clientList.push(client);
    }

    clientSend(client, data, {
      action: 'signInComplete',
      user: user
    });
  }

  return function signInHack(data, client) {

    var assertionData = data.assertionData,
        pic;

    // First check if we have saved data for the assertion.
    redis.get('browserid-assertion-hack-' + assertionData.email, function (err, value) {
      var id, displayName;

      if (value && (value = value.toString())) {
        redis.hgetall(value, function (err, userData) {
          if (userData) {
            sendSignInComplete(data, client, userData);
          }
          // better not hit the else for this if.
        });
      } else {

        id = assertionData.email;
        displayName = assertionData.displayName;
        pic = 'http://www.gravatar.com/avatar/' +
              md5.hex_md5(id.trim().toLowerCase());

        // Store the user data for next request.
        redis.set('browserid-assertion-hack-' + assertionData.email, id);

        //Add the user to the store
        redis.hmset(id, 'id', id, 'displayName', displayName, 'pic', pic);

        sendSignInComplete(data, client, {
          id: id,
          displayName: displayName,
          pic: pic
        });
      }
    });
  };
});
