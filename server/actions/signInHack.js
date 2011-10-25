
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
    redis.get('browserid-assertion-' + assertionData.email, function (err, value) {
      var id, name;

      if (value && (value = value.toString())) {
        redis.hgetall(value, function (err, userData) {
          if (userData) {
            sendSignInComplete(data, client, userData);
          }
          // better not hit the else for this if.
        });
      } else {

        id = assertionData.email;
        name = assertionData.displayName;
        pic = 'http://www.gravatar.com/avatar/' +
              md5.hex_md5(id.trim().toLowerCase());

        // Store the user data for next request.
        redis.set('browserid-assertion-' + assertionData.email, id);

        //Add the user ID to the list of users.
        redis.sadd('users', id);

        //Add the user to the store
        redis.hmset(id, 'id', id, 'name', name, 'pic', pic);

        sendSignInComplete(data, client, {
          id: id,
          name: name,
          pic: pic
        });
      }
    });
  };
});