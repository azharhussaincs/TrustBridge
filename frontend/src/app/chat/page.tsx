'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import FileSharing from '@/components/chat/FileSharing';
import toast from 'react-hot-toast';
import { Navbar, PageContainer } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getRoleLabel } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api/config';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  teamId: string | null;
  lastSeen?: string | null;
  isOnline?: boolean;
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

const COMMUNICATION_RULES: Record<string, { canChatWith: string[], description: string }> = {
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
  const { 
    onlineUsers, 
    sendMessage, 
    sendTyping,
    isConnected, 
    unreadCount, 
    unreadMessages, 
    messageStatus = {},
    typingUsers = {},
    markAsRead, 
    getUnreadCount, 
    clearUnreadForUser,
    syncUnreadFromApi,
  } = useSocket();
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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showFileShare, setShowFileShare] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData.role === 'ADMIN') {
      router.push('/admin');
      return;
    }
    setCurrentUser(userData);
    
    if (userData.id) {
      fetchUsers(token, userData);
      if (getUnreadCount) {
        getUnreadCount(userData.id);
      }
      if (syncUnreadFromApi) {
        syncUnreadFromApi();
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
        toast.success(`💬 New message from ${selectedUser.name}`);
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
      
      const response = await fetch(apiUrl('/users'), {
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
        
        const filtered = data.data.filter((u: User) => {
          if (u.id === userData.id) return false;
          if (!allowedRoles.includes(u.role)) return false;
          
          if (userData.role === 'TEAM_MEMBER') {
            if (u.role === 'SUPER_USER') return true;
            if (u.role === 'TEAM_LEAD' || u.role === 'TEAM_MANAGER' || u.role === 'TEAM_MEMBER') {
              return u.teamId === userData.teamId;
            }
          }
          
          if (userData.role === 'TEAM_MANAGER') {
            if (u.role === 'SUPER_USER') return true;
            if (u.role === 'TEAM_LEAD') return u.teamId === userData.teamId;
            if (u.role === 'TEAM_MANAGER') return true;
            if (u.role === 'TEAM_MEMBER') return u.teamId === userData.teamId;
          }
          
          if (userData.role === 'TEAM_LEAD') {
            if (u.role === 'SUPER_USER') return true;
            if (u.role === 'TEAM_LEAD') return true;
            if (u.role === 'TEAM_MANAGER' || u.role === 'TEAM_MEMBER') {
              return u.teamId === userData.teamId;
            }
          }
          
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

      const response = await fetch(apiUrl(`/messages?userId=${userId}`), {
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

  const handleMessageInput = (value: string) => {
    setMessage(value);
    if (!selectedUser) return;
    sendTyping(selectedUser.id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(selectedUser.id, false);
    }, 2000);
  };

  const formatLastSeen = (lastSeen?: string | null) => {
    if (!lastSeen) return 'Last seen unknown';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 60000) return 'Last seen just now';
    if (diffMs < 3600000) return `Last seen ${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `Last seen ${Math.floor(diffMs / 3600000)}h ago`;
    return `Last seen ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser) return;
    
    const tempId = Date.now().toString();
    const newMessage: Message = {
      id: tempId,
      content: message,
      senderId: currentUser.id,
      receiverId: selectedUser.id,
      fileId: null,
      createdAt: new Date().toISOString(),
      read: false
    };
    setMessages(prev => [...prev, newMessage]);
    
    sendMessage(selectedUser.id, message);
    sendTyping(selectedUser.id, false);
    setMessage('');
    
    toast.success('✅ Message sent!');
  };

  const handleRefresh = () => {
    const token = localStorage.getItem('auth_token');
    if (token && currentUser) {
      fetchUsers(token, currentUser);
      if (selectedUser) {
        loadMessages(selectedUser.id);
      }
    }
    toast.success('🔄 Chat refreshed');
  };

  const handleDownloadFile = async (fileId: string, filename: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login again');
        return;
      }

      const response = await fetch(apiUrl(`/files/download/${fileId}`), {
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
      toast.success(`✅ File "${filename}" downloaded!`);
      
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(`Failed to download file: ${error.message}`);
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

  const isSameTeam = (user: User) => {
    return currentUser?.teamId && user.teamId === currentUser.teamId;
  };

  const getMessageStatus = (msg: Message) => {
    if (msg.senderId !== currentUser?.id) {
      return msg.read ? ' ✓✓' : '';
    }
    if (messageStatus && messageStatus[msg.id]) {
      const status = messageStatus[msg.id];
      if (status === 'read') return ' ✓✓';
      if (status === 'sent') return ' ✓';
    }
    if (msg.senderId === currentUser?.id) {
      return msg.read ? ' ✓✓' : ' ✓';
    }
    return '';
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading chat..." />;
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUnreadForUser = (userId: string) => {
    return unreadMessages[userId] || 0;
  };

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Navbar
        title={
          <span className="flex flex-wrap items-center gap-2">
            💬 TrustBridge Chat
            {isConnected ? (
              <span className="text-xs font-normal text-emerald-600">● Online</span>
            ) : (
              <span className="text-xs font-normal text-red-500">● Offline</span>
            )}
            {unreadCount > 0 && (
              <Badge variant="danger">{unreadCount} new</Badge>
            )}
          </span>
        }
      >
        <Button
          onClick={() => {
            if (currentUser?.role === 'ADMIN') router.push('/admin');
            else if (currentUser?.role === 'SUPER_USER') router.push('/super-user');
            else if (currentUser?.role === 'TEAM_LEAD') router.push('/team-lead');
            else if (currentUser?.role === 'TEAM_MANAGER') router.push('/team-manager');
            else if (currentUser?.role === 'TEAM_MEMBER') router.push('/team-member');
            else router.push('/dashboard');
          }}
          variant="secondary"
          size="sm"
        >
          Dashboard
        </Button>
        <Button
          onClick={() => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('auth-changed'));
            toast.success('👋 Logged out');
            router.push('/login');
          }}
          variant="danger"
          size="sm"
        >
          Logout
        </Button>
      </Navbar>

      <PageContainer className="flex flex-1 flex-col">
        <Alert variant="warning" className="mb-4">
          <strong>Your Chat Permissions:</strong> {COMMUNICATION_RULES[currentUser?.role]?.description || 'Chat permissions apply'}
          {currentUser?.role === 'TEAM_MEMBER' && currentUser?.teamId && (
            <span className="mt-1 block text-xs">
              👥 You can chat with your Team Lead, Team Manager, and other Team Members from your team.
            </span>
          )}
          <span className="mt-1 block text-xs">
            📨 Messages are delivered even when the recipient is offline
          </span>
        </Alert>

        {error && (
          <Alert variant="error" className="mb-4">⚠️ {error}</Alert>
        )}
        
        <div className="card-elevated flex min-h-[500px] flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[300px_1fr] lg:flex-none">
          {/* User sidebar */}
          <div className="sidebar-panel border-b-0 lg:border-r lg:rounded-r-none rounded-b-none m-0 lg:m-0 border-0 lg:border-r border-blue-400/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                Users ({filteredUsers.length})
                {unreadCount > 0 && (
                  <Badge variant="danger" className="text-[10px]">
                    {unreadCount} total new
                  </Badge>
                )}
              </h3>
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                {isRefreshing ? '⏳' : '🔄'} Refresh
              </Button>
            </div>
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto lg:max-h-[calc(100vh-280px)]">
              {filteredUsers.length === 0 ? (
                <EmptyState icon="👥" title="No users available" className="py-8" />
              ) : (
                filteredUsers.map((u) => {
                  const isSameTeamUser = isSameTeam(u);
                  const userUnread = getUnreadForUser(u.id);
                  const isSelected = selectedUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        clearUnreadForUser(u.id);
                      }}
                      className={cn(
                        'chat-sidebar-item',
                        isSelected ? 'chat-sidebar-item-active' : ''
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-medium text-white">
                          <span className="truncate">{u.name}</span>
                          {isSameTeamUser && currentUser?.role === 'TEAM_MEMBER' && (
                            <Badge variant="success" className="text-[9px]">Same Team</Badge>
                          )}
                        </div>
                        <div className="truncate text-xs text-blue-200/70">{u.username}</div>
                        <Badge variant="role" role={u.role} className="mt-1 text-[10px]">
                          {getRoleLabel(u.role)}
                        </Badge>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-1.5">
                        {userUnread > 0 && (
                          <span className="unread-badge">{userUnread}</span>
                        )}
                        {onlineUsers.includes(u.id) && (
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-label="Online" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat panel */}
          <div className="flex flex-1 flex-col p-4">
            {selectedUser ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-blue-400/25 pb-3">
                  <div>
                    <h3 className="font-semibold text-white">{selectedUser.name}</h3>
                    <p className="text-sm text-blue-200/80">@{selectedUser.username}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="role" role={selectedUser.role} className="text-[10px]">
                        {getRoleLabel(selectedUser.role)}
                      </Badge>
                      {currentUser?.role === 'TEAM_MEMBER' && isSameTeam(selectedUser) && (
                        <Badge variant="success" className="text-[9px]">Same Team</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowFileShare(!showFileShare)}
                      size="sm"
                      variant={showFileShare ? 'danger' : 'success'}
                    >
                      {showFileShare ? '❌ Close' : '📎 File'}
                    </Button>
                    {onlineUsers.includes(selectedUser.id) ? (
                      <span className="text-xs text-emerald-600">● Online</span>
                    ) : (
                      <span className="text-xs text-slate-400">
                        ● Offline · {formatLastSeen(selectedUser.lastSeen)}
                      </span>
                    )}
                  </div>
                </div>

                {typingUsers[selectedUser.id] && (
                  <p className="mb-2 text-xs italic text-blue-200/90">{selectedUser.name} is typing…</p>
                )}

                <div className="mb-4 flex-1 space-y-2 overflow-y-auto rounded-lg bg-blue-950/40 p-3 min-h-[200px] max-h-[400px] lg:max-h-none lg:min-h-[300px] ring-1 ring-blue-400/15">
                  {messages.length === 0 ? (
                    <EmptyState
                      icon="💬"
                      title="Send a message to start chatting!"
                      className="py-16"
                    />
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.senderId === currentUser?.id;
                      const isFile = isFileMessage(msg);
                      const status = getMessageStatus(msg);
                      
                      return (
                        <div
                          key={msg.id}
                          className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[75%]',
                              isOwn ? 'chat-bubble-own' : 'chat-bubble-other'
                            )}
                          >
                            {isFile ? (
                              <div>
                                <div className="text-sm">📎 {extractFileName(msg.content)}</div>
                                <div className="text-[10px] opacity-70">{extractFileSize(msg.content)}</div>
                                <button
                                  onClick={() => handleDownloadFile(msg.fileId!, extractFileName(msg.content))}
                                  className={cn(
                                    'mt-1.5 rounded px-2.5 py-0.5 text-[11px] text-white',
                                    isOwn ? 'bg-brand-500 hover:bg-brand-400' : 'bg-emerald-500 hover:bg-emerald-600'
                                  )}
                                >
                                  ⬇️ Download
                                </button>
                              </div>
                            ) : (
                              <p className="m-0 text-sm">{msg.content}</p>
                            )}
                            <p className={cn(
                              'm-0 mt-0.5 text-right text-[10px]',
                              isOwn ? 'text-blue-100/80' : 'text-slate-500'
                            )}>
                              {formatTime(msg.createdAt)}
                              {status}
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

                <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => handleMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className="input-base flex-1"
                    aria-label="Message"
                  />
                  <Button type="submit" disabled={!message.trim()}>
                    Send
                  </Button>
                </form>
              </>
            ) : (
              <EmptyState
                icon="💬"
                title="Select a user to start chatting"
                description={filteredUsers.length > 0 ? `${filteredUsers.length} users available` : undefined}
                className="flex-1"
              />
            )}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
