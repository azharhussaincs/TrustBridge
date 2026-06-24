const prisma = require('../../config/database');

class MessageService {
  async createMessage(senderId, receiverId, content, isEncrypted = true) {
    return await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        isEncrypted
      }
    });
  }

  async getMessagesBetweenUsers(user1Id, user2Id, limit = 50, offset = 0) {
    return await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user1Id, receiverId: user2Id },
          { senderId: user2Id, receiverId: user1Id }
        ]
      },
      orderBy: { createdAt: 'asc' },
      skip: offset,
      take: limit
    });
  }

  async markAsRead(messageId) {
    return await prisma.message.update({
      where: { id: messageId },
      data: { read: true, readAt: new Date() }
    });
  }

  async markAllAsRead(senderId, receiverId) {
    return await prisma.message.updateMany({
      where: {
        senderId: senderId,
        receiverId: receiverId,
        read: false
      },
      data: { read: true, readAt: new Date() }
    });
  }

  async getUnreadCount(userId) {
    return await prisma.message.count({
      where: {
        receiverId: userId,
        read: false
      }
    });
  }

  async getUnreadSummary(userId) {
    const unread = await prisma.message.findMany({
      where: { receiverId: userId, read: false },
      select: { senderId: true }
    });

    const bySender = {};
    unread.forEach((msg) => {
      bySender[msg.senderId] = (bySender[msg.senderId] || 0) + 1;
    });

    return {
      unreadCount: unread.length,
      bySender
    };
  }

  async getRecentConversations(userId) {
    // Get distinct users the current user has chatted with
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    
    // Get unique user IDs
    const userIds = new Set();
    messages.forEach(msg => {
      if (msg.senderId !== userId) userIds.add(msg.senderId);
      if (msg.receiverId !== userId) userIds.add(msg.receiverId);
    });
    
    // Get user details
    const users = await prisma.user.findMany({
      where: {
        id: { in: Array.from(userIds) }
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isOnline: true
      }
    });
    
    return users;
  }
}

module.exports = new MessageService();
