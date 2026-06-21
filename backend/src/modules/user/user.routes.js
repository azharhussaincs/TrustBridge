const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const authMiddleware = require('../auth/auth.middleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// GET routes (view users)
router.get('/', userController.getUsers);
router.get('/role/:role', userController.getUsersByRole);
router.get('/team/:teamId', userController.getTeamMembers);
router.get('/:id', userController.getUserById);

// POST, PUT, DELETE routes (modify users)
router.post('/', authMiddleware.authorize(['ADMIN', 'TEAM_LEAD']), userController.createUser);
router.put('/:id', authMiddleware.authorize(['ADMIN', 'TEAM_LEAD']), userController.updateUser);
router.delete('/:id', authMiddleware.authorize(['ADMIN', 'TEAM_LEAD']), userController.deleteUser);

module.exports = router;
