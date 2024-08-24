import { SessionHandler } from "../types";

/**
 * MemorySessionHandler.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2016, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

export default class MemorySessionHandler implements SessionHandler {

  /**
   * Object to keep all the sessions
   */
  private sessions: Record<string, string>;

  constructor(session?: Record<string, string>) {
    this.sessions = session || {};
  }

  /**
   * Reads the session data.
   */
  read(sessionId: string, callback: (session: any) => void) {
    callback(this.sessions[sessionId] || '');
  };

  /**
   * Writes the session data to the storage.
   */
  write(sessionId: string, data: string, callback: (err?: Error) => void) {
    this.sessions[sessionId] = data;
    callback();
  };

  /**
   * Destroys a session.
   */
  destroy(sessionId: string, callback: (err?: Error) => void) {
    delete this.sessions[sessionId];
    if (callback) {
      callback();
    }
  };

  // Interface methods - no implementation needed
  gc(_maxAge: string | number) { return; }
  setExists<T extends SessionHandler>(_value: boolean) { return this as unknown as T; }
}