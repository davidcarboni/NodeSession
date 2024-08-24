/**
 * SessionManager.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

import { Config, SessionHandler } from "./types";

import FileSessionHandler from './handler/FileSessionHandler';
import MemorySessionHandler from './handler/MemorySessionHandler';
import DatabaseSessionHandler from './handler/DatabaseSessionHandler';
import Store from './store/Store';
import EncryptedStore from './store/EncryptedStore';
var Waterline = require('waterline');

/**
 * Create a session manager instance.
 */
export default class SessionManager {

  protected config: Config;
  protected customCreators: Record<string, (config: Config, callback: (() => void) | undefined) => void> = {};
  protected encrypter: any | undefined;

  /**
   * The session database model instance
   */
  protected sessionModel: Object | null = null;

  /**
   * The memory session handler storage
   */
  protected memorySession: Object | null;

  constructor(config: Config, encrypter?: any) {
    this.config = config;
    this.encrypter = encrypter;
    this.memorySession = null;
  }

  /**
   * Get the default driver name.
   */
  getDefaultDriver(): string {
    return this.config.driver;
  };

  /**
   * Get a driver instance.
   */
  driver(driver?: string, callback?: () => void) {
    driver = driver ? driver : this.getDefaultDriver();

    this.createDriver(driver, callback);
  };

  /**
   * Create a new driver instance.
   *
   * throws Error if specified given driver creator method doesn't exists.
   */
  protected createDriver(driver: string, callback?: () => void) {
    var method = 'create' + driver.charAt(0).toUpperCase() + driver.slice(1) + 'Driver';

    // We'll check to see if a creator method exists for the given driver. If not we
    // will check for a custom driver creator, which allows developers to create
    // drivers using their own customized driver creator Closure to create it.
    if (this.customCreators[driver]) {
      return this.callCustomCreator(driver, callback);
    } else if (typeof this.customCreators[method] === 'function') {
      return this.customCreators[method](this.config, callback);
    }

    throw new Error("Driver " + driver + " not supported.");
  };

  /**
   * Call a custom driver creator.
   */
  protected callCustomCreator(driver: string, callback?: () => void) {
    this.customCreators[driver](this.config, callback);
  };


  /**
   * Register a custom driver creator Closure.
   *
   * @param  {String} driver
   * @param  {function} handler
   * @return {SessionManager}
   */
  registerHandler(driver: string, handler: (config: Config, callback: (() => void) | undefined) => void) {
    this.customCreators[driver] = handler;

    return this;
  };



  /**
   * Create an instance of the memory session driver.
   *
   * @param {function} callback to return session driver instance
   */
  protected createMemoryDriver(callback: Function) {
    callback(this.buildSession(new MemorySessionHandler(this.memorySession)));
  };

  /**
   * Create an instance of the file session driver.
   *
   * @param {function} callback to return session driver instance
   */
  protected createFileDriver(callback: Function) {
    return this.createNativeDriver(callback);
  };

  /**
   * Create an instance of the file session driver.
   *
   * @param {function} callback to return session driver instance
   */
  protected createNativeDriver(callback: Function) {
    var path = this.config.files;

    callback(this.buildSession(new FileSessionHandler(path)));
  };


  /**
   * Create an instance of the database session driver.
   *
   * @return {Object} Session driver instance
   */
  protected createDatabaseDriver(callback: Function): Object {
    var self = this;

    this.getSessionModel(function (model: Object) {
      callback(self.buildSession(new DatabaseSessionHandler(model)));
    });
  };

  /**
   * Get the database session table model for the database driver.
   *
   * @param {function} callback
   */
  protected getSessionModel(callback: Function) {
    if (!this.sessionModel) {
      var self = this;
      this.createSessionModel(function (model: Object) {
        self.sessionModel = model;
        callback(self.sessionModel);
      });
    } else {
      callback(this.sessionModel);
    }
  };

  /**
   * Create a waterline session model instance
   */
  protected createSessionModel(callback: Function) {
    var self = this;
    var adapters = {};
    var orm = new Waterline();
    var SessionModel = Waterline.Collection.extend({
      identity: this.config.table,
      connection: this.config.table,
      migrate: 'safe',
      autoCreatedAt: false,
      autoUpdatedAt: false,
      attributes: {
        id: {
          type: 'string',
          unique: true
        },
        payload: 'string',
        lastActivity: 'integer'
      }
    });

    // Load the Models into the ORM
    orm.loadCollection(SessionModel);

    adapters[this.config.connection.adapter] = require(this.config.connection.adapter);

    // Tear down previous session adapter connection with same adapter.
    adapters[this.config.connection.adapter].teardown(this.config.table, function () { });

    var initConf = {
      adapters: adapters,
      connections: {}
    };
    initConf.connections[this.config.table] = this.config.connection;

    orm.initialize(initConf, function (err: Error, models) {
      if (err) {
        throw err;
      }

      SessionModel = models.collections[self.config.table];
      callback(SessionModel);
    });
  };


  /**
   * Build the session instance.
   *
   * @param  handler
   * @return Session instance
   */
  buildSession(handler: SessionHandler): Store {
    if (this.config.encrypt && this.encrypter) {
      return new EncryptedStore(
        this.config.cookie, handler, this.encrypter, this.config.secret
      );
    } else {
      return new Store(this.config.cookie, handler);
    }
  };

  /**
   * Update session encrypter service.
   */
  setEncrypter(encrypter: any) {
    this.encrypter = encrypter;
  };


}

