'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    
    // Redirect to role-specific dashboard
    if (userData.role === 'SUPER_USER') {
      router.push('/super-user');
    } else if (userData.role === 'TEAM_LEAD') {
      router.push('/team-lead');
    }
  }, [router]);

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #2563eb', borderTop: '4px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
          <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const getRoleActions = () => {
    switch(user.role) {
      case 'ADMIN':
        return (
          <>
            <button onClick={() => router.push('/admin')} style={{ padding: '8px 16px', backgroundColor: '#1e293b', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              ⚙️ Admin Panel
            </button>
            <button onClick={() => router.push('/admin/users')} style={{ padding: '8px 16px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              👥 Manage Users
            </button>
          </>
        );
      case 'SUPER_USER':
        return (
          <button onClick={() => router.push('/super-user')} style={{ padding: '8px 16px', backgroundColor: '#fbbf24', color: '#1a1a1a', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            👑 Super User Panel
          </button>
        );
      case 'TEAM_LEAD':
        return (
          <button onClick={() => router.push('/team-lead')} style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            🌿 Team Lead Panel
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <nav style={{ backgroundColor: 'white', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', height: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>🔐 TrustBridge</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {getRoleActions()}
              <button onClick={() => router.push('/chat')} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                💬 Chat
              </button>
              <button onClick={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('user'); router.push('/login'); }} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>Welcome {user.name}! 👋</h2>
          <p style={{ marginTop: '8px', color: '#6b7280' }}>
            Role: <strong style={{ color: user.role === 'ADMIN' ? '#1e293b' : user.role === 'SUPER_USER' ? '#fbbf24' : user.role === 'TEAM_LEAD' ? '#10b981' : '#6b7280' }}>{user.role?.toLowerCase()}</strong>
          </p>
          <p style={{ color: '#6b7280' }}>Email: <strong>{user.email}</strong></p>
          
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '4px', fontSize: '14px', color: '#374151' }}>
            <strong>🔒 Your Permissions:</strong>
            {user.role === 'ADMIN' && ' Full system access, can manage all users and view logs.'}
            {user.role === 'SUPER_USER' && ' Receive updates from Team Leads and Managers. Chat only with Leads and Managers.'}
            {user.role === 'TEAM_LEAD' && ' Manage your team members and managers. Chat with other Leads and your team.'}
            {user.role === 'TEAM_MANAGER' && ' Manage team members. Chat with Team Lead and your team.'}
            {user.role === 'TEAM_MEMBER' && ' Chat with your Team Manager.'}
          </div>
          
          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <h3 style={{ fontWeight: '600', color: '#1e40af' }}>🔐 AES-GCM</h3>
              <p style={{ fontSize: '14px', color: '#1e40af' }}>All messages encrypted</p>
            </div>
            <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <h3 style={{ fontWeight: '600', color: '#166534' }}>🛡️ Zero Trust</h3>
              <p style={{ fontSize: '14px', color: '#166534' }}>Every request verified</p>
            </div>
            <div style={{ backgroundColor: '#faf5ff', padding: '16px', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
              <h3 style={{ fontWeight: '600', color: '#5b21b6' }}>👥 Role Based</h3>
              <p style={{ fontSize: '14px', color: '#5b21b6' }}>5 user roles with permissions</p>
            </div>
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
