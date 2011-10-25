/*jslint strict: false, indent: 2, nomen: false */
/*global define: false, console: false */

define(function (require) {
  var clients = require('../clients');

  return function disconnect(data, client) {
    var id = client._deuxUserId,
        clientList = clients[id],
        index;

    if (!id) {
      //This client did not have a user ID associated with it, drop it.
      return;
    }

    index = clientList.indexOf(client);
    if (index === -1) {
      console.log('HUH? Disconnect called, but cannot find client.');
    } else {
      clientList.splice(index, 1);
    }

  };
});
