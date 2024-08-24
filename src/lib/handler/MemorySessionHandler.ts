/**
 * MemorySessionHandler.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2016, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

export class MemorySessionHandler {

  private __sessions: any;

  constructor(session) {
    /**
     * Object to keep all the sessions
     *
     * @type {Object}
     * @private
     */

    this.__sessions = session;
  }

  /**
   * Reads the session data.
   */
  read(sessionId: string, callback: Function) {
    callback(this.__sessions[sessionId] || '');
  };

  /**
   * Writes the session data to the storage.
   */
  write(sessionId: string, data: string, callback: Function) {
    this.__sessions[sessionId] = data;
    callback();
  };

  /**
   * Destroys a session.
   */
  destroy(sessionId: string, callback: Function) {
    delete this.__sessions[sessionId];
    if (callback) {
      callback();
    }
  };

}