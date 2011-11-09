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

      wwwRoot = './phonegap/www',
      builtWwwRoot = wwwRoot + '/../www-built',
      serverUrl = require('./server/serverUrl'),
      socketServerUrl = require('./server/socketServerUrl'),

      penv = process.env,
      protocol = penv.SUBMARINEPROTOCOL || 'http',
      isHttps = protocol === 'https',
      port = penv.SUBMARINEPORT || penv.PORT,

      app;

  // Use built www if it is available.
  if (path.existsSync(builtWwwRoot)) {
    wwwRoot = builtWwwRoot;
  }

  if (isHttps) {
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
    contents = contents.replace(/var remoteSocketServerUrl = '[^']*'/,
                                "var remoteSocketServerUrl = '" + socketServerUrl + "'");
    res.send(contents);
  }

  app.get('/', handleIndex);
  app.get('/index.html', handleIndex);

  // Set up static file serving.
  app.configure(function () {
    app.use(express['static'](wwwRoot));
  });

  app.listen(port);

  console.log('Listening on ' + serverUrl);
});
