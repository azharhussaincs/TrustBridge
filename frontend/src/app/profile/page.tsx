'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Navbar, PageContainer } from '@/components/layout/Navbar';
import { NavDashboardLink } from '@/components/layout/NavDashboardLink';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getRoleLabel } from '@/lib/roles';
import { apiFetch, authHeaders } from '@/lib/api/config';
import {
  getAuthToken,
  performLogout,
  readStoredUser,
  updateStoredUser,
  type StoredUser,
} from '@/lib/auth/session';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    const userData = readStoredUser();
    if (!userData) {
      router.replace('/login');
      return;
    }
    setUser(userData);
    setName(userData.name);
    setUsername(userData.username);
    setAuthReady(true);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    const token = getAuthToken();
    if (!token || !user) return;

    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (name.trim() !== user.name) body.name = name.trim();
      if (username.trim() !== user.username) body.username = username.trim();
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      if (Object.keys(body).length === 0) {
        setError('No changes to save');
        setSaving(false);
        return;
      }

      const response = await apiFetch('/users/me/profile', {
        method: 'PATCH',
        headers: authHeaders(token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Failed to update profile');
        return;
      }

      const updated: StoredUser = {
        id: data.data.id,
        username: data.data.username,
        name: data.data.name,
        role: data.data.role,
        teamId: data.data.teamId ?? user.teamId ?? null,
      };

      updateStoredUser(updated);
      setUser(updated);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Profile updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!authReady || !user) {
    return <LoadingSpinner fullScreen message="Loading account..." />;
  }

  return (
    <div className="page-shell">
      <Navbar title="My Account" subtitle={<Badge variant="role" role={user.role}>{getRoleLabel(user.role)}</Badge>}>
        <NavDashboardLink />
        <Button onClick={() => performLogout()} variant="danger" size="sm">
          Logout
        </Button>
      </Navbar>

      <PageContainer className="max-w-lg">
        <Card variant="light" padding="lg" className="[&_.label-text]:text-slate-700">
          <h2 className="text-lg font-semibold text-slate-900">Account settings</h2>
          <p className="mt-1 text-sm text-slate-600">
            Update your display name, username, or password. Role cannot be changed here.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {error && <Alert variant="error">{error}</Alert>}

            <Input
              label="Display name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input-light"
            />

            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="input-light"
            />

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Change password (optional)</p>
              <p className="mt-1 text-xs text-slate-500">Leave blank to keep your current password.</p>

              <div className="mt-4 space-y-4">
                <Input
                  label="Current password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="input-light"
                />
                <Input
                  label="New password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="input-light"
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="input-light"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => window.location.assign('/dashboard')}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </PageContainer>
    </div>
  );
}
