/**
 * Code taken from domReady plugin but modified to deal just with deviceready
 * from phonegap.
 */
/*jslint strict: false, plusplus: false */
/*global define: false, window: false */

define(function (require) {
    //Dependencies with no usable return value.
    require('env!env/phonegap');

    var env = (require('env'))(),
        isBrowser = typeof window !== "undefined" && window.document,
        //_nativeReady can be set by phonegap code, if the device is ready before
        //event listeners can be bound.
        isDeviceReady = !isBrowser || env === 'web' || typeof _nativeReady !== 'undefined',
        win = isBrowser ? window : {},
        doc = win.document,
        readyCalls = [];

    function runCallbacks(callbacks) {
        for (var i = 0, callback; (callback = callbacks[i]); i++) {
            callback(win.device);
        }
    }

    function callReady() {
        var callbacks = readyCalls;

        if (isDeviceReady) {
            //Call the DOM ready callbacks
            if (callbacks.length) {
                readyCalls = [];
                runCallbacks(callbacks);
            }
        }
    }

    /**
     * Sets the page as loaded.
     */
    function onDeviceReady() {
        if (!isDeviceReady) {
            isDeviceReady = true;
            callReady();
        }
    }

    if (isBrowser && doc.addEventListener) {
        //Standards. Hooray! Assumption here that if standards based,
        //it knows about DOMContentLoaded.
        doc.addEventListener("deviceready", onDeviceReady, false);
    }

    /** START OF PUBLIC API **/

    /**
     * Registers a callback for DOM ready. If DOM is already ready, the
     * callback is called immediately.
     * @param {Function} callback
     */
    function deviceReady(callback) {
        if (isDeviceReady) {
            callback(win.device);
        } else {
            readyCalls.push(callback);
        }
        return deviceReady;
    }

    deviceReady.version = '1.0.0';

    /**
     * Loader Plugin API method
     */
    deviceReady.load = function (name, req, onLoad, config) {
        if (config.isBuild) {
            onLoad(null);
        } else {
            deviceReady(onLoad);
        }
    };

    /** END OF PUBLIC API **/

    return deviceReady;
});
