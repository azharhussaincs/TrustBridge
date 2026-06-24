'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar, PageContainer } from '@/components/layout/Navbar';
import { NavDashboardLink } from '@/components/layout/NavDashboardLink';
import { RoleHero } from '@/components/layout/RoleHero';
import { QuickActionGrid } from '@/components/layout/QuickActionGrid';
import { SecurityStrip } from '@/components/layout/SecurityStrip';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSocket } from '@/context/SocketContext';
import { ChatNavBadge } from '@/components/ui/ChatNavBadge';
import { getRoleLabel } from '@/lib/roles';
import { apiFetch, authHeaders } from '@/lib/api/config';
import { clearStoredAuth, getAuthToken, performLogout, readStoredUser } from '@/lib/auth/session';

interface OrgUser {
  id: string;
  name: string;
  username: string;
  role: string;
  teamId: string | null;
  isOnline: boolean;
}

interface TeamLeadNode extends OrgUser {
  managers: OrgUser[];
  members: OrgUser[];
}

function buildTeamTree(users: OrgUser[]): TeamLeadNode[] {
  const teamLeads = users.filter((u) => u.role === 'TEAM_LEAD');

  return teamLeads.map((lead) => ({
    ...lead,
    managers: users.filter((u) => u.role === 'TEAM_MANAGER' && u.teamId === lead.teamId),
    members: users.filter((u) => u.role === 'TEAM_MEMBER' && u.teamId === lead.teamId),
  }));
}

function OnlineDot({ online }: { online: boolean }) {
  return <span aria-hidden="true">{online ? '🟢' : '⚪'}</span>;
}

export default function SuperUserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [teamTree, setTeamTree] = useState<TeamLeadNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const { unreadCount } = useSocket();

  const fetchOrganization = async (token: string) => {
    setTreeLoading(true);
    setFetchError('');
    try {
      const response = await apiFetch('/users', {
        headers: authHeaders(token),
      });
      const data = await response.json();
      if (data.success && data.data) {
        setTeamTree(buildTeamTree(data.data));
      } else {
        setFetchError(data.message || 'Failed to load organization');
      }
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Failed to load organization');
    } finally {
      setTreeLoading(false);
    }
  };

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
    fetchOrganization(token);
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
        <NavDashboardLink label="Home" />
        <Button onClick={() => performLogout()} variant="danger" size="sm">
          Logout
        </Button>
      </Navbar>

      <PageContainer className="space-y-6">
        <RoleHero role="SUPER_USER" name={user?.name} username={user?.username} dark showBrandLogo />

        <QuickActionGrid
          actions={[
            { href: '/chat', icon: '💬', title: 'Secure Chat', description: 'Message Team Leads, Managers, and Members', accent: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
            { href: '/chat', icon: '📎', title: 'File Transfer', description: 'Share files with anyone in the organization', accent: 'bg-slate-800 text-amber-400 ring-1 ring-slate-700' },
          ]}
        />

        {fetchError && (
          <Alert variant="error">
            {fetchError}
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                const token = getAuthToken();
                if (token) fetchOrganization(token);
              }}
            >
              Retry
            </Button>
          </Alert>
        )}

        <Card variant="light" padding="lg">
          <CardHeader
            variant="light"
            title="🌳 Organization Teams"
            description="Team Leads and their managers and members."
          />

          {treeLoading ? (
            <LoadingSpinner message="Loading teams..." size="sm" className="[&_p]:text-slate-600" />
          ) : teamTree.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No teams yet"
              description="Team Leads and their staff will appear here once created."
              className="py-10 [&_p]:text-slate-600"
            />
          ) : (
            <div className="space-y-4">
              {teamTree.map((lead) => (
                <div key={lead.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <OnlineDot online={lead.isOnline} />
                    <span>{lead.name}</span>
                    <span className="text-sm font-normal text-slate-500">@{lead.username}</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                      {getRoleLabel('TEAM_LEAD')}
                    </span>
                  </div>

                  {lead.managers.length > 0 && (
                    <div className="mt-3 border-l-2 border-blue-200 pl-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Team Managers
                      </p>
                      <ul className="space-y-1.5">
                        {lead.managers.map((manager) => (
                          <li key={manager.id} className="flex items-center gap-2 text-sm text-slate-800">
                            <OnlineDot online={manager.isOnline} />
                            <span>{manager.name}</span>
                            <span className="text-slate-500">@{manager.username}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {lead.members.length > 0 && (
                    <div className="mt-3 border-l-2 border-violet-200 pl-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Team Members
                      </p>
                      <ul className="space-y-1.5">
                        {lead.members.map((member) => (
                          <li key={member.id} className="flex items-center gap-2 text-sm text-slate-800">
                            <OnlineDot online={member.isOnline} />
                            <span>{member.name}</span>
                            <span className="text-slate-500">@{member.username}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {lead.managers.length === 0 && lead.members.length === 0 && (
                    <p className="mt-2 text-sm text-slate-500">No managers or members assigned yet.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="lg">
          <h3 className="heading-section">🔒 Access scope</h3>
          <p className="mt-2 text-sm text-card-body">
            As Executive User you can <strong className="text-white">chat and share files</strong> with Team Leads,
            Team Managers, and Team Members across all teams. You cannot add, modify, or delete users.
          </p>
          <div className="mt-5">
            <SecurityStrip variant="dark" className="justify-start" />
          </div>
        </Card>
      </PageContainer>
    </div>
  );
}
