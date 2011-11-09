/*jslint strict: false, indent: 2 */
/*global define: false, console: false, process: false */

/**
 * Returns the protocol://host:port/ for this server.
 */
define(function (require) {
  var penv = process.env;
  // Just use one object by all to hold on to clients.
  return (penv.SUBMARINESOCKETPROTOCOL || 'http') + '://' +
         (penv.SUBMARINESOCKETHOST || '127.0.0.1') +
         (penv.SUBMARINESOCKETPORT || penv.PORT ? ':' +
         (penv.SUBMARINESOCKETPORT || penv.PORT) : '') +
         '/';
});
