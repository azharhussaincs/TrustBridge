const encryptionService = require('./encryption');

class CryptoController {
  async test(req, res) {
    try {
      const result = encryptionService.testEncryption();
      res.json({
        success: true,
        message: 'Encryption test completed',
        data: { working: result }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async encryptMessage(req, res) {
    try {
      const { message, key } = req.body;
      
      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Message is required'
        });
      }

      const encryptionKey = key ? Buffer.from(key, 'hex') : null;
      const result = encryptionService.encryptMessage(message, encryptionKey);
      
      res.json({
        success: true,
        message: 'Message encrypted successfully',
        data: {
          encryptedData: result.encryptedData.toString('base64'),
          iv: result.iv.toString('base64'),
          authTag: result.authTag.toString('base64')
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async decryptMessage(req, res) {
    try {
      const { encryptedData, iv, authTag, key } = req.body;
      
      if (!encryptedData || !iv || !authTag) {
        return res.status(400).json({
          success: false,
          message: 'Encrypted data, IV, and authTag are required'
        });
      }

      const encryptionKey = key ? Buffer.from(key, 'hex') : null;
      const dataBuffer = Buffer.from(encryptedData, 'base64');
      const ivBuffer = Buffer.from(iv, 'base64');
      const authTagBuffer = Buffer.from(authTag, 'base64');
      
      const decrypted = encryptionService.decryptMessage(
        dataBuffer,
        ivBuffer,
        authTagBuffer,
        encryptionKey
      );
      
      res.json({
        success: true,
        message: 'Message decrypted successfully',
        data: { decrypted }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async generateKey(req, res) {
    try {
      const key = encryptionService.generateKey();
      res.json({
        success: true,
        message: 'Key generated successfully',
        data: {
          key: key.toString('hex'),
          length: key.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async status(req, res) {
    try {
      const hasKey = !!process.env.ENCRYPTION_KEY;
      const testResult = encryptionService.testEncryption();
      
      res.json({
        success: true,
        data: {
          algorithm: encryptionService.algorithm,
          keyLength: encryptionService.keyLength,
          ivLength: encryptionService.ivLength,
          hasEncryptionKey: hasKey,
          testPassed: testResult
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new CryptoController();
