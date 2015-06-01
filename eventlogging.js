'use strict';

(function () {

  var console = console || { // IE7
    log: function () { },
    error: function () { }
  };

  var getElementsByClassName = function(className) {
    var xs = [];
    if (document.getElementsByClassName) {
      xs = document.getElementsByClassName(className);
    } else if (document.body.getElementsByTagName) { // IE7
      var ys = document.body.getElementsByTagName('*');
      for (var i = 0; i < ys.length; i++) {
        if ((new RegExp(className)).test(ys[i].className)) {
          xs.push(ys[i]);
        }
      }
    }
    return xs;
  };

  // Bundle up all the data to be sent to EventLogging
  var createCapsule = function (section_used, destination) {
    var capsule = []; // Poor-man's JSON, because IE7
    capsule.push('"schema": "WikipediaPortal"');
    capsule.push('"revision": 12367957');
    capsule.push('"webHost": "' + window.location.hostname + '"');
    capsule.push('"wiki": "www"');

    var event = [];
    event.push('"section_used": "' + section_used + '"');
    if (document.referrer) {
      event.push('"referer": "' + document.referrer + '"'); // sic
    }
    if (destination) {
      event.push('"destination": "' + destination + '"');
    }
    var ccMatch = /GeoIP=(\w\w)/.exec(document.cookie);
    if (ccMatch) {
      event.push('"country": "' + ccMatch[1] + '"');
    }

    capsule.push('"event": {' + event.join(',') + '}');
    return '{' + capsule.join(',') + '}';
  };

  // Safely construct an event, logs it, and applies the continuation k
  var safeLogEvent = function (section_used, destination, k) {
    try {
      var capsule = createCapsule(section_used, destination);
      console.log('Logging event: ' + capsule);
      var beacon = new Image();

      beacon.onload = k;

      // An 'error' event can also be triggered, since the browser considers an
      // empty response (HTTP 204) to be an invalid image.
      beacon.onerror = k;

      var beaconHost = window._DEV ? 'localhost:8080' : 'bits.wikimedia.org';
      var encodedCapsule = encodeURIComponent(capsule);
      beacon.src = '//' + beaconHost + '/event.gif?' + encodedCapsule;
    } catch (e) {
      console.error('Error logging event:', e);
      k();
    }
  };

  /**
   * Modify an <a> element to:
   *
   * 1. Disable its normal href link
   * 2. Perform some asynchronous action, which may:
   * 3. Continue on to its normal href
   */
  var hijackAnchor = function (a, f) {
    var href = a.href;
    a.href = 'javascript:;';
    a.onclick = function () {
      f(href, function () {
        if (window._DEV) {
          console.log('[dev mode] skipping: window.location = ' + href + ';');
        }
        window.location = href;
      });
    };
  };

  /**
   * Modify a <form> element to:
   *
   * 1. Disable its normal submission
   * 2. Perform some asynchronous action, which may:
   * 3. Continue on with its normal submission
   */
  var hijackForm = function (form, f) {
    form.onsubmit = function () {
      f(form.action, function () {
        if (window._DEV) {
          console.log('[dev mode] skipping: form.submit();');
        }
        form.submit();
      });
      return false;
    };
  };

  // Randomly choose whether to log events for this session
  if (window._DEV || Math.floor(Math.random() * 1000) === 0) {

    // Iterate over DOM elements, hijacking each <a> or <form>
    var hijackAll = function (className, section_used) {
      var xs = getElementsByClassName(className);
      for (var i = 0; i < xs.length; i++) {
        var f = function (href, k) {
          safeLogEvent(section_used, href, k);
        };
        if (/a/i.test(xs[i].tagName)) {
          hijackAnchor(xs[i], f);
        } else if (/form/i.test(xs[i].tagName)) {
          hijackForm(xs[i], f);
        }
      }
    };

    hijackAll('primary-link', 'primary links');
    hijackAll('search-form', 'search');
    hijackAll('language-search-form', 'language search'); 
    hijackAll('secondary-link', 'secondary links');
    hijackAll('other-language', 'other languages');
    hijackAll('other-project', 'other projects');

  }

})();

