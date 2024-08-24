/**
 * index.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

import SessionManager from './SessionManager';
import { Config } from './types';
import onHeaders from 'on-headers';
import _ from 'lodash';
import signature from 'cookie-signature';
import cookie from 'cookie';
import util from './util';

/**
 * Create a new NodeSession instance
 *
 * @param config - session configuration object
 * @constructor
 */
class NodeSession {

  private config: Config;

  private manager: SessionManager;

  constructor(config: Partial<Config> & { secret: string; }, encrypter?: any) {
    var defaults: Config = {
      driver: 'file',
      lifetime: 300000, // five minutes
      expireOnClose: false,
      files: process.cwd() + '/sessions',
      connection: false,
      table: 'sessions',
      lottery: [2, 100],
      cookie: 'node_session',
      path: '/',
      secure: false,
      httpOnly: true,
      encrypt: false,
      secret: 'override this value with a 32+ character random string',
      trustProxy: false,
    };
    this.config = { ...defaults, ...config };
    this.manager = new SessionManager(this.config, encrypter);

    if (!this.config.secret) {
      throw new Error('secret option required for sessions');
    }

    if (this.config.trustProxy && !this.config.trustProxyFn) {
      this.config.trustProxyFn = util.compileTrust(this.config.trustProxy);
    }
  }

  /**
   * Start session for a given http request - response
   *
   * @param {Object} request - http request object
   * @param {Object} response - http response object
   * @param {function} callback
   */
  startSession(request: Request, response: Response, callback: Function) {
    var self = this;
    var end = response.end;
    var ended = false;

    // Set cookie to response headers before headers are sent
    onHeaders(response, function () {
      self.addCookieToResponse(request, response);
    });

    // Proxy response.end to close session before request end
    response.end = function () {
      var endArguments = arguments;

      if (ended) {
        return false;
      }

      ended = true;

      self.closeSession(request.session, function (err: Error) {
        if (err) {
          throw err;
        }
        end.apply(response, endArguments);
      });

    };

    // start the session for the request
    this.getSession(request, function (session) {
      request.session = session;

      session.start(callback);
    });
  };

  /**
   * Get the session implementation from the manager.
   *
   * @param {Object} request - http request object
   * @param {function} callback - callback to return session object
   */
  getSession(request: Request, callback: Function) {
    const self = this;
    this.manager.driver(null, function (session: Object) {
      session.setId(self.getCookie(request, session.getName()));
      callback(session);
    });
  };


  /**
   * Add the session cookie to the application response.
   */
  private addCookieToResponse(request: Request, response: Response) {
    var config = this.config;
    var session = request.session;
    var maxAge = this.getCookieLifetime();
    var data: Record<string, string | boolean | number | undefined> = {
      signed: true,
      path: config.path,
      domain: config.domain,
      secure: config.secure,
      httpOnly: config.httpOnly
    };

    // maxAge = 0 => cookie expire on browser close.
    // so no need to set maxAge.
    if (maxAge !== 0) {
      data.maxAge = maxAge;
    }

    this.setCookie(
      request,
      response,
      session.getName(),
      session.getId(),
      data
    );
  };

  /**
   * Get the cookie lifetime in seconds.
   */
  private getCookieLifetime(): number {
    var config = this.config;

    return config.expireOnClose ? 0 : config.lifetime;
  };



  /**
   * Closes the given session.
   */
  private closeSession(session: Object, callback: Function) {
    session.save(callback);
    //@todo: note callback is executed after save, not waiting for garbage collection to complete
    this.collectGarbage(session);
  };

  /**
   * Remove the garbage from the session if necessary.
   */
  private collectGarbage(session: Object) {
    // Here we will see if this request hits the garbage collection lottery by hitting
    // the odds needed to perform garbage collection on any given request. If we do
    // hit it, we'll call this handler to let it delete all the expired sessions.
    if (this.configHitsLottery()) {
      session.getHandler().gc && session.getHandler().gc(this.config.lifetime);
    }
  };

  /**
   * Determine if the configuration odds hit the lottery.
   */
  private configHitsLottery(): boolean {
    return (_.random(1, __(this.config['lottery'] || [])[1]) <= this.config['lottery'][0]);
  };


  /**
   * Add session cookie to response
   *
   * @param {Object} request - http request object
   * @param {Object} response - http response object
   * @param {String} name - cookie name
   * @param {*} val - cookie value
   * @param {*} options
   * @private
   */
  setCookie(request: Request, response: Response, name: string, val: any, options: any) {
    options = _.merge({}, options);

    // only send secure cookies via https
    if (!(options.secure && !this.isSecure(request))) {
      var secret = this.config.secret;
      var signed = options.signed;

      if (signed && !secret) {
        throw new Error('An encryption key is required for signed cookies');
      }

      if ('number' == typeof val) {
        val = val.toString();
      }

      if ('object' == typeof val) {
        val = 'j:' + JSON.stringify(val);
      }

      if (signed) {
        val = 's:' + signature.sign(val, secret);
      }

      if ('maxAge' in options) {
        options.expires = new Date(Date.now() + options.maxAge);
        options.maxAge /= 1000;
      }

      if (!options.path) {
        options.path = '/';
      }

      var headerVal = cookie.serialize(name, String(val), options);

      // supports multiple 'setCookie' calls by getting previous value
      var prev = response.getHeader('set-cookie') || [];
      var header = Array.isArray(prev) ? prev.concat(headerVal)
        : Array.isArray(headerVal) ? [prev].concat(headerVal)
          : [prev, headerVal];

      response.setHeader('set-cookie', header);
    }
  };

  /**
   * Check whether request is secure
   */
  private isSecure(request: Request): boolean {
    var proto;

    // socket is https server
    if (request.connection && request.connection.encrypted) {
      proto = 'https';
    } else {
      proto = 'http';
    }

    if (this.config.trustProxy &&
      this.config.trustProxyFn &&
      this.config.trustProxyFn(request.connection.remoteAddress, 0)) {
      // Note: X-Forwarded-Proto is normally only ever a
      //       single value, but this is to be safe.
      // read the proto from x-forwarded-proto header
      var header = request.headers['x-forwarded-proto'] || '';
      var index = header.indexOf(',');
      proto = (index !== -1
        ? header.substr(0, index).toLowerCase().trim()
        : header.toLowerCase().trim()) || proto;
    }

    return proto === 'https';
  };

  /**
   * Get the session ID cookie from request.
   *
   * @return {string} session id
   * @private
   */
  getCookie(request: Request, name: string): string {
    // if signed cookie is already present in request(means cookie
    // parsing is already done), we will use it straight.
    if (request.signedCookies) {
      return request.signedCookies[name];
    }

    var header = request.headers.cookie;
    var raw;
    var val;

    // read from cookie header
    if (header) {
      var cookies = cookie.parse(header);

      raw = cookies[name];

      if (raw) {
        if (raw.substr(0, 2) === 's:') {
          val = this.unsignCookie(raw.slice(2));

          if (val === false) {
            //console.error('cookie signature invalid');
            val = undefined;
          }
        }
      }
    }

    return val;
  };

  /**
   * Unsign a cookie value
   */
  private unsignCookie(val: string): string | boolean {
    return signature.unsign(val, this.config.secret);
  };

  /**
   * Update session manager encrypter service.
   */
  setEncrypter(encrypter: Object) {
    this.manager.setEncrypter(encrypter);
  };

};


module.exports = NodeSession;