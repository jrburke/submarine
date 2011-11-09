/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Raindrop Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/*jslint indent: 2, strict: false, nomen: false, plusplus: false */
/*global define: false, localStorage: false, window: false, location: false,
  console: false, document: false, remoteSocketServerUrl: false */

define(function (require, exports) {
  var env = { name: 'browser' },
      q = require('q'),
      io = require('socket.io'),
      transport = exports,
      meCallbacks = [],
      deferreds = {},
      localMeCheck = false,
      deferIdCounter = 0,
      waitingDeferreds = {},
      targetOrigin = typeof window !== 'undefined' && window.location ? window.location.protocol +
                     '//' + window.location.host : '',
      actions, socket, me, respond;

  // In browser, the require does not expose a module, but is instead off
  // window, but in addon, it is a real module.
  io = io || window.io;

  function send(obj) {
    socket.emit('serverMessage', JSON.stringify(obj));
  }

  function triggerSignOut() {
    delete localStorage.assertion;
    delete localStorage.assertionData;
    delete localStorage.me;
    delete localStorage.invite;
    respond(null, 'signedOut');
  }

  function userConnect() {
    if (localStorage.assertion) {
      transport.signIn(localStorage.assertion, function (user) {
        if (!user) {
          triggerSignOut();
        }
      });
    } else if (localStorage.assertionData) {
      transport.signInHack(JSON.parse(localStorage.assertionData), function (user) {
        if (!user) {
          triggerSignOut();
        }
      });
    } else if (localStorage.invite) {
      transport.signInInvite(localStorage.invite, function (user) {
        if (!user) {
          triggerSignOut();
        }
      });
    } else {
      respond(null, 'unknownUser');
    }
  }

  /**
   * Factory machinery to creating an API that just calls back to the
   * server. Uses a deferred to only do the call once, so subsequent
   * calls just get the same response. Rely on event notifications
   * to catch data changes (moda layer should do this)
   *
   * @param {String} action the name of the API
   *
   * @param {Array} argNames the name of the function args to map onto
   * the data object passed to the server.
   *
   * @param {String} [responseProp] optional name of the server's
   * response object property to use as the return data.
   */
  function makePassThroughApi(action, argNames, responseProp) {
    // add a response handler

    actions[action + 'Response'] = function (data) {
      deferreds[action].resolve(responseProp ? data[responseProp] : data);
    };

    // set up the public API method
    transport[action] = function () {
      var args = arguments,
          // The callback should be after the named args, so
          // grabbing the argNames.length should give us the callback location.
          callback = args[argNames.length],
          payload;

      if (!deferreds[action]) {
        deferreds[action] = q.defer();

        payload = {
          action: action
        };

        if (argNames) {
          argNames.forEach(function (name, i) {
            payload[name] = args[i];
          });
        }

        send(payload);
      }

      if (callback) {
        q.when(deferreds[action].promise, callback);
      }
    };
  }

  /**
   * Factory machinery to creating an API that just calls back to the
   * server. Uses a unique defer for each call.
   *
   * @param {String} action the name of the API
   *
   * @param {Array} argNames the name of the function args to map onto
   * the data object passed to the server.
   *
   * @param {String} [responseProp] optional name of the server's
   * response object property to use as the return data.
   */
  function makePerCallPassThroughApi(action, argNames, responseProp) {
    // add a response handler

    actions[action + 'Response'] = function (data) {
      var deferId = data._deferId,
          deferreds = waitingDeferreds[deferId];
      if (deferreds) {
        deferreds.resolve(responseProp ? data[responseProp] : data);
        delete waitingDeferreds[deferId];
      }
    };

    // set up the public API method
    transport[action] = function () {
      var args = arguments,
          // The callback should be after the named args, so
          // grabbing the argNames.length should give us the callback location.
          callback = args[argNames.length],
          payload,
          deferred = q.defer(),
          deferId = 'id' + (deferIdCounter++);

      waitingDeferreds[deferId] = deferred;

      payload = {
        action: action,
        _deferId: deferId
      };

      if (argNames) {
        argNames.forEach(function (name, i) {
          payload[name] = args[i];
        });
      }

      send(payload);

      if (callback) {
        q.when(deferred.promise, callback);
      }
    };
  }

  /**
   * Factory machinery to creating an API that just calls to the server
   * but does not expect a matched response, and instead will get the
   * response via an event notification.
   *
   * @param {String} action the name of the API
   *
   * @param {Array} argNames the name of the function args to map onto
   * the data object passed to the server.
   *
   * @param {String} [responseProp] optional name of the server's
   * response object property to use as the return data.
   */
  function makeRequestOnlyApi(action, argNames) {
    // set up the public API method
    transport[action] = function () {
      var args = arguments,
          payload;

      payload = {
        action: action
      };

      if (argNames) {
        argNames.forEach(function (name, i) {
          payload[name] = args[i];
        });
      }

      send(payload);
    };
  }

  actions = {
    'signInComplete': function (data) {

      me = data.user;
      localStorage.me = JSON.stringify(me);

      var cbs = meCallbacks;
      meCallbacks = [];
      cbs.forEach(function (callback) {
        callback(me);
      });

      respond(null, 'signedIn', me);
    },

    'location': function (data) {
      respond(null, 'location', data.location);
    },

    'message': function (data) {
      respond(null, 'message', data.message);
    },

    'chatPermsAdd': function (data) {
      respond(null, 'chatPermsAdd', data.id);
    },

    'addedYou': function (data) {
      respond(null, 'addedYou', data);
    }
  };

  /**
   * Sets up the communication channel with the server. Must be called
   * from application code.
   * TODO: Figure out a .destroy() method for add-on case? When should
   * the server connection be shut down?
   */
  transport.init = function (url) {
    // Right now socket.io in the browser does not use define() so grab
    // the global.

    var foo = require.toUrl('socket.io');

    url = url || remoteSocketServerUrl;

    try {
      socket = io.connect(url, {
        rememberTransport: false,
        transports: ['websocket', 'xhr-polling', 'jsonp-polling', 'htmlfile'],
        secure: url.indexOf('https:') === 0
      });

      socket.on('clientMessage', function (data) {
        if (data) {
          data = JSON.parse(data);
        }

        if (actions[data.action]) {
          actions[data.action](data);
        } else {
          console.log('Unhandled socket message: ' + JSON.stringify(data));
        }
      });

      socket.on('connect', function () {
        respond(null, 'networkConnected');
        userConnect();
      });

      socket.on('disconnect', function () {
        respond(null, 'networkDisconnect');
      });

      socket.on('reconnect', function () {
        respond(null, 'networkReconnect');
        userConnect();
      });

      socket.on('reconnecting', function (nextRetry) {
        respond(null, 'networkReconnecting', {
          nextRetry: nextRetry
        });
      });

      socket.on('reconnect_failed', function () {
        respond(null, 'networkDisconnect');
      });
    } catch (e) {
      respond(null, 'ERROR', e.toString());
    }
  };

  /**
   * Destroys the transport connection to the server.
   */
  transport.destroy = function () {
    socket.disconnect();
    socket = null;
  };

  /**
   * Define the transport object
   */

  transport.me = function () {
    if (!me && !localMeCheck) {
      // Load user from storage
      me = localStorage.me;
      if (me) {
        me = JSON.parse(me);
      }
      localMeCheck = true;
    }
    return me;
  };

  /**
   * Sign in the user.
   */
  transport.signIn = function (assertion, callback) {

    localStorage.assertion = assertion;

    send({
      action: 'signIn',
      assertion: assertion,
      audience: location.host
    });

    if (callback) {
      meCallbacks.push(callback);
    }
  };

  /**
   * Sign in user, but just pretend, no verification, take
   * their word for it.
   */
  transport.signInHack = function (data, callback) {

    localStorage.assertionData = JSON.stringify(data);

    send({
      action: 'signInHack',
      assertionData: data
    });

    if (callback) {
      meCallbacks.push(callback);
    }
  };

  transport.signInInvite = function (invite, callback) {
    send({
      action: 'signInInvite',
      invite: invite
    });

    if (callback) {
      meCallbacks.push(callback);
    }
  };

  transport.signOut = function () {
    me = undefined;
    localMeCheck = false;

    triggerSignOut();
  };

  /**
   * Direct a client request to the correct transport call, and then
   * send back the response with the proper request ID.
   */
  function route(requestId, method, args) {
    //Push on a callback function
    args.push(function (result) {
      respond(requestId, method, result);
    });

    if (transport[method]) {
      transport[method].apply(transport, args);
    }
  }

  /**
   * Sets up listening and broadcasting of messaging APIs.
   * In the browser uses window.postMessage, in a jetpack,
   * uses either custom events (due to a bug) or jetpack-specific
   * postMessage APIs.
   */
  if (env.name === 'browser') {
    respond = function (requestId, method, data) {
      var response = {
        kind: 'modaResponse',
        requestId: requestId,
        method: method,
        response: data
      };

      window.postMessage(JSON.stringify(response), targetOrigin);
    };

    window.addEventListener('message', function (evt) {
      var data;
      // Pass data as JSON strings, so that it works in Firefox 5, later
      // firefoxen can use structured clone objects, but staying away
      // from that since it is still a bit new.
      if (evt.origin === targetOrigin && typeof evt.data === 'string' &&
          evt.data.indexOf('modaRequest') !== -1) {

        data = JSON.parse(evt.data);

        route(data.requestId, data.method, data.args);
      }
    }, false);
  } else if (env.name === 'addon') {
    // Define the request function as using custom messages, due to this
    // jetpack bug: https://bugzilla.mozilla.org/show_bug.cgi?id=666547,
    // convert to a postMessage API once it is fixed.
    respond = function (requestId, method, data) {
      var response = {
        kind: 'modaResponse',
        requestId: requestId,
        method: method,
        response: data
      }, event;

      event = document.createEvent("MessageEvent");
      event.initMessageEvent('moda-addon-message', false, false, JSON.stringify(response), '*', null,
                             null, null);
      window.dispatchEvent(event);
    };

    window.addEventListener('moda-content-message', function (evt) {
      var data = JSON.parse(evt.data);
      route(data.requestId, data.method, data.args);
    }, false);
  }

  makePerCallPassThroughApi('createInvite', ['details'], 'invite');

  makePerCallPassThroughApi('peeps', ['query'], 'items');
  makePerCallPassThroughApi('users', ['query'], 'items');
  makePerCallPassThroughApi('user', ['id'], 'user');
  makePerCallPassThroughApi('addPeep', ['peepId'], 'peep');
  makePerCallPassThroughApi('chatPerms', [], 'ids');

  makePerCallPassThroughApi('getInvite', ['inviteId'], 'invite');
  makePerCallPassThroughApi('loadConversation', ['convId'], 'details');
  makePerCallPassThroughApi('getPeepConversations', ['peepId'], 'conversations');

  makePerCallPassThroughApi('listUnseen', [], 'unseen');

  makeRequestOnlyApi('startConversation', ['args']);
  makeRequestOnlyApi('sendMessage', ['message']);
  makeRequestOnlyApi('updateLocation', ['location']);

  makeRequestOnlyApi('messageSeen', ['convId', 'messageId']);
  makeRequestOnlyApi('markBulkSeen', ['ids']);
});
