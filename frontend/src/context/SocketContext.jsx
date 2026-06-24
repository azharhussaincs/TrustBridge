'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { apiUrl, authHeaders, getWebSocketUrl } from '@/lib/api/config';
import { getAuthToken, readStoredUser } from '@/lib/auth/session';

const SocketContext = createContext();

async function fetchUnreadSummary(token) {
  const response = await fetch(apiUrl('/messages/unread/count'), {
    headers: authHeaders(token),
  });
  const data = await response.json();
  if (data.success && data.data) {
    return {
      unreadCount: data.data.unreadCount ?? 0,
      bySender: data.data.bySender ?? {},
    };
  }
  return { unreadCount: 0, bySender: {} };
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [messageStatus, setMessageStatus] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [authTick, setAuthTick] = useState(0);
  const connectedAtRef = useRef(0);

  const syncUnreadFromApi = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const summary = await fetchUnreadSummary(token);
      setUnreadCount(summary.unreadCount);
      setUnreadMessages(summary.bySender);
    } catch (error) {
      console.error('Failed to sync unread messages:', error);
    }
  }, []);

  useEffect(() => {
    const onAuthChange = () => setAuthTick((t) => t + 1);
    window.addEventListener('auth-changed', onAuthChange);
    window.addEventListener('storage', onAuthChange);
    return () => {
      window.removeEventListener('auth-changed', onAuthChange);
      window.removeEventListener('storage', onAuthChange);
    };
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    const user = readStoredUser() || {};

    if (!token || !user.id) {
      setSocket(null);
      setIsConnected(false);
      setUnreadCount(0);
      setUnreadMessages({});
      return;
    }

    const newSocket = io(getWebSocketUrl(), {
      auth: { token },
      reconnection: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      connectedAtRef.current = Date.now();
      setIsConnected(true);
      newSocket.emit('register-user', user.id);
      syncUnreadFromApi();
      newSocket.emit('get-unread-count', user.id);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('user-online', ({ userId }) => {
      setOnlineUsers((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    });

    newSocket.on('user-offline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    newSocket.on('new-message', (message) => {
      const currentUser = readStoredUser() || {};

      if (message.receiverId === currentUser.id) {
        setUnreadCount((prev) => prev + 1);
        setUnreadMessages((prev) => ({
          ...prev,
          [message.senderId]: (prev[message.senderId] || 0) + 1,
        }));

        const msgTime = message.createdAt ? new Date(message.createdAt).getTime() : Date.now();
        const isLiveMessage = msgTime >= connectedAtRef.current - 5000;

        if (isLiveMessage) {
          const senderName = message.sender?.name || 'Someone';
          const content = message.content || '📎 File shared';
          const preview = typeof content === 'string' ? content.substring(0, 30) : '📎 File';
          toast.success(`💬 ${senderName}: ${preview}${content.length > 30 ? '...' : ''}`);
        }
      }

      window.dispatchEvent(new CustomEvent('new-message', { detail: message }));
    });

    newSocket.on('message-sent', (message) => {
      setMessageStatus((prev) => ({ ...prev, [message.id]: 'sent' }));
      window.dispatchEvent(new CustomEvent('message-sent', { detail: message }));
    });

    newSocket.on('message-error', (payload) => {
      window.dispatchEvent(new CustomEvent('message-error', { detail: payload }));
    });

    newSocket.on('message-read', ({ messageId }) => {
      setMessageStatus((prev) => ({ ...prev, [messageId]: 'read' }));
    });

    newSocket.on('message-saved', ({ messageId }) => {
      setMessageStatus((prev) => ({ ...prev, [messageId]: 'saved' }));
    });

    newSocket.on('user-typing', ({ senderId, isTyping }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: isTyping }));
    });

    newSocket.on('unread-count', ({ count, bySender }) => {
      if (typeof count === 'number') {
        setUnreadCount(count);
      }
      if (bySender && typeof bySender === 'object') {
        setUnreadMessages(bySender);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [authTick, syncUnreadFromApi]);

  const sendMessage = (receiverId, content, isEncrypted = true, fileId = null) => {
    if (!socket) {
      console.warn('Socket not connected');
      return;
    }
    const user = readStoredUser() || {};
    socket.emit('private-message', {
      senderId: user.id,
      receiverId,
      content,
      isEncrypted,
      fileId: fileId || null,
    });
  };

  const sendTyping = (receiverId, isTyping) => {
    if (!socket) return;
    const user = readStoredUser() || {};
    socket.emit('typing', {
      senderId: user.id,
      receiverId,
      isTyping,
    });
  };

  const markAsRead = (messageId, senderId, receiverId) => {
    if (!socket) return;
    socket.emit('mark-read', {
      messageId,
      senderId,
      receiverId,
    });
  };

  const getUnreadCount = (userId) => {
    if (!socket) return;
    socket.emit('get-unread-count', userId);
  };

  const clearUnreadForUser = (userId) => {
    setUnreadMessages((prev) => {
      const cleared = prev[userId] || 0;
      if (cleared > 0) {
        setUnreadCount((count) => Math.max(0, count - cleared));
      }
      return { ...prev, [userId]: 0 };
    });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        unreadCount,
        unreadMessages,
        messageStatus,
        typingUsers,
        sendMessage,
        sendTyping,
        markAsRead,
        getUnreadCount,
        clearUnreadForUser,
        setUnreadCount,
        syncUnreadFromApi,
      }}
    >
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
