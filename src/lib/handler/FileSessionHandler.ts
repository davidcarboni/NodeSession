/**
 * FileSessionHandler.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var fs = require('fs-extra');
var path = require('path');

export class FileSessionHandler {

  /**
   * The path where sessions should be stored.
   */
  private __path: string;

  constructor(path: string) {
    this.__path = path;

    // Create directory for session storage.
    fs.mkdirsSync(this.__path);
  }

  /**
   * Reads the session data.
   */
  read(sessionId: string, callback: Function) {
    fs.readFile(path.join(this.__path, sessionId), 'utf-8', function (err, file) {
      if (err) {
        file = '';
      }
      if (callback) {
        callback(file);
      }
    });
  };

  /**
   * Writes the session data to the storage.
   */
  write(sessionId: string, data: string, callback: Function) {
    fs.writeFile(path.join(this.__path, sessionId), data, 'utf-8', function (err) {
      if (callback) {
        callback(err);
      }
    });
  };

  /**
   * Destroys a session.
   */
  destroy(sessionId: string, callback?: Function) {
    fs.unlink(path.join(this.__path, sessionId), function (err) {
      if (callback) {
        callback(err);
      }
    });
  };

  /**
   * Cleans up expired sessions (garbage collection).
   */
  gc(maxAge: string | number) {
    var self = this;

    fs.readdir(self.__path, function (err, files) {
      if (err || files.length === 0) {
        return;
      }
      files.forEach(function (file) {
        if (file[0] != '.') {
          fs.stat(path.join(self.__path, file), function (err, stat) {
            if (!err) {
              if (stat.isFile() && (((new Date()).getTime() - stat.atime.getTime()) > +(maxAge))) {
                self.destroy(file);
              }
            }
          });
        }
      });
    });
  };

}