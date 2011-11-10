/*jslint strict: false, indent: 2 */
/*global define, PhoneGap */

define(['./phonegap'], function () {
  var PhoneNumber = function () {};

  PhoneNumber.prototype.fetch = function (successCallback, failureCallback) {
    return PhoneGap.exec(successCallback, failureCallback, 'PhoneNumber', '', []);
  };

  PhoneGap.addConstructor(function () {
    //Register the javascript plugin with PhoneGap
    PhoneGap.addPlugin('phoneNumber', new PhoneNumber());
  });

});
