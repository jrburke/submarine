define(['./phonegap'], function () {
    var ContactView = function() {};

    ContactView.prototype.show = function(successCallback, failCallback) {

        function success(args) {
            successCallback(args);
        }

        function fail(args) {
            failCallback(args);
        }

            return PhoneGap.exec(function(args) {
                    success(args);
            }, function(args) {
                    fail(args);
            }, 'ContactView', '', []);
    };

    PhoneGap.addConstructor(function() {
            PhoneGap.addPlugin('contactView', new ContactView());
    });
});
