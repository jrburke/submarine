/*jslint strict: false, indent: 2 */
/*global navigator, window, setTimeout */

// Create dummy shims for things used in mobile phones,
// so that the UI can be debugged in desktop browser.

if (!navigator.contacts) {
  navigator.contacts = {};
}

if (!navigator.contacts.chooseContact) {
  navigator.contacts.chooseContact = function (callback) {
    setTimeout(function () {
      callback(1);
    }, 10);
  };
}

if (!navigator.contacts.find) {
  navigator.contacts.find = function (fields, callback) {
    setTimeout(function () {
      callback([
        {
          displayName: 'John Doe',
          id: 1,
          phoneNumbers: [
            {
              type: 'mobile',
              value: '555-123-456'
            }
          ]
        }
      ]);
    }, 10);
  };
}

if (!navigator.sms) {
  navigator.sms = {};
}

if (!navigator.sms.send) {
  navigator.sms.send = function () {
    //no-op
  };
}

if (!window.plugins) {
  window.plugins = {};
}

if (!window.plugins.account) {
  window.plugins.account = {
    fetch: function (cb) {
      setTimeout(function () {
        cb({
          name: 'jane@example.com'
        });
      }, 10);
    }
  };
}