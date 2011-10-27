/*jslint strict: false, indent: 2, nomen: false */
/*global define: false, console: false */

define(function (require) {
  var redis = require('../redis'),
      redisUtils = require('../redisUtils'),
      pushToClients = require('../pushToClients');

  return function updateLocation(data, client) {
    var locData = data.location,
        convId = locData.convId,
        location, responseMessage;

    location = {
      convId: convId,
      from: locData.from,
      lat: locData.lat,
      lon: locData.lon,
      time: (new Date()).getTime()
    };

    responseMessage = JSON.stringify({
      action: 'location',
      location: location
    });

    // Update the location of the user in this conversation.
    redis.set(convId + '-location-' + locData.from, JSON.stringify(location));

    // Get all conversation participants to send the location.
    redis.smembers(convId + '-peeps', function (err, users) {
      users = redisUtils.multiBulkToStringArray(users);
      users.forEach(function (user) {
        // Push the message to any user clients
        pushToClients(user, responseMessage);
      });
    });
  };
});
