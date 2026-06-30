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

async function fetchRecentMessages(token, limit = 30) {
  const response = await fetch(apiUrl(`/messages/recent?limit=${limit}`), {
    headers: authHeaders(token),
  });
  const data = await response.json();
  if (data.success && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [groupUnreadMessages, setGroupUnreadMessages] = useState({});
  const [groupUnreadCount, setGroupUnreadCount] = useState(0);
  const [messageStatus, setMessageStatus] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [authTick, setAuthTick] = useState(0);
  const connectedAtRef = useRef(0);
  const activeGroupChatRef = useRef(null);
  const seenMessageIdsRef = useRef(new Set());
  const inboxPollReadyRef = useRef(false);

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

  const pollInbox = useCallback(async () => {
    const token = getAuthToken();
    const user = readStoredUser() || {};
    if (!token || !user.id) return;

    try {
      const [summary, recent] = await Promise.all([
        fetchUnreadSummary(token),
        fetchRecentMessages(token, 40),
      ]);

      setUnreadCount(summary.unreadCount);
      setUnreadMessages(summary.bySender);

      for (const message of recent) {
        if (!message?.id || seenMessageIdsRef.current.has(message.id)) continue;
        seenMessageIdsRef.current.add(message.id);

        if (!inboxPollReadyRef.current) continue;

        if (message.receiverId === user.id) {
          const senderName = message.sender?.name || 'Someone';
          const content = message.content || '📎 File shared';
          const preview = typeof content === 'string' ? content.substring(0, 30) : '📎 File';
          toast.success(`💬 ${senderName}: ${preview}${content.length > 30 ? '...' : ''}`);
        }

        window.dispatchEvent(new CustomEvent('new-message', { detail: message }));
      }

      inboxPollReadyRef.current = true;
    } catch (error) {
      console.error('Failed to poll inbox:', error);
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
    if (!token || !user.id) return undefined;

    inboxPollReadyRef.current = false;
    seenMessageIdsRef.current = new Set();
    pollInbox();
    const intervalId = setInterval(pollInbox, 5000);
    return () => clearInterval(intervalId);
  }, [authTick, pollInbox]);

  useEffect(() => {
    const token = getAuthToken();
    const user = readStoredUser() || {};

    if (!token || !user.id) {
      setSocket(null);
      setIsConnected(false);
      setUnreadCount(0);
      setUnreadMessages({});
      setGroupUnreadMessages({});
      setGroupUnreadCount(0);
      return;
    }

    const newSocket = io(getWebSocketUrl(), {
      auth: { token },
      reconnection: true,
      path: '/socket.io',
      transports: ['polling', 'websocket'],
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      connectedAtRef.current = Date.now();
      setIsConnected(true);
      newSocket.emit('register-user', user.id);
      syncUnreadFromApi();
      pollInbox();
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

      if (message?.id) {
        if (seenMessageIdsRef.current.has(message.id)) {
          window.dispatchEvent(new CustomEvent('new-message', { detail: message }));
          return;
        }
        seenMessageIdsRef.current.add(message.id);
      }

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

    newSocket.on('new-group-message', (message) => {
      const currentUser = readStoredUser() || {};

      if (message.senderId !== currentUser.id) {
        const isViewingGroup = activeGroupChatRef.current === message.groupId;

        if (!isViewingGroup) {
          setGroupUnreadCount((prev) => prev + 1);
          setGroupUnreadMessages((prev) => ({
            ...prev,
            [message.groupId]: (prev[message.groupId] || 0) + 1,
          }));

          const msgTime = message.createdAt ? new Date(message.createdAt).getTime() : Date.now();
          const isLiveMessage = msgTime >= connectedAtRef.current - 5000;

          if (isLiveMessage) {
            const senderName = message.sender?.name || 'Someone';
            const groupName = message.groupName || 'Group';
            const content = message.content || '📎 File shared';
            const preview = typeof content === 'string' ? content.substring(0, 30) : '📎 File';
            toast.success(
              `👥 ${groupName} · ${senderName}: ${preview}${content.length > 30 ? '...' : ''}`
            );
          }
        }
      }

      window.dispatchEvent(new CustomEvent('new-group-message', { detail: message }));
    });

    newSocket.on('group-message-sent', (message) => {
      window.dispatchEvent(new CustomEvent('group-message-sent', { detail: message }));
    });

    newSocket.on('group-message-error', (payload) => {
      window.dispatchEvent(new CustomEvent('group-message-error', { detail: payload }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [authTick, syncUnreadFromApi, pollInbox]);

  const sendMessage = (receiverId, content, isEncrypted = true, fileId = null) => {
    const token = getAuthToken();
    if (!token) {
      window.dispatchEvent(
        new CustomEvent('message-error', { detail: { error: 'Not authenticated' } })
      );
      return;
    }

    fetch(apiUrl('/messages'), {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId,
        content,
        isEncrypted,
        fileId: fileId || null,
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (data.success && data.data) {
          setMessageStatus((prev) => ({ ...prev, [data.data.id]: 'sent' }));
          window.dispatchEvent(new CustomEvent('message-sent', { detail: data.data }));
        } else {
          window.dispatchEvent(
            new CustomEvent('message-error', {
              detail: { error: data.message || 'Failed to send message' },
            })
          );
        }
      })
      .catch((error) => {
        window.dispatchEvent(
          new CustomEvent('message-error', { detail: { error: error.message } })
        );
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
    const token = getAuthToken();
    if (socket?.connected) {
      socket.emit('mark-read', {
        messageId,
        senderId,
        receiverId,
      });
    }
    if (token) {
      fetch(apiUrl(`/messages/${messageId}/read`), {
        method: 'PUT',
        headers: authHeaders(token),
      }).catch((error) => {
        console.error('Failed to mark message as read:', error);
      });
    }
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

  const clearUnreadForGroup = useCallback((groupId) => {
    if (!groupId) return;
    setGroupUnreadMessages((prev) => {
      const cleared = prev[groupId] || 0;
      if (cleared <= 0) return prev;
      setGroupUnreadCount((count) => Math.max(0, count - cleared));
      return { ...prev, [groupId]: 0 };
    });
  }, []);

  const setActiveGroupChatId = useCallback((groupId) => {
    const nextId = groupId || null;
    if (activeGroupChatRef.current === nextId) return;
    activeGroupChatRef.current = nextId;
    if (nextId) {
      clearUnreadForGroup(nextId);
    }
  }, [clearUnreadForGroup]);

  const sendGroupMessage = (groupId, content, fileId = null) => {
    if (!socket) return;
    socket.emit('group-message', { groupId, content, fileId });
  };

  const refreshGroupRooms = () => {
    if (!socket) return;
    socket.emit('join-group-rooms');
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        unreadCount,
        unreadMessages,
        groupUnreadCount,
        groupUnreadMessages,
        totalUnreadCount: unreadCount + groupUnreadCount,
        messageStatus,
        typingUsers,
        sendMessage,
        sendTyping,
        sendGroupMessage,
        refreshGroupRooms,
        markAsRead,
        getUnreadCount,
        clearUnreadForUser,
        clearUnreadForGroup,
        setActiveGroupChatId,
        setUnreadCount,
        syncUnreadFromApi,
        pollInbox,
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
