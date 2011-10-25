/**
 * @license mcdrop Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/mcdrop for details
 */

/*jslint strict: false, indent: 2, nomen: false */
/*global require: false, console: false, process: false */


var requirejs = require('requirejs');

requirejs({
  nodeRequire: require
});

requirejs(['require'], function (require) {

  var nodeStatic = require('node-static'),
      http = require('http'),
      url = require('url'),
      io = require('socket.io'),
      querystring = require('querystring'),

      staticServer = new nodeStatic.Server('./web'),
      clients = require('./server/clients'),
      server, listener;

  server = http.createServer(function (request, response) {
    //Assuming data is a utf8 string. This will be a problem later,
    //with image uploads.
    var data = '';

    request.on('data', function (streamData) {
      data += streamData;
    });

    request.on('end', function () {
      var location = url.parse(request.url, true),
          contentType = request.headers['Content-Type'] || '';

      if (location.pathname.indexOf('/api/') === 0) {

        if (data) {
          if (contentType.indexOf('application/json') === 0) {
            data = JSON.parse(data);
          } else {
            // Assume application/x-www-form-urlencoded
            data = querystring.parse(data);
          }
        } else {
          //Data is just the location.query for gets and related methods.
          data = location.query;
        }

        //do the API thing.
        require(['./server/actions' + location.pathname], function (action) {
          action(data, function (responseData) {
            //All responses should be JSON friendly data.
            var contents = JSON.stringify(responseData, null, '  ');
            response.writeHead(200, {
              'Content-Type': 'text/plain',
              'Content-Length': contents.length
            });
            response.write(contents, 'utf8');
            response.end();
          }, require, response);
        });
      } else {
        staticServer.serve(request, response);
      }
    });
  });
  server.listen(process.env.PORT || 8176);

  console.log('Listening on http://127.0.0.1:' + (process.env.PORT || 8176));

  listener = io.listen(server, {
    transports: ['websocket', 'xhr-polling', 'jsonp-polling', 'htmlfile']
  });

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
