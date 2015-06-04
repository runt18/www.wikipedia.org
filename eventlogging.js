var EventLogging;
(function (EventLogging) {
    // An IE-compatible imitation of console#log and console#error
    var SafeConsoleLogger = (function () {
        function SafeConsoleLogger() {
            this.info = function (message) {
                try {
                    console.log(message);
                }
                catch (e) {
                }
            };
            this.error = function (message, e) {
                try {
                    console.error(message, e);
                }
                catch (e) {
                }
            };
        }
        return SafeConsoleLogger;
    })();
    var EventLogger = (function () {
        function EventLogger(logger) {
            this.logger = logger;
        }
        // Bundle up all the data to be sent to EventLogging
        EventLogger.prototype.createCapsule = function (section_used, destination) {
            var capsule = []; // Poor-man's JSON, because IE
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
        ;
        // Safely construct an event, logs it, and applies the continuation k
        EventLogger.prototype.safeLogEvent = function (section_used, destination, k) {
            try {
                var capsule = this.createCapsule(section_used, destination);
                this.logger.info('Logging event: ' + capsule);
                var beacon = new Image();
                beacon.onload = k;
                // An 'error' event can also be triggered, since the browser considers an
                // empty response (HTTP 204) to be an invalid image.
                beacon.onerror = k;
                var encodedCapsule = encodeURIComponent(capsule);
                var beaconHost = window.location.hostname === 'www.wikipedia.org' ?
                    'bits.wikimedia.org' : 'localhost:8080';
                beacon.src = '//' + beaconHost + '/event.gif?' + encodedCapsule;
            }
            catch (e) {
                this.logger.error('Error logging event:', e);
                k();
            }
        };
        return EventLogger;
    })();
    var Hijacker = (function () {
        function Hijacker() {
            this.logger = new SafeConsoleLogger();
            this.eventLogger = new EventLogger(this.logger);
            // Randomly choose whether to log events for this session
            var isSampled = window.location.hostname === 'www.wikipedia.org' ?
                Math.floor(Math.random() * 100) === 0 : true;
            if (isSampled) {
                this.hijackAll('primary-link', 'primary links');
                this.hijackAll('search-form', 'search');
                this.hijackAll('language-search-form', 'language search');
                this.hijackAll('secondary-link', 'secondary links');
                this.hijackAll('other-language', 'other languages');
                this.hijackAll('other-project', 'other projects');
            }
        }
        /**
         * Modify an <a> element to:
         *
         * 1. Disable its normal href link
         * 2. Perform some asynchronous action, which may:
         * 3. Continue on to its normal href
         */
        Hijacker.prototype.hijackAnchor = function (a, f) {
            var href = a.href;
            a.href = 'javascript:;';
            a.onclick = function () { return f(href, function () { return window.location.assign(href); }); };
        };
        /**
         * Modify a <form> element to:
         *
         * 1. Disable its normal submission
         * 2. Perform some asynchronous action, which may:
         * 3. Continue on with its normal submission
         */
        Hijacker.prototype.hijackForm = function (form, f) {
            form.onsubmit = function () {
                f(form.action, function () { return form.submit(); });
                return false;
            };
        };
        // Iterate over DOM elements, hijacking each <a> or <form>
        Hijacker.prototype.hijackAll = function (className, section_used) {
            var _this = this;
            var xs = this.getElementsByClassName(className);
            for (var i = 0; i < xs.length; i++) {
                var f = function (href, k) {
                    _this.eventLogger.safeLogEvent(section_used, href, k);
                };
                if (/a/i.test(xs[i].tagName)) {
                    this.hijackAnchor(xs[i], f);
                }
                else if (/form/i.test(xs[i].tagName)) {
                    this.hijackForm(xs[i], f);
                }
            }
        };
        // An IE-compatible imitation of document#getElementsByClassName
        Hijacker.prototype.getElementsByClassName = function (className) {
            var xs = [];
            var ys = document.body.getElementsByTagName('*');
            for (var i = 0; i < ys.length; i++) {
                var y = ys[i];
                if ((new RegExp(className)).test(y.className)) {
                    xs.push(y);
                }
            }
            return xs;
        };
        return Hijacker;
    })();
    new Hijacker();
})(EventLogging || (EventLogging = {}));
