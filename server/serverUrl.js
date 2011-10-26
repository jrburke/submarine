/*jslint strict: false, indent: 2 */
/*global define: false, console: false, process: false */

/**
 * Returns the protocol://host:port/ for this server.
 */
define(function (require) {
  // Just use one object by all to hold on to clients.
  return (process.env.SUBMARINEPROTOCOL || 'http') + '://' +
         (process.env.SUBMARINEHOST || '127.0.0.1') +
         (process.env.SUBMARINEPORT || process.env.PORT ? ':' +
         (process.env.SUBMARINEPORT || process.env.PORT) : '') +
         '/';
});
