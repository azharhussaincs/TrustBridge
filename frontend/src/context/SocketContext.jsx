'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
      return;
    }

    const newSocket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:5000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
      newSocket.emit('register-user', user.id);
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

    newSocket.on('new-message', (message) => {
      console.log('📩 New message:', message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const sendMessage = (receiverId, content, isEncrypted = true) => {
    if (!socket) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    socket.emit('private-message', {
      senderId: user.id,
      receiverId,
      content,
      isEncrypted
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

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      onlineUsers,
      sendMessage,
      sendTyping
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
