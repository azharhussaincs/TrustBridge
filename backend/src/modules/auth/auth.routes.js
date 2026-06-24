const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const authMiddleware = require('./auth.middleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', authMiddleware.authenticate, (req, res) => {
  const { password, ...safeUser } = req.user;
  res.json({
    success: true,
    data: {
      id: safeUser.id,
      username: safeUser.username,
      name: safeUser.name,
      role: safeUser.role,
      teamId: safeUser.teamId,
    },
  });
});

module.exports = router;
