/**
 * util.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

import proxyaddr from 'proxy-addr';

const util = {


  /**
   * Define a object key by dot notation
   */
  defineMember: function (obj: Record<string, any>, name: string) {
    var nameSplit = name.split('.');
    var i;
    var exists = obj;

    for (i = 0; i < nameSplit.length - 1; i++) {
      if (!exists.hasOwnProperty(nameSplit[i]) || typeof exists[nameSplit[i]] !== 'object') {
        exists[nameSplit[i]] = {};
      }
      exists = exists[nameSplit[i]];
    }
  },

  /**
   * Compile "proxy trust" value to function.
   */

  compileTrust: function (val: boolean | string | number | Array<any> | Function): Function {
    if (typeof val === 'function') return val;

    if (val === true) {
      // Support plain true/false
      return function () { return true; };
    }

    if (typeof val === 'number') {
      // Support trusting hop count
      return function (_a: any, i: number) { return i < +(val); };
    }

    if (typeof val === 'string') {
      // Support comma-separated values
      val = val.split(/ *, */);
    }

    return proxyaddr.compile(val || []);
  },



};

export default util;