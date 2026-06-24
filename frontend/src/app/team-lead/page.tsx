'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar, PageContainer } from '@/components/layout/Navbar';
import { NavDashboardLink } from '@/components/layout/NavDashboardLink';
import { OpBridgeLogo } from '@/components/layout/OpBridgeLogo';
import { RoleHero } from '@/components/layout/RoleHero';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { apiFetch, authHeaders } from '@/lib/api/config';
import { getAuthToken, performLogout, readStoredUser, updateStoredUser } from '@/lib/auth/session';
import { useSocket } from '@/context/SocketContext';
import { ChatNavBadge } from '@/components/ui/ChatNavBadge';

export default function TeamLeadDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { unreadCount } = useSocket();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamManagers, setTeamManagers] = useState<any[]>([]);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [showAddManagerForm, setShowAddManagerForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'TEAM_MEMBER'
  });
  const [authReady, setAuthReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    const userData = readStoredUser();
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(userData);
    
    if (userData.role !== 'TEAM_LEAD') {
      router.push('/dashboard');
      return;
    }
    
    setAuthReady(true);
    fetchTeamData(token);
  }, [router]);

  const fetchTeamData = async (token: string) => {
    setDataLoading(true);
    setFetchError('');
    try {
      const response = await apiFetch('/users?context=team', {
        headers: authHeaders(token),
      });
      const data = await response.json();
      if (data.success) {
        const leadTeamId = data.teamId as string | undefined;
        if (leadTeamId) {
          const stored = readStoredUser();
          if (!stored) return;
          const updatedUser = { ...stored, teamId: leadTeamId };
          setUser(updatedUser);
          updateStoredUser(updatedUser);
        }

        const members = data.data.filter((u: { role: string }) => u.role === 'TEAM_MEMBER');
        setTeamMembers(members);

        const managers = data.data.filter((u: { role: string }) => u.role === 'TEAM_MANAGER');
        setTeamManagers(managers);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error fetching team data';
      setFetchError(msg);
      console.error('Error fetching team data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await apiFetch('/users', {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `✅ ${formData.name} (${formData.role}) added successfully!` });
        setFormData({ name: '', username: '', password: '', role: 'TEAM_MEMBER' });
        setShowAddMemberForm(false);
        setShowAddManagerForm(false);
        fetchTeamData(token);
      } else {
        setMessage({ type: 'error', text: `❌ ${data.message}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Error adding user.' });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the team?`)) return;
    
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await apiFetch(`/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `✅ ${userName} removed from team!` });
        fetchTeamData(token);
      } else {
        setMessage({ type: 'error', text: `❌ ${data.message}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Error deleting user.' });
    }
  };

  if (!authReady) {
    return <LoadingSpinner fullScreen message="Checking access..." />;
  }

  const renderUserTable = (
    users: any[],
    emptyMessage: string,
    _roleBadgeClass: string,
    loading: boolean
  ) => (
    <div className="table-wrap border-slate-200">
      <table className="table-light">
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center">
                <LoadingSpinner message="Loading team..." size="sm" className="[&_p]:text-slate-600" />
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <EmptyState icon="👥" title={emptyMessage} className="py-8 [&_p]:text-slate-600" />
              </td>
            </tr>
          ) : (
            users.map((member) => (
              <tr key={member.id}>
                <td>{member.name}</td>
                <td className="text-slate-600">{member.username}</td>
                <td>
                  <Badge variant="role" role={member.role}>{member.role}</Badge>
                </td>
                <td>
                  <Button
                    onClick={() => handleDeleteUser(member.id, member.name)}
                    variant="danger"
                    size="sm"
                    className="text-xs"
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderAddForm = (submitLabel: string) => (
    <form onSubmit={handleAddUser} className="panel-light mb-4 animate-slide-up">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label="Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="John Doe"
          className="input-light"
        />
        <Input
          label="Username"
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
          placeholder="johndoe"
          className="input-light"
        />
        <Input
          label="Password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          placeholder="••••••••"
          className="input-light"
        />
      </div>
      <Button type="submit" variant="success" className="mt-4">
        {submitLabel}
      </Button>
    </form>
  );

  return (
    <div className="page-shell">
      <Navbar
        variant="team-lead"
        title={
          <span className="flex items-center gap-2">
            <OpBridgeLogo size={28} className="rounded-md" />
            Team Lead Panel
          </span>
        }
        subtitle={<span>👤 {user?.name}</span>}
      >
        <Button onClick={() => router.push('/chat')} size="sm" className="bg-emerald-500 hover:bg-emerald-600">
          💬 Chat
          <ChatNavBadge count={unreadCount} />
        </Button>
        <NavDashboardLink />
        <Button
          onClick={() => performLogout()}
          variant="danger"
          size="sm"
        >
          Logout
        </Button>
      </Navbar>

      <PageContainer className="space-y-6">
        <RoleHero role="TEAM_LEAD" name={user?.name} username={user?.username} showBrandLogo />

        {fetchError && (
          <Alert variant="error" className="mb-4">
            {fetchError}
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                const token = getAuthToken();
                if (token) fetchTeamData(token);
              }}
            >
              Retry
            </Button>
          </Alert>
        )}

        {message && (
          <Alert variant={message.type === 'success' ? 'success' : 'error'} className="mb-4">
            {message.text}
          </Alert>
        )}

        <Alert variant="info" className="mb-4">
          <strong>Team Lead Permissions:</strong> You can add <strong>Team Members</strong> and <strong>Team Managers</strong> for your team.
        </Alert>

        <Card variant="light">
          <CardHeader
            variant="light"
            title="👥 Team Management"
            description="Manage your team members and managers."
          />

          <div className="mb-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                Team Members ({teamMembers.length})
              </h3>
              <Button
                onClick={() => {
                  setShowAddMemberForm(!showAddMemberForm);
                  setShowAddManagerForm(false);
                  if (!showAddMemberForm) {
                    setFormData({ ...formData, role: 'TEAM_MEMBER' });
                  }
                }}
                variant="success"
                size="sm"
              >
                {showAddMemberForm ? '❌ Cancel' : '➕ Add Team Member'}
              </Button>
            </div>

            {showAddMemberForm && renderAddForm('Add Team Member')}
            {renderUserTable(teamMembers, 'No team members yet.', '', dataLoading)}
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                Team Managers ({teamManagers.length})
              </h3>
              <Button
                onClick={() => {
                  setShowAddManagerForm(!showAddManagerForm);
                  setShowAddMemberForm(false);
                  if (!showAddManagerForm) {
                    setFormData({ ...formData, role: 'TEAM_MANAGER' });
                  }
                }}
                variant="success"
                size="sm"
              >
                {showAddManagerForm ? '❌ Cancel' : '➕ Add Team Manager'}
              </Button>
            </div>

            {showAddManagerForm && renderAddForm('Add Team Manager')}
            {renderUserTable(teamManagers, 'No team managers yet.', '', dataLoading)}
          </div>
        </Card>
      </PageContainer>
    </div>
  );
}
