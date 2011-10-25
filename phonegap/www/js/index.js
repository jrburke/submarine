
/*jslint strict: false, indent: 2 */
/*global define: false, location: true, navigator: false, console: false,
  google: false, window: false, alert: false, requirejs: false,
  setInterval: false */

//Do not even bother if location is not supported.
if (!navigator.geolocation) {
  location = 'requirements.html';
}

var remoteServerUrl = 'http://10.0.1.9:8176/';

requirejs.config({
  paths: {
    'socket.io': remoteServerUrl + 'socket.io/socket.io',
    'browserId': 'https://browserid.org/include'
  }
});

define(function (require) {

  //These dependencies do not return usable values, just used to
  //trigger loading.
  require('env!env/phonegapAll');
  require('browserId');

  //This function will not be called until the DOM is ready, because of the
  //domReady! plugin.
  var doc = require('domReady!'),

      //This function will also not be called until the device is ready.
      device = require('deviceReady!'),

      $ = require('jquery'),
      modaTransport = require('modaTransport'),
      moda = require('moda'),
      cards = require('cards'),
      friendly = require('friendly'),
      maps = require('http://maps.googleapis.com/maps/api/js?sensor=true&callback=define'),

      browserId = navigator.id,
      timestampDom = $('#timestamp'),
      errDom = $('#error'),
      domain = location.protocol + '//' + location.host +
               (location.port ? ':' + location.port : '') + '/',

      markerBaseUrl = 'http://www.tagneto.org/temp/bug',
      lastHeading = -1000,
      lastDirection,
      //How much spread in the heading to ignore for changes.
      spread = 5,

      masterMap, masterMarker, watchId, update, init, nodelessActions, notifyDom;

  //The maps API is not AMD aware, get a handle from the global name
  maps = google.maps;



  // Set up card update actions.
  update = {
    'signIn': function (data, dom) {

      // Create an explicit click handler to help some iphone devices,
      // event bubbling does not allow the window to open.
      dom.find('.browserSignIn')
        .click(function (evt) {
          evt.preventDefault();
          evt.stopPropagation();
          browserId.getVerifiedEmail(function (assertion) {
            if (assertion) {
              moda.signIn(assertion);
            } else {
              // Do not do anything. User stays on sign in screen.
            }
          });
        });
    },

    'start': function (data, dom) {
      // Use user ID as the title
      dom[0].title = moda.me().id;

    },

    'shareLocation': function (data, dom) {
      var fields = ['displayName', 'phoneNumbers', 'emails', 'photos'];

      //Pop Contacts so user choose a contact.
      navigator.contacts.chooseContact(function (id) {
        alert('Chose ID: ' + id);
        navigator.contacts.find(fields, function (contacts) {
          var targetContact;

          contacts.some(function (contact) {
            if (contact.id === id) {
              targetContact = contact;
              return true;
            }
            return false;
          });

          if (targetContact) {
            alert('Got Contact: ' + JSON.stringify(targetContact, null, '  '));
          }
        }, function (err) {
          alert('Error: ' + err);
        });
      }, {});
    }
  };


  // Listen to events from moda
  moda.on({
    'unknownUser': function () {
      if (init) {
        init();
      }
    },
    'signedIn': function () {
      if (init) {
        init();
      } else {
        // Remove the sign in card
        $('[data-cardid="signIn"]', '#cardContainer').remove();

        // Show the start card
        cards.onNav('start', {});
      }
    },
    'signedOut': function () {
      // User signed out/no longer valid.
      // Clear out all the cards and go back to start
      location.reload();
    }
  });

  moda.init();


  init = function () {

    // If user is not logged in, then set the start card to signin.
    if (!moda.me()) {
      cards.startCardId = 'signIn';
    }

    nodelessActions = {
      'notify': true,
      'shareLocation': true,
      'browserIdSignIn': true,
      'signOut': true
    };

    // Listen for nav items.
    cards.onNav = function (templateId, data) {
      var cardDom;

      if (nodelessActions[templateId]) {
        // A "back" action that could modify the data in a previous card.
        if (update[templateId]) {
          update[templateId](data);
        }
      } else {
        // A new action that will generate a new card.
        cardDom = $(cards.templates[templateId].cloneNode(true));

        if (update[templateId]) {
          update[templateId](data, cardDom);
        }

        cards.add(cardDom);

        if (templateId !== 'start' && templateId !== 'signIn') {
          cards.forward();
        }
      }
    };

    cards.onReady = function () {
      // Save a reference to the notify DOM
      notifyDom = $('#notify');
    };

    //Do event wiring here.
    $('body')
      .delegate('.signInForm', 'submit', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();

        var formNode = evt.target;

        moda.signInHack({
          displayName: formNode.displayName.value,
          email: formNode.email.value
        });
      });

    // Initialize the cards
    cards($('#cardContainer'));

    // Periodically update the timestamps shown in the page, every minute.
    setInterval(function () {
      $('[data-time]').each(function (i, node) {
        var dom = $(node),
            value = parseInt(dom.attr('data-time'), 10),
            text = friendly.date(new Date(value)).friendly;

        dom.text(text);
      });
    }, 60000);

    // Set init to null, to indicate init work has already been done.
    init = null;
  };






  function setMap(lat, lon) {
    if (!masterMap) {
      masterMap = new maps.Map(
        $('#map')[0],
        {
          zoom: 15,
          center: new google.maps.LatLng(lat, lon),
          mapTypeId: google.maps.MapTypeId.ROADMAP
        }
      );
    }
  }

  function updateMarker(lat, lon, title) {
    if (!masterMarker) {
      masterMarker = new maps.Marker({
        map: masterMap,
        flat: true,
        icon: new maps.MarkerImage(markerBaseUrl + 'N.png'),
        position: new maps.LatLng(lat, lon),
        title: (title || '')
      });
    } else {
      masterMarker.setPosition(new maps.LatLng(lat, lon));
      if (title) {
        masterMarker.setTitle(title);
      }
    }
  }

  function onPosition(position) {
    //console.log('onPostion: ', position);

    var coords = position.coords,
        lat = coords.latitude,
        lon = coords.longitude,
        timeTitle = (new Date()).toString();

    setMap(lat, lon);
    updateMarker(lat, lon, timeTitle);
    timestampDom.html(timeTitle);

    errDom.html('');
  }

  function onPositionError(error) {
    console.error('Position Error: ', error);

    errDom.html(JSON.stringify(error, null, '  '));
  }

/*
  //See https://developer.mozilla.org/en/Using_geolocation for more info
  watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
    enableHighAccuracy: true,
    maximumAge: 30000,
    timeout: 27000
  });
*/

  //Listen for compass/orientation
  window.addEventListener('deviceorientation', function (evt) {
    //Do not bother until we have a marker.
    if (!masterMarker) {
      return;
    }

    //window.orientation used to correct for landscape mode
    var newHeading = evt.webkitCompassHeading + window.orientation,
        newDirection;
    if (newHeading !== lastHeading && Math.abs(newHeading - lastHeading) > spread) {
      if (newHeading <= 45 || newHeading >= 315) {
        newDirection = 'N';
      } else if (newHeading > 45 && newHeading < 135) {
        newDirection = 'E';
      } else if (newHeading >= 135 && newHeading <= 225) {
        newDirection = 'S';
      } else {
        newDirection = 'W';
      }
      lastHeading = newHeading;

      if (newDirection !== lastDirection) {
        //Update the marker's icon.
        masterMarker.setIcon(markerBaseUrl + newDirection + '.png');

        lastDirection = newDirection;
      }
    }

  }, false);

/*
  $('body')
    .delegate('#sendSms', 'click', function (evt) {
      window.plugins.smsComposer.showSMSComposer('5551112222', 'hello world');
    })
    .delegate('#takePicture', 'click', function (evt) {
      evt.preventDefault();

      function onSuccess(imgData) {
        var imgNode = doc.createElement('img');
        imgNode.src = imgData;
        $('#imgPreview').empty().append(imgNode);
      }

      function onError(err) {
        alert(err);
      }

      navigator.camera.getPicture(onSuccess, onError, {
        quality : 40,
        allowEdit : true,
        targetWidth: 300,
        targetHeight: 300
      });

    });
*/

});
