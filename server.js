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

  var nodeStatic = require('node-static'),
      http = require('http'),
      https = require('https'),
      fs = require('fs'),
      url = require('url'),
      path = require('path'),
      io = require('socket.io'),
      querystring = require('querystring'),

      wwwRoot = './phonegap/www',
      staticServer = new nodeStatic.Server(wwwRoot),
      clients = require('./server/clients'),
      serverUrl = require('./server/serverUrl'),

      penv = process.env,
      protocol = penv.SUBMARINEPROTOCOL || 'http',
      isHttps = protocol === 'https',
      port = penv.SUBMARINEPORT || penv.PORT,

      server, listener, socketIoOptions;

  socketIoOptions = {
    transports: ['websocket', 'xhr-polling', 'jsonp-polling', 'htmlfile']
  };

  function listenToRequest(request, response) {
    //Assuming data is a utf8 string. This will be a problem later,
    //with image uploads.
    var data = '';

    request.on('data', function (streamData) {
      data += streamData;
    });

    request.on('end', function () {
      var location = url.parse(request.url, true),
          contentType = request.headers['Content-Type'] || '',
          contents, optimizedIndex;

      if (location.pathname.indexOf('/api/') === 0) {

        if (data) {
          if (contentType.indexOf('application/json') === 0) {
            data = JSON.parse(data);
          } else {
            // Assume application/x-www-form-urlencoded
            data = querystring.parse(data);
          }
        } else {
          // Data is just the location.query for gets and related methods.
          data = location.query;
        }

        // Do the API thing.
        require(['./server/actions' + location.pathname], function (action) {
          action(data, function (responseData) {
            // All responses should be JSON friendly data.
            var contents = JSON.stringify(responseData, null, '  ');
            response.writeHead(200, {
              'Content-Type': 'text/plain',
              'Content-Length': contents.length
            });
            response.write(contents, 'utf8');
            response.end();
          }, require, response);
        });

      } else if (location.pathname === '/' ||
                 location.pathname === '/index.html') {
        // Read in index.html and replace remoteServerUrl with real URL
        contents = fs.readFileSync(wwwRoot + '/index.html', 'utf8');
        contents = contents.replace(/var remoteServerUrl = '[^']*'/,
                                    "var remoteServerUrl = '" + serverUrl + "'");
        response.writeHead(200, {
          'Content-Type': 'text/html;charset=UTF-8',
          'Content-Length': contents.length
        });
        response.write(contents, 'utf8');
        response.end();

      } else if (location.pathname === '/js/index.js') {
        // Serve the optimized contents if available.
        optimizedIndex = wwwRoot + '/../www-built/js/index.js';
        if (path.existsSync(optimizedIndex)) {
          contents = fs.readFileSync(optimizedIndex, 'utf8');
          response.writeHead(200, {
            'Content-Type': 'text/javascript;charset=UTF-8',
            'Content-Length': contents.length
          });
          response.write(contents, 'utf8');
          response.end();
        } else {
          staticServer.serve(request, response);
        }
      } else {
        staticServer.serve(request, response);
      }
    });
  }

  if (isHttps) {
    socketIoOptions.secure = true;

    server = https.createServer({
      key: fs.readFileSync(penv.SUBMARINEKEY),
      cert: fs.readFileSync(penv.SUBMARINECERT),
      requestCert: true,
      ca: [
        fs.readFileSync(penv.SUBMARINECA)
      ]
    }, listenToRequest);
  } else {
    server = http.createServer(listenToRequest);
  }

  server.listen(port);

  console.log('Listening on ' + protocol + '://127.0.0.1:' + port);

  listener = io.listen(server, socketIoOptions);

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
