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
  teamId: string | null;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  fileId: string | null;
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
    description: 'Can chat with Super User, own Team Lead, own Team Manager, and own Team Members'
  }
};

export default function ChatPage() {
  const router = useRouter();
  const { onlineUsers, sendMessage, isConnected, unreadCount, unreadMessages, markAsRead, getUnreadCount, clearUnreadForUser } = useSocket();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const newMessage = event.detail;
      
      if (selectedUser && newMessage.senderId === selectedUser.id) {
        setMessages(prev => [...prev, newMessage]);
        if (currentUser && selectedUser) {
          markAsRead(newMessage.id, newMessage.senderId, currentUser.id);
          clearUnreadForUser(selectedUser.id);
        }
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
      clearUnreadForUser(selectedUser.id);
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
      
      const response = await fetch('http://192.168.18.139:5000/api/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setAllUsers(data.data);
        
        const allowedRoles = COMMUNICATION_RULES[userData.role]?.canChatWith || [];
        
        // Filter users based on communication permissions
        const filtered = data.data.filter((u: User) => {
          // Exclude current user
          if (u.id === userData.id) return false;
          
          // Check if user's role is allowed
          if (!allowedRoles.includes(u.role)) return false;
          
          // For Team Members: Only allow same team (except Super User)
          if (userData.role === 'TEAM_MEMBER') {
            // Super User is allowed for everyone
            if (u.role === 'SUPER_USER') return true;
            // Team Lead, Team Manager, Team Member must be from same team
            if (u.role === 'TEAM_LEAD' || u.role === 'TEAM_MANAGER' || u.role === 'TEAM_MEMBER') {
              return u.teamId === userData.teamId;
            }
          }
          
          // For Team Manager: Allow Super User, Team Lead, other Managers, Team Members
          if (userData.role === 'TEAM_MANAGER') {
            if (u.role === 'SUPER_USER') return true;
            if (u.role === 'TEAM_LEAD') return u.teamId === userData.teamId;
            if (u.role === 'TEAM_MANAGER') return true;
            if (u.role === 'TEAM_MEMBER') return u.teamId === userData.teamId;
          }
          
          // For Team Lead: Allow Super User, other Team Leads, own Team Managers, own Team Members
          if (userData.role === 'TEAM_LEAD') {
            if (u.role === 'SUPER_USER') return true;
            if (u.role === 'TEAM_LEAD') return true;
            if (u.role === 'TEAM_MANAGER' || u.role === 'TEAM_MEMBER') {
              return u.teamId === userData.teamId;
            }
          }
          
          // For Super User: Allow all Team Leads and Team Managers
          if (userData.role === 'SUPER_USER') {
            if (u.role === 'TEAM_LEAD' || u.role === 'TEAM_MANAGER') return true;
            return false;
          }
          
          return true;
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

      const response = await fetch(`http://192.168.18.139:5000/api/messages?userId=${userId}`, {
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
        clearUnreadForUser(userId);
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
      fileId: null,
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

  const handleDownloadFile = async (fileId: string, filename: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Please login again');
        return;
      }

      const response = await fetch(`http://192.168.18.139:5000/api/files/download/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download file: ${error.message}`);
    }
  };

  const extractFileName = (content: string) => {
    const match = content.match(/📎 (.*?) \(/);
    return match ? match[1] : 'file';
  };

  const extractFileSize = (content: string) => {
    const match = content.match(/\((.*?)\)/);
    return match ? match[1] : '';
  };

  const isFileMessage = (msg: Message) => {
    return msg.fileId !== null && msg.fileId !== undefined && msg.fileId !== '';
  };

  // Check if a user is from the same team
  const isSameTeam = (user: User) => {
    return currentUser?.teamId && user.teamId === currentUser.teamId;
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
    return unreadMessages[userId] || 0;
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
            {currentUser?.role === 'TEAM_MEMBER' && currentUser?.teamId && (
              <span style={{ display: 'block', fontSize: '12px', marginTop: '4px' }}>
                👥 You can chat with your Team Lead, Team Manager, and other Team Members from your team.
              </span>
            )}
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
                filteredUsers.map((u) => {
                  const isSameTeamUser = isSameTeam(u);
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        clearUnreadForUser(u.id);
                      }}
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
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          {u.name}
                          {isSameTeamUser && currentUser?.role === 'TEAM_MEMBER' && (
                            <span style={{ 
                              marginLeft: '6px', 
                              fontSize: '9px', 
                              color: '#10b981',
                              backgroundColor: '#d1fae5',
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}>
                              Same Team
                            </span>
                          )}
                        </div>
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
                            fontSize: '11px', 
                            color: 'white', 
                            backgroundColor: '#22c55e',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            minWidth: '18px',
                            textAlign: 'center',
                            fontWeight: 'bold'
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
                  );
                })
              )}
            </div>
          </div>

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
                    {currentUser?.role === 'TEAM_MEMBER' && isSameTeam(selectedUser) && (
                      <span style={{ 
                        marginLeft: '6px', 
                        fontSize: '9px', 
                        color: '#10b981',
                        backgroundColor: '#d1fae5',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}>
                        Same Team
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    {getUnreadForUser(selectedUser.id) > 0 && (
                      <span style={{ 
                        fontSize: '11px', 
                        color: 'white', 
                        backgroundColor: '#22c55e',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 'bold'
                      }}>
                        {getUnreadForUser(selectedUser.id)} new
                      </span>
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
                      const isFile = isFileMessage(msg);
                      
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
                            {isFile ? (
                              <div>
                                <div style={{ fontSize: '14px' }}>📎 {extractFileName(msg.content)}</div>
                                <div style={{ fontSize: '10px', opacity: 0.7 }}>{extractFileSize(msg.content)}</div>
                                <button
                                  onClick={() => handleDownloadFile(msg.fileId!, extractFileName(msg.content))}
                                  style={{
                                    marginTop: '4px',
                                    padding: '2px 10px',
                                    backgroundColor: isOwn ? '#3b82f6' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                  }}
                                >
                                  ⬇️ Download
                                </button>
                              </div>
                            ) : (
                              <p style={{ margin: 0, fontSize: '14px' }}>{msg.content}</p>
                            )}
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
