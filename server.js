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
      path = require('path'),
      io = require('socket.io'),

      wwwRoot = './phonegap/www',
      builtWwwRoot = wwwRoot + '/../www-built',
      clients = require('./server/clients'),
      serverUrl = require('./server/serverUrl'),

      penv = process.env,
      protocol = penv.SUBMARINEPROTOCOL || 'http',
      isHttps = protocol === 'https',
      port = penv.SUBMARINEPORT || penv.PORT,

      app, listener, socketIoOptions;

  socketIoOptions = {
    // Figure out a good interaction with web sockets and https
    // for now just use jsonp.
    transports: ['jsonp-polling'] //['websocket', 'xhr-polling', 'jsonp-polling', 'htmlfile']
  };

  // Use built www if it is available.
  if (path.existsSync(builtWwwRoot)) {
    wwwRoot = builtWwwRoot;
  }

  if (isHttps) {
    socketIoOptions.secure = true;

    app = express.createServer({
      key: fs.readFileSync(penv.SUBMARINEKEY),
      cert: fs.readFileSync(penv.SUBMARINECERT),
      requestCert: true,
      ca: [
        fs.readFileSync(penv.SUBMARINECA)
      ]
    });
  } else {
    app = express.createServer();
  }

  function handleIndex(req, res) {
    // Read in index.html and replace remoteServerUrl with real URL
    var contents = fs.readFileSync(wwwRoot + '/index.html', 'utf8');
    contents = contents.replace(/var remoteServerUrl = '[^']*'/,
                                "var remoteServerUrl = '" + serverUrl + "'");
    res.send(contents);
  }

  app.get('/', handleIndex);
  app.get('/index.html', handleIndex);

  // Set up static file serving.
  app.configure(function () {
    app.use(express['static'](wwwRoot));
  });

  app.listen(port);

  console.log('Listening on ' + protocol + '://127.0.0.1:' + port);

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
