/** @license
 * RequireJS plugin for async loading of Google Maps
 * Based on MIT async plugin by Miller Medeiros:
 * https://github.com/millermedeiros/requirejs-plugins
 * This plugin also MIT.
 */
/*jslint strict: false */
/*global location, define, document, window, google */

define(function () {
    var locationProtocol = typeof location !== 'undefined' && location.protocol,
        protocol, mapUrl;

    if (locationProtocol) {
        protocol = locationProtocol === 'https:' ? locationProtocol : 'http:';
        mapUrl = protocol + '//maps.googleapis.com/maps/api/js?callback=';
    }

    function injectScript(src) {
        var s, t;
        s = document.createElement('script');
        s.type = 'text/javascript';
        s.async = true;
        s.src = src;
        t = document.getElementsByTagName('script')[0];
        t.parentNode.insertBefore(s, t);
    }

    function formatUrl(name, id) {
        return mapUrl + id + (name ? '&' + name : '');
    }

    return {
        load : function (name, req, onLoad, config) {
            if (config.isBuild) {
                onLoad(); //avoid errors on the optimizer
            } else {
                var id = '__mm_asynch_req__' + (new Date()).getTime();
                //create a global variable that stores onLoad so callback function can define new module after async load
                window[id] = function () {
                    onLoad(google.maps);
                };
                injectScript(formatUrl(name, id));
            }
        }
    };
});
