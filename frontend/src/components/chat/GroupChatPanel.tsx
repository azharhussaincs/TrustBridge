'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useSocket } from '@/context/SocketContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getRoleLabel } from '@/lib/roles';
import { apiFetch, authHeaders } from '@/lib/api/config';
import { getAuthToken } from '@/lib/auth/session';
import { cn } from '@/lib/utils';

interface GroupSummary {
  id: string;
  name: string;
  createdById: string;
  teamId: string | null;
  memberCount: number;
}

interface GroupMember {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface GroupMessageSender {
  id: string;
  name: string;
  username: string;
  role?: string;
}

interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  fileId: string | null;
  createdAt: string;
  sender?: GroupMessageSender | null;
}

interface EligibleUser {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface GroupChatPanelProps {
  currentUser: { id: string; role: string };
  canManage: boolean;
}

export function GroupChatPanel({ currentUser, canManage }: GroupChatPanelProps) {
  const {
    sendGroupMessage,
    refreshGroupRooms,
    groupUnreadMessages = {},
    setActiveGroupChatId,
    clearUnreadForGroup,
  } = useSocket();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<{ members: GroupMember[]; name: string } | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [addUserId, setAddUserId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadGroupsInFlightRef = useRef(false);
  const groupsErrorShownRef = useRef(false);

  const loadGroups = useCallback(async () => {
    const token = getAuthToken();
    if (!token || loadGroupsInFlightRef.current) return;
    loadGroupsInFlightRef.current = true;
    setLoading(true);
    try {
      const res = await apiFetch('/groups', { headers: authHeaders(token) });
      const data = await res.json();
      if (data.success) {
        setGroups(data.data ?? []);
        refreshGroupRooms();
        groupsErrorShownRef.current = false;
      } else if (!groupsErrorShownRef.current) {
        groupsErrorShownRef.current = true;
        toast.error(data.message || 'Failed to load groups');
      }
    } catch {
      if (!groupsErrorShownRef.current) {
        groupsErrorShownRef.current = true;
        toast.error('Failed to load groups');
      }
    } finally {
      loadGroupsInFlightRef.current = false;
      setLoading(false);
    }
  }, [refreshGroupRooms]);

  const loadGroupDetails = useCallback(async (groupId: string) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await apiFetch(`/groups/${groupId}`, { headers: authHeaders(token) });
      const data = await res.json();
      if (data.success) {
        setGroupDetails({ name: data.data.name, members: data.data.members });
      }
    } catch {
      toast.error('Failed to load group details');
    }
  }, []);

