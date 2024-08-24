/**
 * Store.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var uid = require('uid-safe').sync;
var _ = require('lodash');
var dotAccess = require('dot-access');
var util = require('./../util');

/**
 * Create a new session instance.
 *
 * @param  {String} name
 * @param  {Object} handler
 * @param  {String|null} id
 */
export class Store {

  private name: string;

  private handler: Object;

  protected attributes: Record<string, any>;

  private started: boolean;

  private id: any;

  constructor(name: string, handler: Object, id: string) {
    this.setId(id);
    this.name = name;
    this.handler = handler;

    /**
     * The session attributes.
     */
    this.attributes = {};

    /**
     * Session store started status.
     */
    this.started = false;
  }

  /**
   * Sets the session ID.
   */
  setId(id?: string) {
    if (this.isValidId(id)) {
      this.id = id;
    } else {
      this.id = this.generateSessionId();
    }
  };

  /**
   * Determine if given id is a valid session ID.
   * @
   */
  protected isValidId(id?: string): boolean {
    return typeof id === 'string' && /^[A-Za-z0-9-_]{40}$/.test(id);
  };

  /**
   * Get a new, random session ID.
   */
  protected generateSessionId(): string {
    return uid(30);
  };

  /**
   * Returns the session name.
   */
  getName(): string {
    return this.name;
  };

  /**
   * Starts the session storage.
   *
   * @throws Error If session fails to start.
   */
  start(callback: Function) {
    var self = this;

    this.loadSession(function () {
      if (!self.attributes['_token']) {
        self.regenerateToken();
      }

      self.started = true;

      callback();
    });
  };

  /**
   * Checks if an attribute is defined.
   *
   * @param name The attribute name
   * @return true if the attribute is defined, false otherwise
   */
  has(name: string): boolean {
    return this.get(name) !== undefined;
  };

  /**
   * Load the session data from the handler.
   *
   * @param {function} callback
   * @protected
   */
  loadSession(callback) {
    var self = this;

    this.readFromHandler(function (data) {
      self.attributes = _.merge(self.attributes, data);
      callback();
    });

  };

  /**
   * Read the session data from the handler.
   *
   * @param {function} callback
   */
  readFromHandler(callback) {
    var self = this;

    this.handler.read(this.getId(), function afterRead(data) {
      if (data) {
        try {
          data = JSON.parse(self.prepareForParse(data));
        } catch (e) {

        }
      }

      callback(data ? data : {});
    });
  };

  /**
   * Prepare the raw string data from the session for JSON parse.
   *
   * @param  {String} data
   * @return {String}
   */
  prepareForParse(data) {
    return data;
  };


  /**
   * Returns the session ID.
   *
   * @return {String} The session ID.
   */
  getId() {
    return this.id;
  };

  /**
   * Get the value of a given key and then forget it.
   *
   * @param  {String}  key
   * @param  {*}  defaultValue
   * @return {*}
   */
  pull(key, defaultValue) {
    if (defaultValue === undefined) {
      defaultValue = null;
    }

    if (this.attributes[key]) {
      defaultValue = this.attributes[key];
      delete this.attributes[key];
    }

    return defaultValue;
  };

  /**
   * Returns an attribute.
   *
   * @param name The attribute name
   * @param defaultValue The default value if not found.
   *
   * @return The attribute value
   */
  get(name: string, defaultValue?: any): any {
    var value = dotAccess.get(this.attributes, name);
    return value === undefined ? defaultValue : value;
  };

  /**
   * Returns all attributes.
   */
  all(): Record<string, any> {
    return this.attributes;
  };

  /**
   * Sets an attribute.
   */
  set(name: string, value: any) {
    try {
      dotAccess.set(this.attributes, name, value);
    } catch (e) {
      util.defineMember(this.attributes, name);
      dotAccess.set(this.attributes, name, value);
    }
  };

  /**
   * Regenerate the CSRF token value.
   */
  regenerateToken() {
    this.put('_token', uid(30));
  };

