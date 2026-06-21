import api from './client';

export const chatApi = {
  // Get messages between two users
  getMessages: (userId, limit = 50, offset = 0) => {
    return api.get(`/messages?userId=${userId}&limit=${limit}&offset=${offset}`);
  },

  // Get unread message count
  getUnreadCount: () => {
    return api.get('/messages/unread/count');
  },

  // Get recent conversations
  getConversations: () => {
    return api.get('/messages/conversations');
  },

  // Mark message as read
  markAsRead: (messageId) => {
    return api.put(`/messages/${messageId}/read`);
  },

  // Send message (via REST API fallback)
  sendMessage: (receiverId, content, isEncrypted = true) => {
    return api.post('/messages', { receiverId, content, isEncrypted });
  }
};
