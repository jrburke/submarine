
/*jslint strict: false, indent: 2, plusplus: false, regexp: false */
/*global define, navigator, console, google, window, alert, requirejs,
  setInterval, localStorage, setTimeout, remoteSocketServerUrl, Image,
  location: true */

//Do not even bother if location is not supported.
if (!navigator.geolocation) {
  location = 'requirements.html';
}

(function () {
  // If not on the start of the UI, redirect to top of the UI,
  // since the UI cannot build up the correct state for possible substates yet.
  var hash = location.href.split('#')[1],
      parts;
  if (hash) {
    //If an invite, hold on to it, and do not do a redirect.
    parts = hash.split('=');
    if (parts.length > 1 && parts[0] === 'invite') {
      localStorage.invite = decodeURIComponent(parts[1]);
    } else {
      location.replace(location.pathname);
    }
  }
}());


requirejs.config({
  paths: {
    'socket.io': remoteSocketServerUrl + 'socket.io/socket.io',
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
      md5 = require('md5'),
      maps = require('maps!sensor=true&libraries=geometry'),
      LatLng = maps.LatLng,
      spherical = maps.geometry.spherical,

      browserId = navigator.id,
      commonNodes = {},

      body = $('body'),
      markerBaseUrl = 'http://www.tagneto.org/temp/bug',
      lastHeading = -1000,
      lastDirection,
      //How much spread in the heading to ignore for changes.
      spread = 5,

      camera = navigator.camera,
      currentRotation = 0,
      canvasNode, ctx, img,

      masterMap, masterMarker, watchId, update, init, nodelessActions, notifyDom,
      currentConvId, messageCloneNode, smsContact,
      myLatLon;

  function getChildCloneNode(node) {
    var attr = node.getAttribute('data-childclass');
    return commonNodes[attr];
  }

  function updateDom(rootDom, model) {
    // Update the data bound nodes.
    rootDom.find('[data-bind]').each(function (i, node) {
      var bindName = node.getAttribute('data-bind'),
          attrName = node.getAttribute('data-attr'),
          value = model[bindName],
          parts;

      // Allow for dot names in the bindName
      if (bindName.indexOf('.') !== -1) {
        parts = bindName.split('.');
        value = model;
        parts.forEach(function (part) {
          value = value[part];
        });
      }

      if (attrName) {
        if (value !== undefined && value !== null) {
          node.setAttribute(attrName, value);
        }
      } else {
        $(node).text(value);
      }
    });
  }

  function insertTextAndMeta(nodeDom, message) {
    // Insert the friendly time in meta, and message text before meta
    var metaNode = nodeDom.find('.time').text(friendly.date(new Date(message.time)).friendly)[0];
    metaNode.setAttribute('data-time', message.time);

    nodeDom.find('.message').text(message.text);
  }

  function makeMessageBubble(node, message) {
    var nodeDom = $(node),
        senderNode, senderDom,
        isMe = moda.me().id === message.from.id;

    // do declarative text replacements.
    updateDom(nodeDom, message);

    // Insert the friendly time in meta, and message text before meta
    insertTextAndMeta(nodeDom, message);

    // Update the URL to use for the peep
    //senderDom = nodeDom.find('.sender');
    //senderNode = senderDom[0];
    //senderNode.href = senderNode.href + encodeURIComponent(message.from.id);

    // Apply different style if message is from "me"
    nodeDom.addClass(isMe ? 'right' : 'left');

    // If me, then swap the positions of the picture and name.
    //if (isMe) {
    //  senderDom.find('.name').prependTo(senderDom);
    //}

    return node;
  }

  function formToObject(formNode) {
    var obj = {}, node, value, i;

    for (i = 0; (node = formNode.elements[i]); i++) {
      value = (node.value || '').trim();
      if (node.name && value) {
        obj[node.name] = value;
      }
    }
    return obj;
  }

  function sendMessageToCurrentConv(message) {
    if (currentConvId) {
      // Add any other fields needed.
      if (!message.convId) {
        message.convId = currentConvId;
      }
      if (!message.from) {
        message.from = moda.me().id;
      }

      // Send the message
      moda.conversation({
        by: 'id',
        filter: currentConvId
      }).sendMessage(message);
    }
  }

  function sendLocationToCurrentConv(location) {

    if (currentConvId) {
      // Add any other fields needed.
      if (!location.convId) {
        location.convId = currentConvId;
      }
      if (!location.from) {
        location.from = moda.me().id;
      }

      // Send the message
      moda.conversation({
        by: 'id',
        filter: currentConvId
      }).updateLocation(location);
    }
  }

  function setMap(lat, lon) {
    var mapNode = $('#map')[0];

    if (mapNode && !masterMap) {
      masterMap = new maps.Map(
        mapNode,
        {
          zoom: 15,
          center: new google.maps.LatLng(lat, lon),
          mapTypeId: google.maps.MapTypeId.ROADMAP
        }
      );
    }
  }

  function updateMarker(lat, lon, title) {
    // Do not bother if there is no map.
    if (!masterMap) {
      return;
    }

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

    if (currentConvId) {
      setMap(lat, lon);
      updateMarker(lat, lon, timeTitle);

      myLatLon = {
        lat: lat,
        lon: lon
      };

      sendLocationToCurrentConv(myLatLon);
    }
  }

  function onPositionError(error) {
    console.error('Position Error: ', error);

    alert('Position Error: ' + JSON.stringify(error, null, '  '));
  }

  function trackPosition() {
    if (!watchId) {
      //See https://developer.mozilla.org/en/Using_geolocation for more info
      watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
        enableHighAccuracy: true,
        maximumAge: 30000
        //timeout: 27000
      });
    }
  }

  function endTrackPosition() {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = 0;
    }
  }

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

  function adjustCardScroll() {
    // Scroll to the bottom of the conversation
    setTimeout(function () {
      // If the message contents are longer than the containing element,
      // scroll down.
      if (window.innerHeight < body.outerHeight()) {
        body[0].scrollTop = body.outerHeight();
      }
    }, 100);
  }

  function getGravatar(email) {
    return 'http://www.gravatar.com/avatar/' +
              md5.hex_md5(email.trim().toLowerCase());
  }


  function updateImgPreview() {
    if (ctx) {
      var x = 0,
          y = 0,
          width = img.width,
          height = img.height;

      if (currentRotation > 359) {
        currentRotation -= 360;
      }

      if (currentRotation === 90) {
        y = -height;
        width = img.height;
        height = img.width;
      } else if (currentRotation === 180) {
        x = -width;
        y = -height;
      } else if (currentRotation === 270) {
        x = -width;
        width = img.height;
        height = img.width;
      }

      canvasNode.setAttribute('width', width);
      canvasNode.setAttribute('height', height);

      ctx.rotate(currentRotation * Math.PI / 180);
      ctx.drawImage(img, x, y);
    }
  }

  function loadImgPreview(url) {
    img = new Image();

    img.onload = function () {
      currentRotation = 0;
      updateImgPreview();
    };
    img.src = url;
  }

  // Set up card update actions.
  update = {
    'signOut': function (data, dom) {
      moda.signOut();
    },

    'signIn': function (data, dom) {

      //Grab the area to use as a preview.
      canvasNode = dom.find('.imgPreview')[0];
      ctx = canvasNode.getContext('2d');

      // Fill in the phone number for the user.
      window.plugins.account.fetch(function (account) {

        //The name is (always?) an email address
        dom.find('[name="email"]').val(account.name);

        var pic = getGravatar(account.name);

        console.log('pic: ' + pic);

        dom.find('[name="pic"]').val(pic);
        loadImgPreview(pic);
      });

      // Create an explicit click handler to help some iphone devices,
      // event bubbling does not allow the window to open.
      /*
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
      */
    },

    'start': function (data, dom) {
      // Use user ID as the title
      dom[0].title = moda.me().id;

      // Check the current location just so we get the user prompt over now.
      // Do not actually need the current position yet.
      navigator.geolocation.getCurrentPosition(function (position) {});
    },

    'inviteStart': function (data, dom) {

      // Fetch the convId
      moda.getInvite(localStorage.invite, function (invite) {
        // Show who invited the person.
        updateDom(dom.find('.inviter'), invite.inviter);

        // Update the link to start the conversation.
        var linkNode = dom.find('.conversationLink')[0],
            href = linkNode.getAttribute('data-href');

        linkNode.setAttribute('data-href', href + invite.convId);

        // Clean up localstorage
        delete localStorage.invite;
      });


      // Start tracking location. User can refuse if they prefer.
      trackPosition();

    },

    'shareLocation': function (data, dom) {
      var fields = ['displayName', 'phoneNumbers', 'emails', 'photos'];

      //Pop Contacts so user choose a contact.
      navigator.contacts.chooseContact(function (id) {
        // Have a contact ID, find the full contact info.
        navigator.contacts.find(fields, function (contacts) {
          var targetContact, nums, mobileNum, shareInfoDom;

          contacts.some(function (contact) {
            if (contact.id === id) {
              targetContact = contact;
              return true;
            }
            return false;
          });

          if (targetContact && targetContact.phoneNumbers && targetContact.phoneNumbers.length) {
            nums = targetContact.phoneNumbers;
            nums.some(function (num) {
              if (num.type === 'mobile') {
                mobileNum = num;
                return true;
              } else {
                return false;
              }
            });

            if (!mobileNum) {
              mobileNum = nums[0];
            }

            smsContact = {
              id: mobileNum.value,
              displayName: targetContact.displayName,
              pic: targetContact.photos && targetContact.photos[0] &&
                    targetContact.photos[0].value || null,
              phoneNumber: mobileNum.value
            };

            // Update UI to show the person's selection.
            shareInfoDom = $('[data-cardid="start"] .shareInfo').removeClass('hidden');
            updateDom(shareInfoDom, smsContact);
            $('[data-cardid="start"] .smsButton').removeClass('hidden');
          } else {
            alert('Please choose a contact with a phone number that\n' +
                  'can be used for SMS texts.');
          }
        }, function (err) {
          alert('Error: ' + err);
        });
      }, {});
    },

    'conversation': function (data, dom) {
      var convId = data.id,
          messagesNode = dom.find('.conversationMessages')[0],
          frag = doc.createDocumentFragment(),
          conversation;

      // Save the message clone node for later if
      // not already set.
      if (!messageCloneNode) {
        messageCloneNode = getChildCloneNode(messagesNode);
      }

      // Get a conversation object.
      conversation = moda.conversation({
        by: 'id',
        filter: convId
      });

      // Wait for messages before showing the messages.
      conversation.withMessages(function (conv) {

        currentConvId = conv.id;

        // Clear out old messages
        messagesNode.innerHTML = '';

        conversation.messages.forEach(function (message) {
          frag.appendChild(makeMessageBubble(messageCloneNode.cloneNode(true), message));
        });

        messagesNode.appendChild(frag);

        // Let the server know the messages have been seen
        conversation.setSeen();

        adjustCardScroll();
      });

      // Set up compose area
      dom
      .attr('data-conversationid', conversation.id)
      .find('[name="convId"]')
        .val(conversation.id)
        .end()
      .find('[name="from"]')
        .val(moda.me().id);
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
        cards.remove($('[data-cardid="signIn"]'));

        // Show the start card
        cards.onNav('start', {});
      }
    },
    'signedOut': function () {
      // User signed out/no longer valid.
      // Clear out all the cards and go back to start
      location.reload();
    },

    'message': function (message) {
      var card = cards.currentCard();

      if (card.attr('data-cardid') === 'conversation' &&
        card.attr('data-conversationid') === message.convId) {
        // Update the current conversation.
        card.find('.conversationMessages').append(makeMessageBubble(messageCloneNode.cloneNode(true), message));

        adjustCardScroll();

        // Let the server know the messages have been seen
        moda.conversation({
          by: 'id',
          filter: message.convId
        }).withMessages(function (conv) {
          conv.setSeen();
        });
      }
      // console.log("GOT A MESSAGE: ", message);
    },

    'location': function (location) {
      var card = cards.currentCard(),
          ll1, ll2, dist;

      if (card.attr('data-cardid') === 'conversation' &&
        card.attr('data-conversationid') === location.convId) {

        if (location.from.id === moda.me().id) {

        } else {
          // Compute the distance between the two points.
          if (myLatLon) {
            ll1 = new LatLng(myLatLon.lat, myLatLon.lon);
            ll2 = new LatLng(location.lat, location.lon);
            // Divide by 1000 to get kilometers.
            dist = maps.geometry.spherical.computeDistanceBetween(ll1, ll2) / 1000;

            // Nicely format the number.
            dist = (dist + '').replace(/(^\d*\.\d\d).*/, '$1');

            card.find('.location .dist').text(dist);
          }
        }

        //adjustCardScroll();
      }
    }
  });

  // Hold on to common nodes for use later.
  $('#common').children().each(function (i, node) {
    commonNodes[node.getAttribute('data-classimpl')] = node;
    node.parentNode.removeChild(node);
  });

  // Now insert commonly used nodes in any declarative cases.
  $('[data-class]').each(function (i, origNode) {
    var classImpl = origNode.getAttribute('data-class'),
        node = commonNodes[classImpl].cloneNode(true);

    origNode.parentNode.replaceChild(node, origNode);
  });

  moda.init();

  init = function () {
    var startIds;

    // If user is not logged in, then set the start card to signin.
    if (!moda.me()) {
      cards.startCardId = 'signIn';
    } else if (localStorage.invite) {
      cards.startCardId = 'inviteStart';
    }

    nodelessActions = {
      'notify': true,
      'shareLocation': true,
      'browserIdSignIn': true,
      'signOut': true
    };

    startIds = {
      start: true,
      signIn: true,
      inviteStart: true
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

        if (!startIds[templateId]) {
          cards.forward();
        } else {
          cards.show();
        }
      }
    };

    // Exclude some URLs from being the start URL.
    cards.excludeStart = function (fragId) {
      return fragId.indexOf('invite=') === 0;
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

        var formNode = evt.target,
            displayName = formNode.displayName.value.trim(),
            email = formNode.email.value.trim(),
            pic = formNode.pic.value.trim();

        if (!displayName || !email) {
          return;
        }

        if (!pic) {
          pic = getGravatar(email);
        }

        moda.signInHack({
          displayName: displayName,
          email: email,
          pic: pic
        });
      })
      .delegate('.signInForm .pictureRotate', 'click', function (evt) {
        //Rotate by 90 degrees
        currentRotation += 90;
        updateImgPreview();
      })
      // Handle click to get picture
      .delegate('.signInForm .pictureCapture', 'click', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();

        var formNode = evt.target.parentNode;

        camera.getPicture(function (base64Data) {
          loadImgPreview('data:image/jpeg;base64,' + base64Data);
        }, function (err) {

        }, {
          quality: 75,
          targetWidth: 100,
          targetHeight: 100,
          MediaType: camera.MediaType.PICTURE
        });
      })
      // Handle clicking on the SMS button.
      .delegate('.smsButton', 'click', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();

        // Ask server for a URL for the SMS.
        moda.createInvite(smsContact, function (invite) {
          // Generate SMS message.
          var url = invite.server + '#invite=' + encodeURIComponent(invite.inviteId);

          // Set the current convId to be used to send notifications.
          currentConvId = invite.convId;

          // Start tracking the position.
          trackPosition();

          // Trigger the transition to the conversation.
          cards.nav('conversation?id=' + invite.convId);

          // Trigger the SMS sending. Do it in a timeout so we can finish
          // current execution loop.
          setTimeout(function () {
            navigator.sms.send(smsContact.phoneNumber, 'Find me with submarine: ' + url);
          }, 30);
        });
      })
      // Handle compose inside a conversation
      .delegate('.cardFooter .compose', 'submit', function (evt) {
        evt.preventDefault();

        var form = evt.target,
            data = formToObject(form);

        // Reset the form
        form.text.value = '';
        form.text.focus();

        // Send the message
        moda.conversation({
          by: 'id',
          filter: data.convId
        }).sendMessage(data);

      });

    // Initialize the cards
    cards();

    // Now that cards are initialized, can show the body.
    body.removeClass('invisible');

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
