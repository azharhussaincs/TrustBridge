'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import FileSharing from '@/components/chat/FileSharing';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  read: boolean;
}

// Role-based communication permissions - SRS Compliant
const COMMUNICATION_RULES: Record<string, { canChatWith: string[], description: string }> = {
  'ADMIN': {
    canChatWith: ['ADMIN', 'SUPER_USER', 'TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'],
    description: 'Can chat with everyone (System Admin)'
  },
  'SUPER_USER': {
    canChatWith: ['TEAM_LEAD', 'TEAM_MANAGER'],
    description: 'Can only chat with Team Leads and Team Managers'
  },
  'TEAM_LEAD': {
    canChatWith: ['SUPER_USER', 'TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'],
    description: 'Can chat with Super User, other Team Leads, own Team Managers, and own Team Members'
  },
  'TEAM_MANAGER': {
    canChatWith: ['SUPER_USER', 'TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'],
    description: 'Can chat with Super User, Team Lead, other Team Managers, and Team Members'
  },
  'TEAM_MEMBER': {
    canChatWith: ['SUPER_USER', 'TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'],
    description: 'Can chat with Super User, Team Lead, Team Manager, and other Team Members'
  }
};

export default function ChatPage() {
  const router = useRouter();
  const { onlineUsers, sendMessage, isConnected, unreadCount, markAsRead, getUnreadCount } = useSocket();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userUnreadCounts, setUserUnreadCounts] = useState<Record<string, number>>({});
  const [showFileShare, setShowFileShare] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(userData);
    
    if (userData.id) {
      fetchUsers(token, userData);
      if (getUnreadCount) {
        getUnreadCount(userData.id);
      }
    }
    
    setIsLoading(false);
  }, []);

  // Listen for new messages via custom event
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const newMessage = event.detail;
      
      if (selectedUser && newMessage.senderId === selectedUser.id) {
        setMessages(prev => [...prev, newMessage]);
        if (currentUser && selectedUser) {
          markAsRead(newMessage.id, newMessage.senderId, currentUser.id);
        }
      } else {
        setUserUnreadCounts(prev => ({
          ...prev,
          [newMessage.senderId]: (prev[newMessage.senderId] || 0) + 1
        }));
      }
    };

    window.addEventListener('new-message', handleNewMessage as EventListener);
    return () => {
      window.removeEventListener('new-message', handleNewMessage as EventListener);
    };
  }, [selectedUser, currentUser]);

  useEffect(() => {
    if (selectedUser && currentUser) {
      loadMessages(selectedUser.id);
      setUserUnreadCounts(prev => ({
        ...prev,
        [selectedUser.id]: 0
      }));
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUsers = async (token: string, userData: any) => {
    try {
      setIsRefreshing(true);
      setError('');
      
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const allowedRoles = COMMUNICATION_RULES[userData.role]?.canChatWith || [];
        
        const filtered = data.data.filter((u: User) => {
          if (u.id === userData.id) return false;
          return allowedRoles.includes(u.role);
        });
        
        setFilteredUsers(filtered);
      } else {
        setError(data.message || 'Failed to fetch users');
      }
    } catch (error: any) {
      setError('Error connecting to server.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadMessages = async (userId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`http://localhost:5000/api/messages?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setMessages(data.data || []);
        
        const unreadMessages = data.data.filter(
          (msg: Message) => msg.senderId === userId && !msg.read
        );
        
        for (const msg of unreadMessages) {
          markAsRead(msg.id, userId, currentUser.id);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser) return;
    
    sendMessage(selectedUser.id, message);
    
    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      senderId: currentUser.id,
      receiverId: selectedUser.id,
      createdAt: new Date().toISOString(),
      read: false
    };
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
  };

  const handleRefresh = () => {
    const token = localStorage.getItem('auth_token');
    if (token && currentUser) {
      fetchUsers(token, currentUser);
      if (selectedUser) {
        loadMessages(selectedUser.id);
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid #2563eb', 
            borderTop: '4px solid transparent', 
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading chat...</p>
        </div>
      </div>
    );
  }

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      'ADMIN': 'Admin',
      'SUPER_USER': 'Super User',
      'TEAM_LEAD': 'Team Lead',
      'TEAM_MANAGER': 'Team Manager',
      'TEAM_MEMBER': 'Team Member'
    };
    return roleMap[role] || role;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUnreadForUser = (userId: string) => {
    return userUnreadCounts[userId] || 0;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <nav style={{ backgroundColor: 'white', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', height: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
                💬 TrustBridge Chat
                {isConnected && (
                  <span style={{ fontSize: '12px', color: '#22c55e', marginLeft: '8px' }}>● Online</span>
                )}
                {unreadCount > 0 && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: 'white', 
                    backgroundColor: '#ef4444',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    marginLeft: '8px'
                  }}>
                    {unreadCount} new
                  </span>
                )}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => {
                  if (currentUser?.role === 'ADMIN') router.push('/admin');
                  else if (currentUser?.role === 'SUPER_USER') router.push('/super-user');
                  else if (currentUser?.role === 'TEAM_LEAD') router.push('/team-lead');
                  else router.push('/dashboard');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('user');
                  router.push('/login');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ 
          backgroundColor: '#fef3c7', 
          padding: '12px 16px', 
          borderRadius: '8px', 
          marginBottom: '16px',
          border: '1px solid #f59e0b'
        }}>
          <p style={{ color: '#92400e', fontSize: '14px' }}>
            🔒 <strong>Your Chat Permissions:</strong> {COMMUNICATION_RULES[currentUser?.role]?.description || 'Chat permissions apply'}
          </p>
          <p style={{ color: '#92400e', fontSize: '12px', marginTop: '4px' }}>
            📨 Messages are delivered even when the recipient is offline
          </p>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#fee2e2', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            color: '#991b1b'
          }}>
            ⚠️ {error}
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)', minHeight: '500px' }}>
          {/* Users List */}
          <div style={{ borderRight: '1px solid #e5e7eb', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontWeight: '600', color: '#111827' }}>
                Users ({filteredUsers.length})
              </h3>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  opacity: isRefreshing ? 0.5 : 1
                }}
              >
                {isRefreshing ? '⏳' : '🔄'} Refresh
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredUsers.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>No users available</p>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedUser?.id === u.id ? '#eff6ff' : 'transparent',
                      border: selectedUser?.id === u.id ? '1px solid #bfdbfe' : '1px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '500', color: '#111827' }}>{u.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{u.email}</div>
                      <div style={{ 
                        fontSize: '10px', 
                        color: '#6b7280', 
                        backgroundColor: '#e5e7eb', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        display: 'inline-block', 
                        marginTop: '2px' 
                      }}>
                        {getRoleDisplay(u.role)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getUnreadForUser(u.id) > 0 && (
                        <span style={{ 
                          fontSize: '10px', 
                          color: 'white', 
                          backgroundColor: '#ef4444',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          minWidth: '18px',
                          textAlign: 'center'
                        }}>
                          {getUnreadForUser(u.id)}
                        </span>
                      )}
                      {onlineUsers.includes(u.id) && (
                        <span style={{ 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          backgroundColor: '#22c55e',
                          display: 'inline-block'
                        }}></span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '16px' }}>
            {selectedUser ? (
              <>
                <div style={{ 
                  borderBottom: '1px solid #e5e7eb', 
                  paddingBottom: '12px', 
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h3 style={{ fontWeight: '600', color: '#111827' }}>{selectedUser.name}</h3>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>{selectedUser.email}</p>
                    <span style={{ 
                      fontSize: '10px', 
                      color: '#6b7280', 
                      backgroundColor: '#e5e7eb', 
                      padding: '2px 6px', 
                      borderRadius: '4px' 
                    }}>
                      {getRoleDisplay(selectedUser.role)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* FILE SHARING BUTTON - NOW VISIBLE */}
                    <button
                      onClick={() => setShowFileShare(!showFileShare)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: showFileShare ? '#ef4444' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {showFileShare ? '❌ Close' : '📎 File'}
                    </button>
                    {onlineUsers.includes(selectedUser.id) ? (
                      <span style={{ fontSize: '12px', color: '#22c55e' }}>● Online</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>● Offline</span>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, minHeight: '300px', maxHeight: '400px', overflowY: 'auto', marginBottom: '16px', padding: '8px' }}>
                  {messages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '100px' }}>
                      💬 Send a message to start chatting!
                    </p>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.senderId === currentUser?.id;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            justifyContent: isOwn ? 'flex-end' : 'flex-start',
                            marginBottom: '8px'
                          }}
                        >
                          <div
                            style={{
                              maxWidth: '70%',
                              padding: '8px 12px',
                              borderRadius: '12px',
                              backgroundColor: isOwn ? '#2563eb' : '#f3f4f6',
                              color: isOwn ? 'white' : '#111827',
                              wordWrap: 'break-word'
                            }}
                          >
                            <p style={{ margin: 0, fontSize: '14px' }}>{msg.content}</p>
                            <p style={{ 
                              margin: 0, 
                              fontSize: '10px', 
                              color: isOwn ? '#93c5fd' : '#6b7280',
                              marginTop: '2px',
                              textAlign: 'right'
                            }}>
                              {formatTime(msg.createdAt)}
                              {!isOwn && msg.read && ' ✓✓'}
                              {!isOwn && !msg.read && ' ✓'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* FILE SHARING COMPONENT - NOW VISIBLE */}
                {showFileShare && (
                  <FileSharing receiverId={selectedUser.id} currentUser={currentUser} />
                )}

                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      opacity: message.trim() ? 1 : 0.5
                    }}
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: '#6b7280'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                <p>Select a user to start chatting</p>
                {filteredUsers.length > 0 && (
                  <p style={{ fontSize: '14px', marginTop: '8px' }}>
                    {filteredUsers.length} users available
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
