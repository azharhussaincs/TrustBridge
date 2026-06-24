'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Navbar, PageContainer } from '@/components/layout/Navbar';
import { NavDashboardLink } from '@/components/layout/NavDashboardLink';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, StatusDot } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getRoleBadgeStyle, getRoleLabel } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { apiUrl, apiFetch, authHeaders } from '@/lib/api/config';
import { getAuthToken, performLogout, readStoredUser } from '@/lib/auth/session';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  isOnline: boolean;
}

const ADMIN_ALLOWED_ROLES = ['SUPER_USER', 'TEAM_LEAD'];

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'SUPER_USER'
  });

  useEffect(() => {
    const token = getAuthToken();
    const user = readStoredUser();
    
    if (!token || !user) {
      router.push('/login');
      return;
    }
    
    if (user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    
    setCurrentUser(user);
    setAuthReady(true);
    fetchUsers(token);
  }, [router]);

  const fetchUsers = async (token: string) => {
    setUsersLoading(true);
    setFetchError('');
    try {
      const response = await apiFetch('/users', {
        headers: authHeaders(token),
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        setFetchError(data.message || 'Failed to load users');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error fetching users';
      setFetchError(message);
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        toast.success(`✅ ${formData.name} (${formData.role}) created successfully!`);
        setFormData({ name: '', username: '', password: '', role: 'SUPER_USER' });
        setShowForm(false);
        fetchUsers(token);
      } else {
        toast.error(`❌ ${data.message}`);
      }
    } catch (error) {
      toast.error('❌ Error creating user.');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUser?.id) {
      toast.error('❌ You cannot delete yourself!');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return;
    
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await apiFetch(`/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`✅ ${userName} deleted successfully!`);
        fetchUsers(token);
      } else {
        toast.error(`❌ ${data.message}`);
      }
    } catch (error) {
      toast.error('❌ Error deleting user.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    if (newPassword.length < 6) {
      toast.error('❌ Password must be at least 6 characters');
      return;
    }
    
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await apiFetch(`/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ newPassword })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`✅ Password reset for ${selectedUser.name}`);
        setShowPasswordModal(false);
        setNewPassword('');
        setSelectedUser(null);
      } else {
        toast.error(`❌ ${data.message}`);
      }
    } catch (error) {
      toast.error('❌ Error resetting password.');
    }
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPassword(false);
    setShowPasswordModal(true);
  };

  if (!authReady) {
    return <LoadingSpinner fullScreen message="Checking access..." />;
  }

  return (
    <div className="page-shell">
      <Navbar variant="admin" title="👥 User Management">
        <Button onClick={() => router.push('/profile')} size="sm" variant="secondary">
          🔑 My Account
        </Button>
        <Button onClick={() => router.push('/admin')} variant="secondary" size="sm">
          ⚙️ Admin Panel
        </Button>
        <NavDashboardLink />
        <Button onClick={() => performLogout()} variant="danger" size="sm">
          Logout
        </Button>
      </Navbar>

      <PageContainer>
        <Alert variant="info" className="mb-4">
          <strong>Admin Permissions:</strong> You can only add <strong>Executive User</strong> and <strong>Team Lead</strong> roles.
          Team Members and Team Managers are added by Team Leads.
        </Alert>

        {fetchError && (
          <Alert variant="error" className="mb-4">
            {fetchError}
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                const token = getAuthToken();
                if (token) fetchUsers(token);
              }}
            >
              Retry
            </Button>
          </Alert>
        )}

        <Card>
          <CardHeader
            title={`Users (${users.length})`}
            action={
              <Button onClick={() => setShowForm(!showForm)} size="sm">
                {showForm ? '❌ Cancel' : '➕ Add User (Executive User / Team Lead)'}
              </Button>
            }
          />

          {showForm && (
            <form onSubmit={handleCreateUser} className="panel-light mb-6 animate-slide-up">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <div>
                  <label htmlFor="role" className="label-text mb-1.5 block text-sm font-medium">Role</label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input-light"
                  >
                    {ADMIN_ALLOWED_ROLES.map((role) => (
                      <option key={role} value={role}>{getRoleLabel(role)}</option>
                    ))}
                  </select>
                  <p className="hint-text mt-1 text-[10px]">
                    Admin can only add Executive User and Team Lead
                  </p>
                </div>
              </div>
              <Button type="submit" variant="success" className="mt-4">
                Create User
              </Button>
            </form>
          )}

          <div className="table-wrap">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <LoadingSpinner message="Loading users..." size="sm" />
                    </td>
                  </tr>
                ) : users.length === 0 && !fetchError ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-card-muted">
                      No users found.
                    </td>
                  </tr>
                ) : (
                users.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id;
                  return (
                    <tr
                      key={user.id}
                      className={cn(isCurrentUser && 'ring-1 ring-inset ring-amber-400/50')}
                    >
                      <td>
                        {user.name}
                        {isCurrentUser && (
                          <Badge variant="warning" className="ml-2 text-[10px]">You</Badge>
                        )}
                      </td>
                      <td className="text-card-muted">{user.username}</td>
                      <td>
                        <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', getRoleBadgeStyle(user.role))}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td>
                        <StatusDot online={user.isOnline} />
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {!isCurrentUser && (
                            <Button
                              onClick={() => openPasswordModal(user)}
                              size="sm"
                              className="bg-violet-500 hover:bg-violet-600 text-xs"
                            >
                              🔑 Reset Password
                            </Button>
                          )}
                          {isCurrentUser ? (
                            <span className="text-xs text-card-muted">Cannot delete yourself</span>
                          ) : (
                            <Button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              variant="danger"
                              size="sm"
                              className="text-xs"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </PageContainer>

      <Modal
        isOpen={showPasswordModal && !!selectedUser}
        onClose={() => {
          setShowPasswordModal(false);
          setSelectedUser(null);
          setNewPassword('');
        }}
        title="🔑 Reset Password"
        description={
          <>
            Resetting password for: <strong>{selectedUser?.name}</strong>
            <br />
            <span className="text-xs text-slate-400">{selectedUser?.username}</span>
          </>
        }
      >
        <form onSubmit={handleResetPassword}>
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-700">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="input-base pr-11"
                placeholder="Enter new password (min 6 chars)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Password must be at least 6 characters
            </p>
          </div>
          
          <ModalFooter
            onCancel={() => {
              setShowPasswordModal(false);
              setSelectedUser(null);
              setNewPassword('');
            }}
            confirmLabel="🔑 Reset Password"
            confirmVariant="primary"
            isSubmit
          />
        </form>
      </Modal>
    </div>
  );
}
