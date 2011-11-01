/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Raindrop.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc..
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * */

/*jslint indent: 2, regexp: false, plusplus: false */
/*global define: false, window: false, document: false,
  location: false, history: false, setTimeout: false */
'use strict';

define(function (require) {
  var $ = require('jquery'),
      url = require('blade/url'),
      array = require('blade/array'),
      headerTemplate = require('text!./cardsHeader.html'),
      cssText = require('text!./cardsStyle.css'),
      cardPosition = 0,
      cardList = [],
      footerList = [],
      cards, back, headerDom, bodyDom, footerDom, headerTextDom, docBodyDom,
      bodyWidth;

  function trimCardList() {
    // Remove any cards that are past the current position.
    if (cardPosition < cardList.length - 1) {
      cardList.splice(cardPosition + 1, cardList.length - cardPosition - 1);
      footerList.splice(cardPosition + 1, footerList.length - cardPosition - 1);
    }
  }

  function parseUrl(node) {
    node = node || location;
    var result = {},
        fragId, data, cardId;

    while (node && !node.href && !node.getAttribute('data-href')) {
      node = node.parentNode;
    }
    if (!node) {
      return result;
    }

    result.href = node.href || node.getAttribute('data-href');
    fragId = result.href.split('#')[1];

    if (fragId) {
      fragId = fragId.split('?');
      cardId = fragId[0];
      data = fragId[1] || '';

      // Convert the data into an object
      data = url.queryToObject(data);

      result.cardId = cardId;
      result.data = data;
    }

    return result;
  }

  function onNavClick(evt, skipPush) {
    var node = evt.target,
        nav = parseUrl(node);
    if (nav.cardId) {
      cards.onNav(nav.cardId, nav.data);

      if (!skipPush && nav.cardId !== 'back' &&
        (!node.getAttribute || !node.getAttribute('data-nonav'))) {
        history.pushState({}, cards.getTitle(), nav.href);
      }

      // Stop the event.
      evt.stopPropagation();
      evt.preventDefault();
    }
  }

  function adjustSizes() {
    bodyWidth = docBodyDom.outerWidth();
  }

  function updateHeaderFooter() {
    var currentFooterDom = footerList[cardPosition],
      topHeight, bottomHeight;

    cards.setTitle();

    // Hide/Show back button as appropriate
    back.css('visibility', !cardPosition ? 'hidden' : '');

    footerDom.empty();
    if (currentFooterDom) {
      footerDom.append(currentFooterDom);
    }

    // Measure height of header and footer and adjust margins on
    // card body appropriately.
    topHeight = headerDom.outerHeight();
    bottomHeight = footerDom.outerHeight();

    bodyDom.css({
      marginTop: topHeight + 'px',
      marginBottom: bottomHeight + 'px'
    });
  }

  cards = function (options) {
    cards.options = options || {};

    $(function () {
      var styleNode = document.createElement('style'),
          cardNodes, href;

      bodyDom = $('#cards');
      docBodyDom = $('body');
      bodyWidth = docBodyDom.outerWidth();

      // Insert style used for card
      styleNode.type = 'text/css';
      styleNode.textContent = cssText;
      $('head').append(styleNode);

      // insert the header before the cards
      headerDom = $(headerTemplate).insertBefore(bodyDom);
      headerTextDom = $('#headerText');

      back = $('#back');
      back.css('visibility', 'hidden');
      back.click(function (evt) {
        history.back();
      });

      // Append a node to use for the footer.
      footerDom = $('<div id="cardsFooter" style="position: fixed; bottom: 0; left: 0; width: 100%;"></div>').insertAfter(bodyDom);

      // grab the cards for use later
      cardNodes = array.to(bodyDom.find('[data-cardid]'));

      // store the cards by data-cardid value, and take them out of
      // the DOM and only add them as needed
      cardNodes.forEach(function (node) {
        var id = node.getAttribute('data-cardid');
        if (cards.templates[id]) {
          throw new Error('Duplicate card data-cardid: ' + id);
        } else {
          cards.templates[id] = node;
        }

        node.parentNode.removeChild(node);
      });

      // detect orientation changes and size the card container
      // size accordingly
      if ('onorientationchange' in window) {
        window.addEventListener('orientationchange', adjustSizes, false);
      }
      window.addEventListener('resize', adjustSizes, false);

      // Listen for clicks. Using clicks instead of hashchange since
      // pushState API does not trigger hashchange events.
      // Only listen for clicks that are on a tags and for # URLs, whose
      // format matches #cardId?name=value&name=value
      $('body').delegate('a, button[data-href]', 'click', onNavClick);

      // Listen for popstate to do the back navigation.
      window.addEventListener('popstate', function (evt) {

        var nav = parseUrl(),
            cardId = nav.cardId || cardList[0].attr('data-cardid'),
            i, index, cardDom;

        // find the card in the history that matches the current URL
        for (i = cardList.length - 1; i > -1 && (cardDom = cardList[i]); i--) {
          if (cardDom.attr('data-cardid') === cardId) {
            index = i;
            break;
          }
        }

        if (!index) {
          index = cardPosition - 1;
        }

        cards.moveTo(index);

        // Remove the panels after the index.
        // TODO: do this in a less hacky way, listen for transitionend for
        // example, if that now works in everywhere we want, and we are
        // using CSS3 transitions.
        setTimeout(function () {
          trimCardList();
        }, 300);
      }, false);

      // Set up initial state via simulation of a nav click
      href = location.href.split('#')[1];

      if (!href || cards.excludeStart(href)) {
        href = cards.startCardId;
      }

      cards.nav(href, null, true);

      cards.onReady();
    });
  };

  cards.startCardId = 'start';

  cards.nav = function (templateId, data, skipPushState) {
    onNavClick({
      target: {
        href: '#' + templateId + (data ? '?' + url.objectToQuery(data) : '')
      },
      stopPropagation: function () {},
      preventDefault: function () {}
    }, skipPushState);
  };

  cards.templates = {};

  cards.adjustSizes = adjustSizes;

  // Triggered when the cards are ready after initialization. Override
  // in app logic.
  cards.onReady = function () {};

  /**
   * Triggered on card navigation that goes forward. Back navigation is
   * handled automatically. Override in an app to provide navigation behavior.
   */
  cards.onNav = function (templateId, data) {
    throw new Error('Need to implement cards.onNav');
  };

  cards.remove = function (nodeOrDom) {
    var node = $(nodeOrDom)[0],
        i = 0,
        cardDom;

    for (i = 0; (cardDom = cardList[i]); i++) {
      if (cardDom[0] === node) {
        cardList.splice(i, 1);
        node.parentNode.removeChild(node);
        break;
      }
    }
  };

  /**
   * Adds a card node to the list, but does not show it. Call forward() or
   * show() to do that.
   */
  cards.add = function (nodeOrDom) {
    var dom = $(nodeOrDom),
        currentFooterDom = dom.find('.cardFooter'),
        footerPosition = cardList.push(dom) - 1;

    if (currentFooterDom.length) {
      currentFooterDom[0].parentNode.removeChild(currentFooterDom[0]);
      footerList[footerPosition] = $(currentFooterDom[0]);
    } else {
      footerList[footerPosition] = null;
    }
  };

  /**
   * Call when the first card should be displayed.
   * Assumes cards.add() was previously called to add a real card to show.
   */
  cards.show = function () {
    if (cardPosition) {
      throw new Error('cards.show called when there is more than one card to show.');
    }

    bodyDom.append(cardList[0]);
    updateHeaderFooter();
  };

  cards.back = function () {
    cardPosition -= 1;
    if (cardPosition < 0) {
      cardPosition = 0;
    }

    cards.scroll(cardPosition + 1);
  };

  cards.moveTo = function (index) {
    var oldPosition = cardPosition;
    cardPosition = index;
    if (cardPosition < 0) {
      cardPosition = 0;
    }
    cards.scroll(oldPosition);
  };

  cards.forward = function (title) {
    cardPosition += 1;
    cards.scroll(cardPosition - 1);
  };

  cards.scroll = function (oldPosition) {
    // Do not bother to scroll if positions are the same.
    if (oldPosition === cardPosition) {
      return;
    }

    var isForward = oldPosition < cardPosition,
        direction = isForward ? 1 : -1,
        newDom = cardList[cardPosition],
        newNode = newDom[0],
        currentDom = cardList[oldPosition],
        currentNode = currentDom[0];

    newNode.style.position = 'absolute';
    newNode.style.left = (direction * bodyWidth) + 'px';
    newDom.addClass('cardsLeftAnimate');
    bodyDom[isForward ? 'append' : 'prepend'](newNode);

    // Need the DOM to update to the reality of a new DOM node with an
    // animation on it. Without this setTimeout, the newNode does not animate.
    setTimeout(function () {
      //Set up current card for movement.
      currentDom.addClass('transition');
      currentNode.style.left = 0;
      currentNode.style.position = 'absolute';
      currentDom.addClass('cardsLeftAnimate');

      //Now move the cards.
      currentNode.style.left = (-1 * direction * bodyWidth) + 'px';
      newNode.style.left = 0;

      //Set timeout at end of animation to remove the styles.
      //TODO: disable further scroll actions until this completes, or
      //maybe queue them.
      setTimeout(function () {
        currentNode.style.left = '';
        currentNode.style.position = '';
        currentDom.removeClass('cardsLeftAnimate');

        newNode.style.left = '';
        newNode.style.position = '';
        newDom.removeClass('cardsLeftAnimate');

        currentNode.parentNode.removeChild(currentNode);
      }, 250);
    }, 10);

    updateHeaderFooter();
  };

  cards.currentCard = function () {
    return cardList[cardPosition];
  };

  cards.getTitle = function () {
    return cardList[cardPosition].attr('title') || '';
  };

  cards.setTitle = function (title) {
    title = title || cardList[cardPosition].attr('title') || '';
    headerTextDom.html(title);
  };

  return cards;
});
