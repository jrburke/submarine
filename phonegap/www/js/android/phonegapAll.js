
/**
 * Top level file for loading up all the phonegap-related files and wiring
 * them together.
 */
define(['./phonegap', './SMSComposer', './ContactView'], function () {

  PhoneGap.addConstructor(function() {
    // Set up chooseContact so that it works like iOS.
    Contacts.prototype.chooseContact = function(successCallback, options) {
      window.plugins.contactView.show(function (contact) {
        successCallback(contact.id);
      });
    };
  });

});