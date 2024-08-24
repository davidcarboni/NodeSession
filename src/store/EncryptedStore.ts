/**
 * EncryptedStore.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

import Store from './Store';
import Encrypter from 'encrypter';


/**
 * Create a new session instance.
 */
export default class EncryptedStore extends Store {

  private encrypter: any;

  constructor(name: string, handler: Object, encrypter: any, secret: string, id?: string) {
    super(name, handler, id);

    if (!encrypter) {
      encrypter = new Encrypter(secret);
    }

    this.encrypter = encrypter;
  }


  /**
   * Prepare the raw string data from the session for JSON parse.
   */
  prepareForParse(data: string): string {
    return this.encrypter.decrypt(data);
  };

  /**
   * Prepare the JSON string session data for storage.
   */
  prepareForStorage(data: string): string {
    return this.encrypter.encrypt(data);
  };

}