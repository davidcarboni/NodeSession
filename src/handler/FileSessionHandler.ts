import { SessionHandler } from "../types";

/**
 * FileSessionHandler.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

import * as  fs from 'fs';
var path = require('path');

export default class FileSessionHandler implements SessionHandler {

  /**
   * The path where sessions should be stored.
   */
  private path: string;

  constructor(path: string) {
    this.path = path;

    // Create directory for session storage.
    fs.mkdirSync(this.path, { recursive: true });
  }

  /**
   * Reads the session data.
   */
  read(sessionId: string, callback?: (session: any) => void) {
    try {
      const data = fs.readFileSync(path.join(this.path, sessionId), { encoding: 'utf-8' });
      if (callback) callback(data);
    } catch (e) {
      if (callback) callback('');
    }
  };

  /**
   * Writes the session data to the storage.
   */
  write(sessionId: string, data: string, callback: (err?: Error) => void) {
    let err: Error | undefined;
    try {
      fs.writeFileSync(path.join(this.path, sessionId), data, 'utf-8');
    } catch (e) {
      err = e as Error;
    }
    if (callback) callback(err);
  };

  /**
   * Destroys a session.
   */
  destroy(sessionId: string, callback?: (err?: Error) => void) {
    let err: Error | undefined;
    try {
      fs.unlinkSync(path.join(this.path, sessionId));
    } catch (e) {
      err = e as Error;
    }
    if (callback) callback(err);
  };

  /**
   * Cleans up expired sessions (garbage collection).
   */
  gc(maxAge: string | number) {
    try {
      const files = fs.readdirSync(this.path);
      files.forEach((file) => {
        if (file[0] !== '.') {
          const stat = fs.statSync(path.join(this.path, file));
          if (stat.isFile() && (((new Date()).getTime() - stat.atime.getTime()) > +(maxAge))) {
            this.destroy(file);
          }
        }
      });
    } catch (_e) {
      // Ignore - best-effort cleanup
    }
  };

  // Interface methods - no implementation needed
  setExists<T extends SessionHandler>(_value: boolean) { return this as unknown as T; }
}