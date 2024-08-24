import { SessionHandler } from "../types";

/**
 * DatabaseSessionHandler.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */
export default class DatabaseSessionHandler implements SessionHandler {

  private model: any;

  private exists: boolean;

  constructor(model: any) {
    /**
     * Session table waterline model instance.
     *
     * @type {Object}
     * @private
     */
    this.model = model;

    /**
     * The existence state of the session.
     *
     * @type {Boolean}
     */
    this.exists = false;
  }

  /**
   * Reads the session data.
   */
  read(sessionId: string, callback: (session: any) => void) {
    var self = this;
    var response = '';

    this.model.findOne(sessionId, function (err: Error, session: Object) {
      if (!err && session && session.payload) {
        self.exists = true;

        response = JSON.parse(session.payload);
      }

      if (callback) {
        callback(response);
      }
    });
  };

  /**
   * Writes the session data to the storage.
   */
  write(sessionId: string, data: string, callback: (err?: Error) => void) {
    var self = this;
    if (this.exists) {
      this.model.update(sessionId,
        { payload: JSON.stringify(data), lastActivity: (new Date()).getTime() },
        function (err: Error, _record: any) {
          if (!err) {
            self.exists = true;
          }

          if (callback) {
            callback(err);
          }
        }
      );
    }
    else {
      this.model.create(
        {
          id: sessionId,
          payload: JSON.stringify(data),
          lastActivity: (new Date()).getTime()
        },
        function (err: Error, record: any) {
          if (!err) {
            self.exists = true;
          }

          if (callback) {
            callback(err);
          }
        }
      );
    }

  };

  /**
   * Destroys a session.
   */
  destroy(sessionId: string, callback: (err?: Error) => void) {
    this.model.destroy(sessionId, function (err: Error) {
      if (callback) {
        callback(err);
      }
    });
  };

  /**
   * Cleans up expired sessions (garbage collection).
   *
   * @param maxAge Sessions that have not updated for the last maxAge seconds will be removed
   */
  gc(maxAge: string | number) {
    var age = (new Date()).getTime() - +(maxAge);
    this.model.destroy({ lastActivity: { '<': age } }, function (err) {
    });
  };

  /**
   * Set the existence state for the session.
   *
   * @param  {Boolean} value
   * @return {DatabaseSessionHandler}
   */
  setExists<DatabaseSessionHandler>(value: boolean): DatabaseSessionHandler {
    this.exists = value;

    return this as unknown as DatabaseSessionHandler;
  };

}