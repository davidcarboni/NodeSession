/**
 * DatabaseSessionHandler.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */
export class DatabaseSessionHandler {
  private __model: any;
  private __exists: boolean;
  constructor(model) {
    /**
     * Session table waterline model instance.
     *
     * @type {Object}
     * @private
     */
    this.__model = model;

    /**
     * The existence state of the session.
     *
     * @type {Boolean}
     */
    this.__exists;
  }

  /**
   * Reads the session data.
   */
  read(sessionId: string, callback: Function) {
    var self = this;
    var response = '';

    this.__model.findOne(sessionId, function (err, session) {
      if (!err && session && session.payload) {
        self.__exists = true;

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
  write(sessionId: string, data: string, callback: Function) {
    var self = this;
    if (this.__exists) {
      this.__model.update(sessionId,
        { payload: JSON.stringify(data), lastActivity: (new Date()).getTime() },
        function (err: Error, record: any) {
          if (!err) {
            self.__exists = true;
          }

          if (callback) {
            callback(err);
          }
        }
      );
    }
    else {
      this.__model.create(
        {
          id: sessionId,
          payload: JSON.stringify(data),
          lastActivity: (new Date()).getTime()
        },
        function (err: Error, record: any) {
          if (!err) {
            self.__exists = true;
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
  destroy(sessionId: string, callback: Function) {
    this.__model.destroy(sessionId, function (err) {
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
    this.__model.destroy({ lastActivity: { '<': age } }, function (err) {
    });
  };

  /**
   * Set the existence state for the session.
   *
   * @param  {Boolean} value
   * @return {DatabaseSessionHandler}
   */
  setExists(value: boolean): DatabaseSessionHandler {
    this.__exists = value;

    return this;
  };

}