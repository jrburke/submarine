/*jslint strict: false, indent: 2 */
/*global define: false, console: false */

define(function (require) {
  // Just use one client instance for all actions.
  var redisClient = require('redis').createClient();

  redisClient.on('error', function (err) {
    console.log('Redis error: ' + err);
  });

  return redisClient;
});
