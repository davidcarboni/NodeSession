/**
 * EncryptedStore.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

var util = require('util');
var Store = require('./Store');
var Encrypter = require('encrypter');


/**
 * Create a new session instance.
 */
class EncryptedStore extends Store {
  constructor(name: string, handler: Object, encrypter: Object | null, secret: string, id: string | null) {
    super(name, handler);

    if (!encrypter) {
      encrypter = new Encrypter(secret);
    }

    this.__encrypter = encrypter;
  }


  /**
   * Prepare the raw string data from the session for JSON parse.
   */
  __prepareForParse(data: string): string {
    return this.__encrypter.decrypt(data);
  };

  /**
   * Prepare the JSON string session data for storage.
   */
  __prepareForStorage(data: string): string {
    return this.__encrypter.encrypt(data);
  };

}