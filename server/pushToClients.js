/*jslint strict: false, indent: 2 */
/*global define: false, console: false */

define(function (require) {
  // Just use one client instance for all actions.
  var clients = require('./clients');

  return function pushToClients(targetId, message) {
    var list = clients[targetId];
    if (list) {
      list.forEach(function (client) {
        client.emit('clientMessage', message);
      });
    }
  };

});
