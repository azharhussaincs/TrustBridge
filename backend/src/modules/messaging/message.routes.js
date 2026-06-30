const express = require('express');
const router = express.Router();
const messageController = require('./message.controller');
const authMiddleware = require('../auth/auth.middleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Get messages between users
router.get('/', messageController.getMessages);

// Send message (REST fallback when WebSocket is unavailable)
router.post('/', messageController.sendMessage);

// Get unread count
router.get('/unread/count', messageController.getUnreadCount);

// Get conversations
router.get('/conversations', messageController.getConversations);

// Mark message as read
router.put('/:messageId/read', messageController.markAsRead);

module.exports = router;
