const crypto = require('crypto');
const { ENCRYPTION } = require('./constants');

class EncryptionConfig {
  constructor() {
    this.algorithm = ENCRYPTION.ALGORITHM;
    this.keyLength = ENCRYPTION.KEY_LENGTH;
    this.ivLength = ENCRYPTION.IV_LENGTH;
    this.authTagLength = ENCRYPTION.AUTH_TAG_LENGTH;
    this.encryptionKey = process.env.ENCRYPTION_KEY;
  }

  getKey() {
    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_KEY not set in environment variables');
    }
    return Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32), 'utf8');
  }

  generateIV() {
    return crypto.randomBytes(this.ivLength);
  }

  validateKey() {
    const key = this.getKey();
    if (key.length !== this.keyLength) {
      throw new Error(`Invalid encryption key length. Expected ${this.keyLength} bytes, got ${key.length}`);
    }
    return true;
  }
}

module.exports = new EncryptionConfig();