  /**
   * Put a key / value pair or Object of key / value pairs in the session.
   */
  put(key: string | Object, value: any | null) {
    let update: Object;
    if (typeof key === 'string') {
      var temp = {};
      temp[key] = value;
      update = temp;
    } else {
      update = key;
    }

    for (const objKey in update) {
      if (update.hasOwnProperty(objKey)) {
        this.set(objKey, update[objKey]);
      }
    }
  };

  /**
   * Push a value onto a session array.
   */
  push(key: string, value: any) {
    var array = this.get(key, []);
    if (Array.isArray(array)) {
      array.push(value);

      this.put(key, array);
    }
  };

  /**
   * Force the session to be saved and closed.
   */
  save(callback: Function) {
    this.ageFlashData();

    var self = this;

    this.handler.write(this.getId(), this.prepareForStorage(JSON.stringify(this.attributes)), function (err: Error) {
      self.started = false;
      callback(err);
    });
  };

  /**
   * Prepare the JSON string session data for storage.
   *
   * @param  {String} data
   * @return {String}
   */
  prepareForStorage(data: string): string {
    return data;
  };

  /**
   * Age the flash data for the session.
   */
  ageFlashData() {
    var self = this;

    this.get('flash.old', []).forEach(function (old) {
      self.forget(old);
    });

    this.put('flash.old', this.get('flash.new', []));

    this.put('flash.new', []);
  };

  /**
   * Remove an item from the session.
   */
  forget(key: string) {
    delete this.attributes[key];
  };

  /**
   * Remove all of the items from the session.
   */
  flush() {
    this.attributes = {};
  };

  /**
   * Generate a new session identifier.
   *
   * @param  {Boolean} destroy
   * @return {Boolean}
   */
  regenerate(destroy: boolean): boolean {
    if (destroy) {
      this.handler.destroy(this.getId());
    }

    this.setExists(false);

    this.setId();

    return true;
  };

  /**
   * Set the existence of the session on the handler if applicable.
   */
  setExists(value: boolean) {
    if (_.isFunction(this.handler.setExists)) {
      this.handler.setExists(value);
    }
  };

  /**
   * Get the underlying session handler implementation.
   */
  getHandler() {
    return this.handler;
  };

  /**
   * Flash a key / value pair to the session.
   *
   * @param  {String}  key
   * @param  {*}   value
   */
  flash(key: string, value: any) {
    this.put(key, value);

    this.push('flash.new', key);

    this.removeFromOldFlashData([key]);
  };

  /**
   * Flash an input array to the session.
   */
  flashInput(value: any[]) {
    value = [].concat(...value);
    this.flash('_old_input', value);
  };

  /**
   * Remove the given keys from the old flash data.
   */
  removeFromOldFlashData(keys: string[]) {
    this.put('flash.old', _.difference(this.get('flash.old', []), keys));
  };

  /**
   * Re-flash all of the session flash data.
   */
  reflash() {
    this.mergeNewFlashes(this.get('flash.old', []));

    this.put('flash.old', []);
  };

  /**
   * Merge new flash keys into the new flash array.
   */
  protected mergeNewFlashes(keys: string[]) {
    var values = _.uniq((this.get('flash.new', [])).concat(keys));

    this.put('flash.new', values);
  };

  /**
   * Re-flash a subset of the current flash data.
   */
  keep(keys: string[] | any) {
    keys = Array.isArray(keys) ? keys : Array.prototype.slice.call(arguments);

    this.mergeNewFlashes(keys);

    this.removeFromOldFlashData(keys);
  };

  /**
   * Get the CSRF token value.
   */
  getToken(): string {
    return this.get('_token');
  };

  /**
   * Migrates the current session to a new session id while maintaining all
   * session attributes.
   *
   * @param destroy  Whether to delete the old session or leave it to garbage collection.
   * @return   True if session migrated, false if error.
   */
  migrate(destroy: boolean): boolean {
    if (destroy) {
      this.handler.destroy(this.getId());
    }

    this.setExists(false);
    this.setId();

    return true;
  };


}