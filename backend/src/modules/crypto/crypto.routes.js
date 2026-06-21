const express = require('express');
const router = express.Router();
const cryptoController = require('./crypto.controller');
const authMiddleware = require('../auth/auth.middleware');

// All crypto routes require authentication
router.use(authMiddleware.authenticate);

// Test encryption
router.get('/test', cryptoController.test);

// Get encryption status
router.get('/status', cryptoController.status);

// Generate a new key
router.post('/generate-key', cryptoController.generateKey);

// Encrypt a message
router.post('/encrypt', cryptoController.encryptMessage);

// Decrypt a message
router.post('/decrypt', cryptoController.decryptMessage);

module.exports = router;
