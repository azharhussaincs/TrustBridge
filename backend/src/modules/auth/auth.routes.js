const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', authController.verify);

module.exports = router;
