'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [messageStatus, setMessageStatus] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
      return;
    }

    const newSocket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://192.168.18.139:5000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
      newSocket.emit('register-user', user.id);
      newSocket.emit('get-unread-count', user.id);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('user-online', ({ userId }) => {
      console.log('👤 User online:', userId);
      setOnlineUsers(prev => {
        if (!prev.includes(userId)) {
          return [...prev, userId];
        }
        return prev;
      });
    });

    newSocket.on('user-offline', ({ userId }) => {
      console.log('👤 User offline:', userId);
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    // Handle new messages with notification
    newSocket.on('new-message', (message) => {
      console.log('📩 New message received:', message);
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Update unread count
      if (message.receiverId === user.id) {
        setUnreadCount(prev => prev + 1);
        setUnreadMessages(prev => ({
          ...prev,
          [message.senderId]: (prev[message.senderId] || 0) + 1
        }));
        
        // Show toast notification
        const senderName = message.sender?.name || 'Someone';
        const content = message.content || '📎 File shared';
        toast.success(`💬 ${senderName}: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`);
      }
      
      // Trigger event for chat page
      window.dispatchEvent(new CustomEvent('new-message', { detail: message }));
    });

    // Handle message sent confirmation
    newSocket.on('message-sent', (message) => {
      console.log('✅ Message sent:', message);
      setMessageStatus(prev => ({
        ...prev,
        [message.id]: 'sent'
      }));
    });

    // Handle message delivered (read)
    newSocket.on('message-read', ({ messageId, receiverId }) => {
      console.log('📖 Message read:', messageId);
      setMessageStatus(prev => ({
        ...prev,
        [messageId]: 'read'
      }));
    });

    // Handle message saved for offline
    newSocket.on('message-saved', ({ messageId, receiverId, status }) => {
      console.log('💾 Message saved for offline delivery:', messageId);
      setMessageStatus(prev => ({
        ...prev,
        [messageId]: 'saved'
      }));
    });

    // Handle unread count
    newSocket.on('unread-count', ({ count }) => {
      setUnreadCount(count);
    });

    setSocket(newSocket);

    // Get initial unread count
    setTimeout(() => {
      if (newSocket && user.id) {
        newSocket.emit('get-unread-count', user.id);
      }
    }, 1000);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const sendMessage = (receiverId, content, isEncrypted = true, fileId = null) => {
    if (!socket) {
      console.warn('Socket not connected');
      return;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    socket.emit('private-message', {
      senderId: user.id,
      receiverId,
      content,
      isEncrypted,
      fileId: fileId || null
    });
  };

  const sendTyping = (receiverId, isTyping) => {
    if (!socket) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    socket.emit('typing', {
      senderId: user.id,
      receiverId,
      isTyping
    });
  };

  const markAsRead = (messageId, senderId, receiverId) => {
    if (!socket) return;
    socket.emit('mark-read', {
      messageId,
      senderId,
      receiverId
    });
    setUnreadMessages(prev => ({
      ...prev,
      [senderId]: 0
    }));
  };

  const getUnreadCount = (userId) => {
    if (!socket) return;
    socket.emit('get-unread-count', userId);
  };

  const clearUnreadForUser = (userId) => {
    setUnreadMessages(prev => ({
      ...prev,
      [userId]: 0
    }));
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      onlineUsers,
      unreadCount,
      unreadMessages,
      messageStatus,
      sendMessage,
      sendTyping,
      markAsRead,
      getUnreadCount,
      clearUnreadForUser,
      setUnreadCount
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
