/*jslint strict: false, indent: 2 */
/*global define: false, console: false, process: false */

/**
 * Returns the protocol://host:port/ for this server.
 */
define(function (require) {
  var penv = process.env;
  // Just use one object by all to hold on to clients.
  return penv.SUBMARINESERVERURL || (penv.SUBMARINEPROTOCOL || 'http') + '://' +
         (penv.SUBMARINEHOST || '127.0.0.1') +
         (penv.SUBMARINEPORT || penv.PORT ? ':' +
         (penv.SUBMARINEPORT || penv.PORT) : '') +
         '/';
});
