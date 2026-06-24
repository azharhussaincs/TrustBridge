'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { initializeSocket, getSocket, disconnectSocket } from '@/lib/websocket/socket';
import { chatApi } from '@/lib/api/chat';
import { readStoredUser } from '@/lib/auth/session';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentChatUser, setCurrentChatUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize socket
  const connectSocket = (token, userId) => {
    const newSocket = initializeSocket(token, userId);
    setSocket(newSocket);
    setIsConnected(true);

    // Listen for new messages
    newSocket.on('new-message', (message) => {
      setMessages((prev) => [...prev, message]);
      
      // Update unread count if not in current chat
      if (message.senderId !== currentChatUser?.id) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    // Listen for message sent confirmation
    newSocket.on('message-sent', (message) => {
      console.log('Message sent:', message);
    });

    // Listen for user online status
    newSocket.on('user-online', ({ userId, online }) => {
      setOnlineUsers((prev) => {
        const exists = prev.some(u => u.id === userId);
        if (online && !exists) {
          return [...prev, { id: userId }];
        } else if (!online) {
          return prev.filter(u => u.id !== userId);
        }
        return prev;
      });
    });

    newSocket.on('user-offline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter(u => u.id !== userId));
    });

    // Listen for typing indicators
    newSocket.on('user-typing', ({ senderId, isTyping }) => {
      // Handle typing indicator
      console.log(`${senderId} is ${isTyping ? 'typing...' : 'stopped typing'}`);
    });

    return newSocket;
  };

  // Disconnect socket
  const disconnect = () => {
    disconnectSocket();
    setIsConnected(false);
    setSocket(null);
  };

  // Send message
  const sendMessage = (receiverId, content, isEncrypted = true) => {
    if (!socket) return;
    const user = readStoredUser();
    socket.emit('private-message', {
      senderId: user.id,
      receiverId,
      content,
      isEncrypted
    });
  };

  // Mark message as read
  const markAsRead = async (messageId) => {
    try {
      await chatApi.markAsRead(messageId);
      setMessages((prev) => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Load messages with a user
  const loadMessages = async (userId) => {
    try {
      const response = await chatApi.getMessages(userId);
      setMessages(response.data.data || []);
      setCurrentChatUser(userId);
      
      // Mark messages as read
      const unreadMessages = response.data.data.filter(m => m.senderId === userId && !m.read);
      unreadMessages.forEach(msg => markAsRead(msg.id));
      
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Load conversations
  const loadConversations = async () => {
    try {
      const response = await chatApi.getConversations();
      setConversations(response.data.data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  // Load unread count
  const loadUnreadCount = async () => {
    try {
      const response = await chatApi.getUnreadCount();
      setUnreadCount(response.data.data.unreadCount || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  // Load users (for user list)
  const [users, setUsers] = useState([]);
  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Typing indicator
  const sendTyping = (receiverId, isTyping) => {
    if (!socket) return;
    const user = readStoredUser();
    socket.emit('typing', {
      senderId: user.id,
      receiverId,
      isTyping
    });
  };

  return (
    <ChatContext.Provider value={{
      socket,
      isConnected,
      messages,
      conversations,
      unreadCount,
      currentChatUser,
      onlineUsers,
      users,
      connectSocket,
      disconnect,
      sendMessage,
      loadMessages,
      loadConversations,
      loadUnreadCount,
      loadUsers,
      markAsRead,
      sendTyping,
      setMessages
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
