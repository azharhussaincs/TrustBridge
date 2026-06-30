const messageService = require('./message.service');
const prisma = require('../../config/database');
const { canUsersChat } = require('../../services/permission.service');

function isUserSocketOnline(io, userId) {
  const room = io?.sockets?.adapter?.rooms?.get(userId);
  return Boolean(room && room.size > 0);
}

class MessageController {
  async sendMessage(req, res) {
    try {
      const { receiverId, content, isEncrypted, fileId } = req.body;
      const sender = req.user;

      if (!receiverId || !content?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Receiver and message content are required',
        });
      }

      const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
      if (!receiver) {
        return res.status(404).json({
          success: false,
          message: 'Receiver not found',
        });
      }

      if (!canUsersChat(sender, receiver)) {
        return res.status(403).json({
          success: false,
          message: 'You are not allowed to message this user',
        });
      }

      const message = await messageService.createMessage(
        sender.id,
        receiverId,
        content,
        isEncrypted !== false,
        fileId || null
      );

      const io = req.app.get('io');
      if (io && isUserSocketOnline(io, receiverId)) {
        io.to(receiverId).emit('new-message', message);
      }

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getMessages(req, res) {
    try {
      const { userId, limit, offset } = req.query;
      const currentUserId = req.user.id;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }
      
      const messages = await messageService.getMessagesBetweenUsers(
        currentUserId,
        userId,
        parseInt(limit) || 50,
        parseInt(offset) || 0
      );
      
      res.json({
        success: true,
        data: messages
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getRecentMessages(req, res) {
    try {
      const limit = parseInt(req.query.limit, 10) || 30;
      const messages = await messageService.getRecentMessages(req.user.id, limit);
      res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getConversationPreviews(req, res) {
    try {
      const previews = await messageService.getConversationPreviews(req.user.id);
      res.json({
        success: true,
        data: previews,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getUnreadCount(req, res) {
    try {
      const summary = await messageService.getUnreadSummary(req.user.id);
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async markAsRead(req, res) {
    try {
      const { messageId } = req.params;
      await messageService.markAsRead(messageId);
      res.json({
        success: true,
        message: 'Message marked as read'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getConversations(req, res) {
    try {
      const conversations = await messageService.getRecentConversations(req.user.id);
      res.json({
        success: true,
        data: conversations
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new MessageController();
