module EventLogging {

  interface Logger {
    info: (string) => void;
    error: (string, Error) => void;
  }

  // An IE-compatible imitation of console#log and console#error
  class SafeConsoleLogger implements Logger {
    info = (message: String): void => {
      try {
        console.log(message);
      } catch (e) {
      }
    };
    error = (message: String, e: Error): void => {
      try {
        console.error(message, e);
      } catch (e) {
      }
    };
  }

  class EventLogger {

    logger: Logger;

    constructor(logger: Logger) {
      this.logger = logger;
    }

    // Bundle up all the data to be sent to EventLogging
    createCapsule(section_used: string, destination: string): string {
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

    // Safely construct an event, logs it, and applies the continuation k
    safeLogEvent(section_used: string, destination: string, k: () => void): void {
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
      } catch (e) {
        this.logger.error('Error logging event:', e);
        k();
      }
    }

  }

  class Hijacker {

    logger = new SafeConsoleLogger();
    eventLogger = new EventLogger(this.logger);

    constructor() {
      // Randomly choose whether to log events for this session
      var isSampled: boolean = window.location.hostname === 'www.wikipedia.org' ?
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
    hijackAnchor(a: HTMLAnchorElement, f: (n: string, k: () => void) => void): void {
      var href: string = a.href;
      a.href = 'javascript:;';
      a.onclick = () => f(href, () => window.location.assign(href));
    }

    /**
     * Modify a <form> element to:
     *
     * 1. Disable its normal submission
     * 2. Perform some asynchronous action, which may:
     * 3. Continue on with its normal submission
     */
    hijackForm(form: HTMLFormElement, f: (n: string, k: () => void) => void): void {
      form.onsubmit = () => {
        f(form.action, () => form.submit());
        return false;
      };
    }

    // Iterate over DOM elements, hijacking each <a> or <form>
    hijackAll(className: string, section_used: string): void {
      var xs = this.getElementsByClassName(className);
      for (var i = 0; i < xs.length; i++) {
        var f = (href, k) => {
          this.eventLogger.safeLogEvent(section_used, href, k);
        };
        if (/a/i.test(xs[i].tagName)) {
          this.hijackAnchor(<HTMLAnchorElement> xs[i], f);
        } else if (/form/i.test(xs[i].tagName)) {
          this.hijackForm(<HTMLFormElement> xs[i], f);
        }
      }
    }

    // An IE-compatible imitation of document#getElementsByClassName
    getElementsByClassName(className: string): Array<HTMLElement> {
      var xs: Array<HTMLElement> = [];
      var ys: NodeList = document.body.getElementsByTagName('*');
      for (var i = 0; i < ys.length; i++) {
        var y: HTMLElement = <HTMLElement> ys[i];
        if ((new RegExp(className)).test(y.className)) {
          xs.push(y);
        }
      }
      return xs;
    }

  }

  new Hijacker();

}
