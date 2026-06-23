'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar, PageContainer } from '@/components/layout/Navbar';
import { RoleHero } from '@/components/layout/RoleHero';
import { QuickActionGrid } from '@/components/layout/QuickActionGrid';
import { SecurityStrip } from '@/components/layout/SecurityStrip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSocket } from '@/context/SocketContext';
import { ChatNavBadge } from '@/components/ui/ChatNavBadge';
import { clearStoredAuth, getAuthToken, readStoredUser } from '@/lib/auth/session';

export default function SuperUserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { unreadCount } = useSocket();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    const userData = readStoredUser();
    if (!userData) {
      clearStoredAuth();
      router.replace('/login');
      return;
    }
    if (userData.role !== 'SUPER_USER') {
      router.replace('/dashboard');
      return;
    }
    setUser(userData);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <LoadingSpinner
        fullScreen
        message="Loading Executive Dashboard..."
        className="bg-slate-950"
      />
    );
  }

  return (
    <div className="page-shell">
      <Navbar
        variant="super-user"
        title={
          <span className="flex items-center gap-2">
            <span className="text-2xl">👑</span>
            Executive Dashboard
          </span>
        }
        subtitle={<span>Company Owner · {user?.name}</span>}
      >
        <Button
          onClick={() => router.push('/chat')}
          size="sm"
          className="bg-amber-400 font-bold text-slate-900 hover:bg-amber-300 shadow-glow-amber"
        >
          💬 Secure Chat
          <ChatNavBadge count={unreadCount} className="bg-red-600 text-white" />
        </Button>
        <Button onClick={() => router.push('/dashboard')} variant="secondary" size="sm">
          Home
        </Button>
        <Button
          onClick={() => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('auth-changed'));
            router.push('/login');
          }}
          variant="danger"
          size="sm"
        >
          Logout
        </Button>
      </Navbar>

      <PageContainer className="space-y-6">
        <RoleHero role="SUPER_USER" name={user?.name} username={user?.username} dark />

        <QuickActionGrid
          actions={[
            { href: '/chat', icon: '💬', title: 'Message Team Leads', description: 'Encrypted chat with department leads', accent: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
            { href: '/chat', icon: '📋', title: 'Message Managers', description: 'Receive operational updates from managers', accent: 'bg-slate-800 text-amber-400 ring-1 ring-slate-700' },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card padding="lg">
            <h3 className="heading-section">📨 Recent Updates</h3>
            <p className="mt-1 text-sm text-card-muted">High-level updates from your organization</p>
            <EmptyState
              icon="📭"
              title="No updates yet"
              description="Messages from Team Leads and Managers will appear here."
              className="py-10"
            />
          </Card>

          <Card padding="lg">
            <h3 className="heading-section">🔒 Access scope</h3>
            <p className="mt-2 text-sm text-card-body">
              As Super User you can <strong className="text-white">communicate</strong> with Team Leads and Team Managers only.
              You cannot add, modify, or delete users.
            </p>
            <Alert variant="warning" className="mt-4">
              Admin panel and user management are hidden from your role by design (SRS REQ-4.2).
            </Alert>
            <div className="mt-5">
              <SecurityStrip variant="dark" className="justify-start" />
            </div>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
