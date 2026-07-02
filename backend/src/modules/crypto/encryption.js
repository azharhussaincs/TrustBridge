const crypto = require('crypto');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.authTagLength = 16; // 128 bits
  }

  /**
   * Generate a secure encryption key
   * @returns {Buffer} 32-byte encryption key
   */
  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Generate a random IV (Initialization Vector)
   * @returns {Buffer} 16-byte IV
   */
  generateIV() {
    return crypto.randomBytes(this.ivLength);
  }

  /**
   * Get encryption key from environment or generate new one
   * @returns {Buffer} 32-byte encryption key
   */
  getKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (key) {
      // Use provided key, ensure it's 32 bytes
      return Buffer.from(key.padEnd(this.keyLength, '0').slice(0, this.keyLength), 'utf8');
    }
    // Generate a new key (for development)
    console.warn('⚠️ No ENCRYPTION_KEY found in .env, generating temporary key');
    return this.generateKey();
  }

  /**
   * Encrypt data using AES-GCM
   * @param {string|Buffer} data - Data to encrypt
   * @param {Buffer} key - Encryption key (32 bytes)
   * @param {Buffer} iv - Initialization Vector (16 bytes)
   * @returns {Object} { encryptedData, authTag }
   */
  encrypt(data, key = null, iv = null) {
    try {
      // Use provided key or get from environment
      const encryptionKey = key || this.getKey();
      const ivBuffer = iv || this.generateIV();

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, encryptionKey, ivBuffer);
      
      // Convert data to buffer if string
      const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
      
      // Encrypt the data
      const encrypted = Buffer.concat([
        cipher.update(dataBuffer),
        cipher.final()
      ]);
      
      // Get the auth tag
      const authTag = cipher.getAuthTag();
      
      return {
        encryptedData: encrypted,
        iv: ivBuffer,
        authTag: authTag
      };
    } catch (error) {
      console.error('❌ Encryption error:', error.message);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using AES-GCM
   * @param {Buffer} encryptedData - Encrypted data
   * @param {Buffer} key - Encryption key (32 bytes)
   * @param {Buffer} iv - Initialization Vector (16 bytes)
   * @param {Buffer} authTag - Authentication tag
   * @returns {Buffer} Decrypted data
   */
  decrypt(encryptedData, key = null, iv, authTag) {
    try {
      // Use provided key or get from environment
      const encryptionKey = key || this.getKey();
      
      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm, 
        encryptionKey, 
        iv
      );
      
      // Set auth tag for verification
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);
      
      return decrypted;
    } catch (error) {
      console.error('❌ Decryption error:', error.message);
      throw new Error(`Decryption failed: Data may be corrupted or tampered with`);
    }
  }

  /**
   * Encrypt a message (string)
   * @param {string} message - Message to encrypt
   * @param {Buffer} key - Encryption key
   * @returns {Object} { encryptedData, iv, authTag }
   */
  encryptMessage(message, key = null) {
    const encryptionKey = key || this.getKey();
    const iv = this.generateIV();
    return this.encrypt(message, encryptionKey, iv);
  }

  /**
   * Decrypt a message
   * @param {Buffer} encryptedData - Encrypted data
   * @param {Buffer} iv - Initialization Vector
   * @param {Buffer} authTag - Authentication tag
   * @param {Buffer} key - Encryption key
   * @returns {string} Decrypted message
   */
  decryptMessage(encryptedData, iv, authTag, key = null) {
    const encryptionKey = key || this.getKey();
    const decrypted = this.decrypt(encryptedData, encryptionKey, iv, authTag);
    return decrypted.toString('utf8');
  }

  /**
   * Encrypt a file (Buffer)
   * @param {Buffer} fileBuffer - File data
   * @param {Buffer} key - Encryption key
   * @returns {Object} { encryptedData, iv, authTag }
   */
  encryptFile(fileBuffer, key = null) {
    const encryptionKey = key || this.getKey();
    const iv = this.generateIV();
    return this.encrypt(fileBuffer, encryptionKey, iv);
  }

  /**
   * Encrypt a file on disk using streaming (no full-file RAM buffer).
   * @param {string} sourcePath - Path to plaintext file
   * @param {string} destPath - Path for encrypted output
   * @param {Buffer} key - Encryption key
   * @returns {Promise<{ iv: Buffer, authTag: Buffer }>}
   */
  async encryptFileFromPath(sourcePath, destPath, key = null) {
    const encryptionKey = key || this.getKey();
    const iv = this.generateIV();
    const cipher = crypto.createCipheriv(this.algorithm, encryptionKey, iv);

    await pipeline(
      createReadStream(sourcePath),
      cipher,
      createWriteStream(destPath)
    );

    return { iv, authTag: cipher.getAuthTag() };
  }

  /**
   * Decrypt a file
   * @param {Buffer} encryptedData - Encrypted data
   * @param {Buffer} iv - Initialization Vector
   * @param {Buffer} authTag - Authentication tag
   * @param {Buffer} key - Encryption key
   * @returns {Buffer} Decrypted file data
   */
  decryptFile(encryptedData, iv, authTag, key = null) {
    const encryptionKey = key || this.getKey();
    return this.decrypt(encryptedData, encryptionKey, iv, authTag);
  }

  /**
   * Stream-decrypt a file to an HTTP response (or any writable stream).
   * @param {string} encryptedPath - Path to encrypted file
   * @param {Buffer} iv
   * @param {Buffer} authTag
   * @param {import('stream').Writable} outputStream
   * @param {Buffer} key
   */
  async decryptFileToStream(encryptedPath, iv, authTag, outputStream, key = null) {
    const encryptionKey = key || this.getKey();
    const decipher = crypto.createDecipheriv(this.algorithm, encryptionKey, iv);
    decipher.setAuthTag(authTag);

    await pipeline(
      createReadStream(encryptedPath),
      decipher,
      outputStream
    );
  }

  /**
   * Generate a key from a password (for user-specific keys)
   * @param {string} password - User password
   * @param {string} salt - Salt for key derivation
   * @returns {Buffer} 32-byte encryption key
   */
  generateKeyFromPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Verify if the encryption system is working
   * @returns {boolean} True if encryption/decryption works
   */
  testEncryption() {
    try {
      const testMessage = 'Hello, SecureLAN!';
      const key = this.generateKey();
      
      const encrypted = this.encryptMessage(testMessage, key);
      const decrypted = this.decryptMessage(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.authTag,
        key
      );
      
      return testMessage === decrypted;
    } catch (error) {
      console.error('❌ Encryption test failed:', error.message);
      return false;
    }
  }
}

module.exports = new EncryptionService();