  const loadMessages = useCallback(async (groupId: string) => {
    const token = getAuthToken();
    if (!token) return;
    setMessagesLoading(true);
    try {
      const res = await apiFetch(`/groups/${groupId}/messages`, { headers: authHeaders(token) });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch {
      toast.error('Failed to load group messages');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const loadEligible = useCallback(async () => {
    if (!canManage) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await apiFetch('/groups/eligible-members', { headers: authHeaders(token) });
      const data = await res.json();
      if (data.success) {
        setEligibleUsers(data.data);
      }
    } catch {
      toast.error('Failed to load eligible members');
    }
  }, [canManage]);

  useEffect(() => {
    const onOpenGroup = (e: CustomEvent) => {
      const groupId = e.detail?.groupId as string | undefined;
      if (groupId) setSelectedGroupId(groupId);
    };
    window.addEventListener('open-group-chat', onOpenGroup as EventListener);
    return () => window.removeEventListener('open-group-chat', onOpenGroup as EventListener);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupDetails(null);
      setMessages([]);
      return;
    }
    setGroupDetails(null);
    setMessages([]);
    loadGroupDetails(selectedGroupId);
    loadMessages(selectedGroupId);
  }, [selectedGroupId, loadGroupDetails, loadMessages]);

  useEffect(() => {
    if (!selectedGroupId || messages.length === 0) return;
    const groupMessageIds = messages
      .filter((message) => message.groupId === selectedGroupId)
      .map((message) => message.id);
    if (!groupMessageIds.length) return;
    clearUnreadForGroup(selectedGroupId, groupMessageIds);
  }, [selectedGroupId, messages, clearUnreadForGroup]);

  useEffect(() => {
    if (!selectedGroupId) {
      setActiveGroupChatId(null);
      return;
    }
    setActiveGroupChatId(selectedGroupId);
  }, [selectedGroupId, setActiveGroupChatId]);

  useEffect(() => {
    return () => setActiveGroupChatId(null);
  }, [setActiveGroupChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const enrichMessage = useCallback(
    (msg: GroupMessage): GroupMessage => {
      if (msg.sender?.name) return msg;
      const member = groupDetails?.members.find((m) => m.id === msg.senderId);
      if (!member) return msg;
      return {
        ...msg,
        sender: {
          id: member.id,
          name: member.name,
          username: member.username,
          role: member.role,
        },
      };
    },
    [groupDetails]
  );

  useEffect(() => {
    const onNew = (e: CustomEvent) => {
      const msg = enrichMessage(e.detail as GroupMessage);
      if (msg.groupId !== selectedGroupId) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };
    const onSent = (e: CustomEvent) => {
      const msg = enrichMessage(e.detail as GroupMessage);
      if (msg.groupId !== selectedGroupId) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };
    const onError = (e: CustomEvent) => {
      toast.error(e.detail?.error || 'Failed to send group message');
    };

    window.addEventListener('new-group-message', onNew as EventListener);
    window.addEventListener('group-message-sent', onSent as EventListener);
    window.addEventListener('group-message-error', onError as EventListener);
    return () => {
      window.removeEventListener('new-group-message', onNew as EventListener);
      window.removeEventListener('group-message-sent', onSent as EventListener);
      window.removeEventListener('group-message-error', onError as EventListener);
    };
  }, [selectedGroupId, enrichMessage]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await apiFetch('/groups', {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: newGroupName, memberIds: selectedMemberIds }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Group created');
        setShowCreate(false);
        setNewGroupName('');
        setSelectedMemberIds([]);
        await loadGroups();
        setSelectedGroupId(data.data.id);
      } else {
        toast.error(data.message || 'Failed to create group');
      }
    } catch {
      toast.error('Failed to create group');
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroupId || !addUserId) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await apiFetch(`/groups/${selectedGroupId}/members`, {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: addUserId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Member added');
        setAddUserId('');
        setGroupDetails({ name: data.data.name, members: data.data.members });
        refreshGroupRooms();
        await loadGroups();
      } else {
        toast.error(data.message || 'Failed to add member');
      }
    } catch {
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroupId) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await apiFetch(`/groups/${selectedGroupId}/members/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Member removed');
        setGroupDetails({ name: data.data.name, members: data.data.members });
        await loadGroups();
      } else {
        toast.error(data.message || 'Failed to remove member');
      }
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId || !confirm('Delete this group?')) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await apiFetch(`/groups/${selectedGroupId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Group deleted');
        setSelectedGroupId(null);
        setGroupDetails(null);
        setMessages([]);
        await loadGroups();
      } else {
        toast.error(data.message || 'Failed to delete group');
      }
    } catch {
      toast.error('Failed to delete group');
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedGroupId) return;
    sendGroupMessage(selectedGroupId, message.trim());
    setMessage('');
  };

  const memberName = (msg: GroupMessage) => {
    if (msg.senderId === currentUser.id) return 'You';
    const member = groupDetails?.members.find((m) => m.id === msg.senderId);
    const name = (member?.name || msg.sender?.name || '').trim();
    const username = (member?.username || msg.sender?.username || '').trim();
    const role = member?.role || msg.sender?.role;

    if (name && username && name === username && role) {
      return getRoleLabel(role);
    }
    if (name) return name;
    if (username) return username;
    if (role) return getRoleLabel(role);
    return 'Unknown member';
  };

  const senderSubtitle = (msg: GroupMessage) => {
    if (msg.senderId === currentUser.id) return null;
    const username = msg.sender?.username
      ?? groupDetails?.members.find((m) => m.id === msg.senderId)?.username;
    const role = msg.sender?.role
      ?? groupDetails?.members.find((m) => m.id === msg.senderId)?.role;
    if (!username && !role) return null;
    const parts = [];
    if (username) parts.push(`@${username}`);
    if (role) parts.push(getRoleLabel(role));
    return parts.join(' · ');
  };

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="card-elevated flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[280px_1fr]">
      <div className="sidebar-panel flex min-h-0 flex-col overflow-hidden border-b-0 p-4 lg:border-r lg:rounded-r-none">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Groups ({groups.length})</h3>
          {canManage && (
            <Button
              size="sm"
              variant="success"
              onClick={() => {
                setShowCreate(true);
                loadEligible();
              }}
            >
              + New
            </Button>
          )}
        </div>

        {loading ? (
          <LoadingSpinner message="Loading groups..." size="sm" />
        ) : groups.length === 0 ? (
          <EmptyState icon="👥" title="No groups yet" className="py-8" />
        ) : (
          <div className="flex max-h-40 min-h-0 flex-1 flex-col gap-1 overflow-y-auto lg:max-h-none">
            {groups.map((g) => {
              const groupUnread =
                selectedGroupId === g.id ? 0 : (groupUnreadMessages[g.id] || 0);
              return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroupId(g.id)}
                className={cn(
                  'chat-sidebar-item text-left',
                  selectedGroupId === g.id && 'chat-sidebar-item-active'
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div>
                    <div className={cn('font-medium text-white', groupUnread > 0 && 'font-bold')}>{g.name}</div>
                    <div className="text-xs text-blue-200/70">{g.memberCount} members</div>
                  </div>
                  {groupUnread > 0 && (
                    <span className="unread-badge shrink-0">{groupUnread > 99 ? '99+' : groupUnread}</span>
                  )}
                </div>
              </button>
            );
            })}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white p-4 text-slate-900">
        {selectedGroupId ? (
          groupDetails ? (
          <>
            <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-semibold text-slate-900">{groupDetails.name}</h3>
                <p className="text-xs text-slate-500">{groupDetails.members?.length ?? 0} members</p>
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setShowManage(!showManage); loadEligible(); }}>
                    Manage
                  </Button>
                  <Button size="sm" variant="danger" onClick={handleDeleteGroup}>
                    Delete
                  </Button>
                </div>
              )}
            </div>

            {showManage && canManage && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-sm font-medium text-slate-800">Group members</p>
                <ul className="mb-3 space-y-1">
                  {(groupDetails.members ?? []).map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        {m.name} <span className="text-slate-500">@{m.username}</span>
                        <Badge variant="role" role={m.role} className="ml-1 text-[9px]">
                          {getRoleLabel(m.role)}
                        </Badge>
                      </span>
                      {m.id !== currentUser.id && (
                        <Button size="sm" variant="danger" className="text-xs" onClick={() => handleRemoveMember(m.id)}>
                          Remove
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    className="input-light min-w-[180px] flex-1 text-sm"
                  >
                    <option value="">Add member...</option>
                    {eligibleUsers
                      .filter((u) => !(groupDetails.members ?? []).some((m) => m.id === u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({getRoleLabel(u.role)})
                        </option>
                      ))}
                  </select>
                  <Button size="sm" onClick={handleAddMember} disabled={!addUserId}>
                    Add
                  </Button>
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg bg-white p-3 ring-1 ring-slate-200">
              {messagesLoading ? (
                <LoadingSpinner message="Loading messages..." size="sm" className="[&_p]:text-slate-600" />
              ) : messages.length === 0 ? (
                <EmptyState icon="💬" title="No messages yet" className="py-12 [&_p]:text-slate-600" />
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.senderId === currentUser.id;
                  const subtitle = senderSubtitle(msg);
                  return (
                    <div key={msg.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[75%]', isOwn ? 'chat-bubble-own' : 'chat-bubble-other')}>
                        <p
                          className={cn(
                            'mb-0.5 text-[11px] font-semibold',
                            isOwn ? 'text-blue-100' : 'text-slate-700'
                          )}
                        >
                          {memberName(msg)}
                        </p>
                        {subtitle && (
                          <p className={cn('mb-0.5 text-[10px]', isOwn ? 'text-blue-100/80' : 'text-slate-500')}>
                            {subtitle}
                          </p>
                        )}
                        <p className="m-0 text-sm">{msg.content}</p>
                        <p className="m-0 mt-0.5 text-right text-[10px] text-slate-500">{formatTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="mt-3 flex shrink-0 gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a group message..."
                className="input-light flex-1"
              />
              <Button type="submit" disabled={!message.trim()}>
                Send
              </Button>
            </form>
          </>
          ) : (
            <LoadingSpinner message="Loading group..." size="sm" className="flex-1 [&_p]:text-slate-600" />
          )
        ) : (
          <EmptyState
            icon="👥"
            title="Select a group"
            description={canManage ? 'Create a group or pick one from the list' : 'Pick a group you belong to'}
            className="flex-1 [&_p]:text-slate-600"
          />
        )}
      </div>

      {showCreate && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateGroup}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated"
          >
            <h3 className="text-lg font-semibold text-slate-900">Create group chat</h3>
            <p className="mt-1 text-sm text-slate-600">
              {currentUser.role === 'TEAM_LEAD'
                ? 'Add managers and members from your team.'
                : 'Add any Team Lead, Manager, or Member.'}
            </p>
            <div className="mt-4 space-y-4 [&_.label-text]:text-slate-700">
              <Input
                label="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                required
                className="input-light"
              />
              <div>
                <p className="label-text mb-2 block text-sm font-medium text-slate-700">Members</p>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {eligibleUsers.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(u.id)}
                        onChange={(e) => {
                          setSelectedMemberIds((prev) =>
                            e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                          );
                        }}
                      />
                      {u.name} ({getRoleLabel(u.role)})
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button type="submit" disabled={!newGroupName.trim()}>
                Create
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
