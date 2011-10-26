/*jslint strict: false, indent: 2, nomen: false */
/*global define: false, console: false */

define(function (require) {
  var redis = require('../redis'),
      redisUtils = require('../redisUtils'),
      clientSend = require('../clientSend');

  return function loadConversation(data, client) {
    var convId = data.convId;

    // Get the people involved
    redis.smembers(convId + '-peeps', function (err, peeps) {
      peeps = redisUtils.multiBulkToStringArray(peeps);

      // Now get messages in the conversation.
      redis.smembers(convId + '-messages', function (err, messages) {
        messages = redisUtils.multiBulkToJsonArray(messages);

        clientSend(client, data, {
          action: 'loadConversationResponse',
          details: {
            peepIds: peeps,
            messages: messages
          }
        });
      });
    });
  };

});

