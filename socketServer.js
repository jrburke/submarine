/**
 * @license mcdrop Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/mcdrop for details
 */

/*jslint strict: false, indent: 2, nomen: false, regexp: false */
/*global require: false, console: false, process: false */


var requirejs = require('requirejs');

requirejs({
  nodeRequire: require
});

requirejs(['require'], function (require) {

  var express = require('express'),
      fs = require('fs'),
      io = require('socket.io'),

      clients = require('./server/clients'),
      socketServerUrl = require('./server/socketServerUrl'),

      penv = process.env,
      protocol = penv.SUBMARINESOCKETPROTOCOL || 'http',
      isHttps = protocol === 'https',
      port = penv.SUBMARINESOCKETPORT || penv.PORT,

      app, listener, socketIoOptions;

  socketIoOptions = {
    // Figure out a good interaction with web sockets and https
    // for now just use jsonp.
    transports: ['websocket', 'xhr-polling', 'jsonp-polling', 'htmlfile']
  };

  if (isHttps) {
    socketIoOptions.secure = true;

    app = express.createServer({
      key: fs.readFileSync(penv.SUBMARINESOCKETKEY),
      cert: fs.readFileSync(penv.SUBMARINESOCKETCERT),
      requestCert: true,
      ca: [
        fs.readFileSync(penv.SUBMARINESOCKETCA)
      ]
    });
  } else {
    app = express.createServer();
  }

  app.listen(port);

  console.log('Listening on ' + socketServerUrl);

  listener = io.listen(app, socketIoOptions);

  listener.sockets.on('connection', function (client) {
    //client.send({ buffer: buffer });
    //client.broadcast({ announcement: client.sessionId + ' connected' });

    client.on('serverMessage', function (message) {
      message = JSON.parse(message);

      require(['./server/actions/' + message.action], function (action) {
        action(message, client);
        //client.broadcast(msg);
      });
    });

    client.on('disconnect', function () {
      var id = client._deuxUserId,
          clientList = clients[id],
          index;

      if (!id || !clientList || !clientList.length) {
        //This client did not have a user ID associated with it, drop it.
        return;
      }

      index = clientList.indexOf(client);
      if (index === -1) {
        console.log('HUH? Disconnect called, but cannot find client.');
      } else {
        clientList.splice(index, 1);
      }
    });
  });
});
