
/*jslint strict: false, indent: 2, nomen: false */
/*global define: false, console: false */

define(function (require) {
  var redis = require('../redis'),
      clientSend = require('../clientSend'),
      createInvite = require('./createInvite');

  return function getInvite(data, client) {

    var parts = data.inviteId.split('/'),
        urlId = parts[0],
        key = createInvite.prefix + urlId;

    redis.hgetall(key, function (err, invite) {
      var prop, user, inviteData;

      if (invite) {
        // Reformat the stored version so easier to use on client and
        // hide some implementation details/targetIds for other recipients.
        inviteData = {
          convId: invite.convId,
          inviter: JSON.parse(invite.inviter),
          invited: []
        };

        // Cycle through the invited people, and add them to the list.
        for (prop in invite) {
          if (invite.hasOwnProperty(prop) && !(prop in inviteData)) {
            user = JSON.parse(invite[prop]);
            inviteData.invited.push(user);
          }
        }

        clientSend(client, data, {
          action: 'getInviteResponse',
          invite: inviteData
        });
      } else {
        console.error('getInvite: no invite for key: ' + key);
      }
    });
  };
});
