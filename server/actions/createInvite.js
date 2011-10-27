
/*jslint strict: false, indent: 2, nomen: false */
/*global define: false, console: false */

define(function (require) {
  var redis = require('../redis'),
      clientSend = require('../clientSend'),
      serverUrl = require('../serverUrl'),
      prefix = 'inviteurl-';

  function generateId() {
    // TODO: Hack alert, using Math.random()
    return (Math.random() + '').replace(/^0\./, '');
  }

  function getInviteId(callback) {
    var candidate = generateId();

    redis.get(prefix + candidate, function (err, value) {
      if (value) {
        // Ask again
        getInviteId(callback);
      } else {
        callback(candidate);
      }
    });
  }

  /**
   * Create the right user records for a user who is known by phone number and
   * not email address.
   */
  function makePhoneUser(user, callback) {
    // First see if it already exists
    // user.id will be the phone number.
    redis.get('browserid-assertion-hack-' + user.id, function (err, value) {
      if (value && (value = value.toString())) {
        callback(user);
      } else {
        // Store the user data for next request.
        redis.set('browserid-assertion-hack-' + user.id, user.id);

        //Add the user to the store
        redis.hmset(user.id, 'id', user.id, 'displayName', user.displayName, 'phoneNumber', user.phoneNumber);
        if (user.pic) {
          redis.hmset(user.id, 'pic', user.pic);
        }
      }
    });
  }


  function createInvite(data, client) {

    var user = data.details,
        inviterId = client._deuxUserId,

        // Generate an ID for the target.
        targetId = generateId();

    // Normalize details for user.
    // Discard pic if it is a local URL.
    if (user.pic && user.pic.indexOf('http') !== 0) {
      delete user.pic;
    }

    // Get the inviter's info
    redis.hgetall(inviterId, function (err, inviter) {
      if (inviter) {
        // Now get an invite ID
        getInviteId(function (urlId) {
          var key = prefix + urlId,
              from = inviterId,
              to = user.id,
              users = [from].concat(to),
              time = (new Date()).getTime(),
              convId = from + '|' + to + '|' + time;

          // Set info for the invite, who can use it.
          redis.hmset(key, 'inviter', JSON.stringify(inviter), 'convId', convId, targetId, JSON.stringify(user));

          // Make sure there is a user account for the phone number.
          makePhoneUser(user, function (toUser) {
            // Set up the conversation to receive chat/location updates.

            // Set up the message counter.
            redis.set(convId + '-messageCounter', '0', function (err, response) {

              users.forEach(function (user) {
                // Add the user to the peep list for the conversation.
                redis.sadd(convId + '-peeps', user);

                // Update the set of conversations a user is involved in,
                // but scope it per user
                users.forEach(function (other) {
                  redis.sadd(user + '-' + other, convId);
                });

                clientSend(client, data, {
                  action: 'createInviteResponse',
                  invite: {
                    convId: convId,
                    server: serverUrl,
                    inviteId: urlId + '/' + targetId
                  }
                });
              });
            });
          });
        });

      } else {
        console.error('createInvite: no inviter for ID: ' + inviterId);
      }
    });
  }

  createInvite.prefix = prefix;

  return createInvite;
});
