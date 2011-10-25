
/*jslint strict: false, indent: 2, nomen: false */
/*global define: false, console: false */

define(function (require) {
  var redis = require('../redis'),
      clients = require('../clients'),
      clientSend = require('../clientSend');

  return function getInviteUrl(data, client) {

    var details = data.details,
        pic;

    clientSend(client, data, {
      action: 'getInviteUrlResponse',
      url: 'http://www.google.com/'
    });
  };
});
