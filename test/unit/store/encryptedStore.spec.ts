/**
 * encryptedStore.spec.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */
import Store from '../../../store/Store';
import EncryptedStore from '../../../store/EncryptedStore';
import FileSessionHandler from '../../../handler/FileSessionHandler';

describe('EncryptedStore', function () {
  var sessionStoragePath = './test/sessions';
  var value = "data to store";
  var handler = new FileSessionHandler(sessionStoragePath);
  var encryptedStore = new EncryptedStore('node_session', handler, null, 'sdhfjasdfasjdhfjhsajdhfjhasdfsdksdf');

  describe('#constructor', function () {
    it('Should be an instance of EncryptedStore and Store', function (done) {
      encryptedStore.should.be.an.instanceOf(EncryptedStore);
      encryptedStore.should.be.an.instanceOf(Store);
      done();
    });
  });

  describe('method#prepareForStorage', function () {
    it('should encrypt and return given data', function (done) {
      encryptedStore.prepareForStorage(value).should.not.eql(value);
      done();
    })
  });

  describe('method#prepareForParse', function () {
    it('should decrypt and return given data', function (done) {
      encryptedStore.prepareForParse(encryptedStore.prepareForStorage(value)).should.eql(value);
      done();
    })
  })
});
