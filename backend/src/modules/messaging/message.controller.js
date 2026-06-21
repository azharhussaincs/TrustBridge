const messageService = require('./message.service');

class MessageController {
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

  async getUnreadCount(req, res) {
    try {
      const count = await messageService.getUnreadCount(req.user.id);
      res.json({
        success: true,
        data: { unreadCount: count }
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
