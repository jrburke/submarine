
/*jslint strict: false, indent: 2 */
/*global define: false, location: true, navigator: false, console: false,
  google: false, window: false */

//Do not even bother if location is not supported.
if (!navigator.geolocation) {
  location = 'requirements.html';
}

define(function (require) {
  //This function will not be called until the DOM is ready, because of the
  //domReady! plugin.
  var doc = require('domReady!'),
      $ = require('jquery'),
      maps = require('http://maps.googleapis.com/maps/api/js?sensor=true&callback=define'),

      timestampDom = $('#timestamp'),
      errDom = $('#error'),
      domain = location.protocol + '//' + location.host +
               (location.port ? ':' + location.port : '') + '/',

      markerBaseUrl = 'http://www.tagneto.org/temp/bug',
      lastHeading = -1000,
      lastDirection,
      //How much spread in the heading to ignore for changes.
      spread = 5,

      masterMap, masterMarker, watchId;

  //The maps API is not AMD aware, get a handle from the global name
  maps = google.maps;


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
    console.log('onPostion: ', position);

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

  //See https://developer.mozilla.org/en/Using_geolocation for more info
  watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
    enableHighAccuracy: true,
    maximumAge: 30000,
    timeout: 27000
  });


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

});
