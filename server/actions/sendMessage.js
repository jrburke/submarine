/*jslint strict: false, indent: 2, nomen: false */
/*global define: false, console: false */

define(function (require) {
  var redis = require('../redis'),
      redisUtils = require('../redisUtils'),
      pushToClients = require('../pushToClients');

  return function sendMessage(data, client) {
    var messageData = data.message,
        convId = messageData.convId,
        message, responseMessage, stringifiedMessage;

    message = {
      convId: convId,
      from: messageData.from,
      text: messageData.text,
      time: (new Date()).getTime()
    };

    // Increment the message ID counter by one so we can get unique message
    // IDs.
    redis.incr(convId + '-messageCounter', function (err, id) {

      message.id = id;

      stringifiedMessage = JSON.stringify(message);

      responseMessage = JSON.stringify({
        action: 'message',
        message: message
      });

      // Add the message to the message list for the conversation.
      redis.sadd(convId + '-messages', stringifiedMessage);

      // Update the "last message from user" conversation summary for use
      // when showing the list of conversations from a user.
      redis.hmset(convId + '-' + message.from, 'message', stringifiedMessage);

      // Get all conversation participants to send the message.
      redis.smembers(convId + '-peeps', function (err, users) {
        users = redisUtils.multiBulkToStringArray(users);
        users.forEach(function (user) {
          // Update the unseen set for the user, as long as the user
          // is not the "from" person.
          if (user !== message.from) {
            redis.hexists(user + '-unseen', convId, function (err, exists) {
              if (!exists) {
                redis.hset(user + '-unseen', convId, stringifiedMessage);
              }
            });
          }

          // Push the message to any user clients
          pushToClients(user, responseMessage);
        });
      });
    });
  };
});
