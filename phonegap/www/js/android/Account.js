/*jslint strict: false, indent: 2 */
/*global define, PhoneGap */

define(['./phonegap'], function () {
  var Account = function () {};

  Account.prototype.fetch = function (successCallback, failureCallback) {
    return PhoneGap.exec(successCallback, failureCallback, 'Account', '', []);
  };

  PhoneGap.addConstructor(function () {
    //Register the javascript plugin with PhoneGap
    PhoneGap.addPlugin('account', new Account());
  });

});
