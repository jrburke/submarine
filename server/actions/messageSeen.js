
/*jslint strict: false, indent: 2, nomen: false */
/*global define: false, console: false */

define(function (require) {
  var redis = require('../redis');

  return function messageSeen(data, client) {
    var convId = data.convId,
        messageId = data.messageId,
        userId = client._deuxUserId;

    // Update unseen hash for the user
    redis.hget(userId + '-unseen', convId, function (err, json) {
      var message = JSON.parse(json);

      if (message && messageId >= message.id) {
        redis.hdel(userId + '-unseen', convId);
      }
    });

    // Update the 'seen' metadata for the conversation.
    redis.hset(convId + 'seen', userId, messageId);
  };
});
