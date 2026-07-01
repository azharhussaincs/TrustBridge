'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { apiUrl, authHeaders, getWebSocketUrl } from '@/lib/api/config';
import { notifyIncomingChatMessage, notifyIncomingGroupMessage } from '@/lib/chat/notifications';
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

async function fetchRecentGroupMessages(token, limit = 40) {
  const response = await fetch(apiUrl(`/groups/inbox/recent?limit=${limit}`), {
    headers: authHeaders(token),
  });
  const data = await response.json();
  if (data.success && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
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
  const seenGroupMessageIdsRef = useRef(new Set());
  const inboxPollReadyRef = useRef(false);
  const groupInboxPollReadyRef = useRef(false);
  const activeDirectChatUserIdRef = useRef(null);
  const socketRef = useRef(null);

  const setActiveDirectChatUserId = useCallback((userId) => {
    activeDirectChatUserIdRef.current = userId || null;
  }, []);

  const shouldNotifyIncoming = useCallback((message) => {
    const user = readStoredUser() || {};
    if (!user.id || message.receiverId !== user.id) return false;
    if (message.senderId === activeDirectChatUserIdRef.current) return false;
    return true;
  }, []);

  const handleIncomingMessage = useCallback((message, { notify = false, bumpUnread = false } = {}) => {
    if (!message?.id) return;

    if (seenMessageIdsRef.current.has(message.id)) {
      window.dispatchEvent(new CustomEvent('new-message', { detail: message }));
      return;
    }
    seenMessageIdsRef.current.add(message.id);

    const user = readStoredUser() || {};
    if (bumpUnread && message.receiverId === user.id) {
      setUnreadCount((prev) => prev + 1);
      setUnreadMessages((prev) => ({
        ...prev,
        [message.senderId]: (prev[message.senderId] || 0) + 1,
      }));
    }

    if (notify && inboxPollReadyRef.current && shouldNotifyIncoming(message)) {
      const senderName = message.sender?.name || 'Someone';
      notifyIncomingChatMessage(message, senderName);
      window.dispatchEvent(
        new CustomEvent('chat-incoming-alert', {
          detail: { message, senderName },
        })
      );
    }

    window.dispatchEvent(new CustomEvent('new-message', { detail: message }));
  }, [shouldNotifyIncoming]);

  const shouldNotifyGroupIncoming = useCallback((message) => {
    const user = readStoredUser() || {};
    if (!user.id || message.senderId === user.id) return false;
    if (activeGroupChatRef.current === message.groupId) return false;
    return true;
  }, []);

  const handleIncomingGroupMessage = useCallback((message, { notify = false, bumpUnread = false } = {}) => {
    if (!message?.id) return;

    if (seenGroupMessageIdsRef.current.has(message.id)) {
      window.dispatchEvent(new CustomEvent('new-group-message', { detail: message }));
      return;
    }
    seenGroupMessageIdsRef.current.add(message.id);

    const user = readStoredUser() || {};
    const isViewingGroup = activeGroupChatRef.current === message.groupId;

    if (bumpUnread && message.senderId !== user.id && !isViewingGroup) {
      setGroupUnreadCount((prev) => prev + 1);
      setGroupUnreadMessages((prev) => ({
        ...prev,
        [message.groupId]: (prev[message.groupId] || 0) + 1,
      }));
    }

    if (notify && shouldNotifyGroupIncoming(message)) {
      const senderName = message.sender?.name || 'Someone';
      const groupName = message.groupName || 'Group';
      notifyIncomingGroupMessage(message, senderName, groupName);
      window.dispatchEvent(
        new CustomEvent('group-incoming-alert', {
          detail: { message, senderName, groupName },
        })
      );
    }

    window.dispatchEvent(new CustomEvent('new-group-message', { detail: message }));
  }, [shouldNotifyGroupIncoming]);

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
        handleIncomingMessage(message, { notify: true });
      }

      inboxPollReadyRef.current = true;
    } catch (error) {
      console.error('Failed to poll inbox:', error);
    }
  }, [handleIncomingMessage]);

  const pollGroupInbox = useCallback(async () => {
    const token = getAuthToken();
    const user = readStoredUser() || {};
    if (!token || !user.id) return;

    if (socketRef.current?.connected) {
      socketRef.current.emit('join-group-rooms');
    }

    try {
      const recent = await fetchRecentGroupMessages(token, 40);

      if (!groupInboxPollReadyRef.current) {
        for (const message of recent) {
          if (message?.id) seenGroupMessageIdsRef.current.add(message.id);
        }
        groupInboxPollReadyRef.current = true;
        return;
      }

      for (const message of recent) {
        if (!message?.id || seenGroupMessageIdsRef.current.has(message.id)) continue;
        handleIncomingGroupMessage(message, { notify: true, bumpUnread: true });
      }
    } catch (error) {
      console.error('Failed to poll group inbox:', error);
    }
  }, [handleIncomingGroupMessage]);

  const pollInboxAll = useCallback(async () => {
    await Promise.all([pollInbox(), pollGroupInbox()]);
  }, [pollInbox, pollGroupInbox]);

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
    groupInboxPollReadyRef.current = false;
    seenMessageIdsRef.current = new Set();
    seenGroupMessageIdsRef.current = new Set();
    pollInboxAll();
    const intervalId = setInterval(pollInboxAll, 5000);
    return () => clearInterval(intervalId);
  }, [authTick, pollInboxAll]);

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
      newSocket.emit('join-group-rooms');
      syncUnreadFromApi();
      pollInboxAll();
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
      handleIncomingMessage(message, { notify: true, bumpUnread: true });
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
      handleIncomingGroupMessage(message, { notify: true, bumpUnread: true });
    });

    newSocket.on('group-message-sent', (message) => {
      window.dispatchEvent(new CustomEvent('group-message-sent', { detail: message }));
    });

    newSocket.on('group-message-error', (payload) => {
      window.dispatchEvent(new CustomEvent('group-message-error', { detail: payload }));
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      socketRef.current = null;
      newSocket.disconnect();
    };
  }, [authTick, syncUnreadFromApi, pollInboxAll, handleIncomingMessage, handleIncomingGroupMessage]);

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
    const token = getAuthToken();
    if (!token) {
      window.dispatchEvent(
        new CustomEvent('group-message-error', { detail: { error: 'Not authenticated' } })
      );
      return;
    }

    fetch(apiUrl(`/groups/${groupId}/messages`), {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, fileId: fileId || null }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (data.success && data.data) {
          window.dispatchEvent(new CustomEvent('group-message-sent', { detail: data.data }));
        } else {
          window.dispatchEvent(
            new CustomEvent('group-message-error', {
              detail: { error: data.message || 'Failed to send group message' },
            })
          );
        }
      })
      .catch((error) => {
        window.dispatchEvent(
          new CustomEvent('group-message-error', { detail: { error: error.message } })
        );
      });
  };

  const refreshGroupRooms = useCallback(() => {
    if (!socket) return;
    socket.emit('join-group-rooms');
  }, [socket]);

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
        setActiveDirectChatUserId,
        syncUnreadFromApi,
        pollInbox,
        pollGroupInbox,
        pollInboxAll,
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
