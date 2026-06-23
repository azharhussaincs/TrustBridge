import { io } from 'socket.io-client';
import { getWebSocketUrl } from '@/lib/api/config';

let socket = null;
let listeners = [];

export const initializeSocket = (token, userId) => {
  if (socket) {
    return socket;
  }

  socket = io(getWebSocketUrl(), {
    auth: {
      token: token
    },
    transports: ['websocket'],
    autoConnect: true
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected');
    socket.emit('register-user', userId);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized. Call initializeSocket first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const addMessageListener = (callback) => {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
};

export const emitMessage = (event, data) => {
  if (socket) {
    socket.emit(event, data);
  }
};
