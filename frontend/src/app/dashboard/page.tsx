'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

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
    
    toast.success(`👋 Welcome ${userData.name}!`);
  }, [router]);

  const getRoleContent = () => {
    switch(user?.role) {
      case 'ADMIN':
        return (
          <div style={{ 
            backgroundColor: '#1e293b', 
            padding: '16px', 
            borderRadius: '8px',
            color: 'white',
            marginBottom: '16px'
          }}>
            <h3 style={{ color: '#60a5fa' }}>⚙️ Admin Panel</h3>
            <p>Full system access, manage all users and view logs.</p>
            <button
              onClick={() => router.push('/admin')}
              style={{
                marginTop: '8px',
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Go to Admin Panel →
            </button>
          </div>
        );
      
      case 'SUPER_USER':
        return (
          <div style={{ 
            backgroundColor: '#1a1a1a', 
            padding: '16px', 
            borderRadius: '8px',
            color: '#fbbf24',
            border: '2px solid #fbbf24',
            marginBottom: '16px'
          }}>
            <h3 style={{ color: '#fbbf24' }}>👑 Super User</h3>
            <p>Company owner - Receive updates from Team Leads and Managers.</p>
            <button
              onClick={() => router.push('/super-user')}
              style={{
                marginTop: '8px',
                padding: '8px 16px',
                backgroundColor: '#fbbf24',
                color: '#1a1a1a',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Go to Super User Panel →
            </button>
          </div>
        );
      
      case 'TEAM_LEAD':
        return (
          <div style={{ 
            backgroundColor: '#065f46', 
            padding: '16px', 
            borderRadius: '8px',
            color: 'white',
            border: '2px solid #10b981',
            marginBottom: '16px'
          }}>
            <h3 style={{ color: '#34d399' }}>🌿 Team Lead</h3>
            <p>Manage your team members and managers.</p>
            <button
              onClick={() => router.push('/team-lead')}
              style={{
                marginTop: '8px',
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Go to Team Lead Panel →
            </button>
          </div>
        );
      
      case 'TEAM_MANAGER':
        return (
          <div style={{ 
            backgroundColor: '#1e40af', 
            padding: '16px', 
            borderRadius: '8px',
            color: 'white',
            border: '2px solid #60a5fa',
            marginBottom: '16px'
          }}>
            <h3 style={{ color: '#93c5fd' }}>📋 Team Manager</h3>
            <p>Manage team members. Chat with Team Lead and your team.</p>
          </div>
        );
      
      case 'TEAM_MEMBER':
        return (
          <div style={{ 
            backgroundColor: '#6b21a5', 
            padding: '16px', 
            borderRadius: '8px',
            color: 'white',
            border: '2px solid #c084fc',
            marginBottom: '16px'
          }}>
            <h3 style={{ color: '#d8b4fe' }}>👤 Team Member</h3>
            <p>Chat with your team manager and other members.</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getRoleIcon = () => {
    switch(user?.role) {
      case 'ADMIN': return '⚙️';
      case 'SUPER_USER': return '👑';
      case 'TEAM_LEAD': return '🌿';
      case 'TEAM_MANAGER': return '📋';
      case 'TEAM_MEMBER': return '👤';
      default: return '🔐';
    }
  };

  if (!user) {
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
            <button
              onClick={() => router.push('/admin')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1e293b',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              ⚙️ Admin Panel
            </button>
            <button
              onClick={() => router.push('/admin/users')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              👥 Manage Users
            </button>
          </>
        );
      case 'SUPER_USER':
        return (
          <button
            onClick={() => router.push('/super-user')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#fbbf24',
              color: '#1a1a1a',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            👑 Super User Panel
          </button>
        );
      case 'TEAM_LEAD':
        return (
          <button
            onClick={() => router.push('/team-lead')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            🌿 Team Lead Panel
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <Toaster position="top-right" />
      
      <nav style={{ backgroundColor: 'white', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', height: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
                {getRoleIcon()} TrustBridge
              </h1>
              <span style={{ 
                marginLeft: '12px', 
                fontSize: '12px', 
                padding: '2px 10px',
                borderRadius: '12px',
                backgroundColor: user.role === 'ADMIN' ? '#1e293b' :
                              user.role === 'SUPER_USER' ? '#fbbf24' :
                              user.role === 'TEAM_LEAD' ? '#10b981' :
                              user.role === 'TEAM_MANAGER' ? '#3b82f6' :
                              '#8b5cf6',
                color: user.role === 'SUPER_USER' ? '#1a1a1a' : 'white'
              }}>
                {user.role?.toLowerCase()}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {getRoleActions()}
              <button
                onClick={() => router.push('/chat')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                💬 Chat
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('user');
                  toast.success('👋 Logged out successfully');
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
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
          {getRoleContent()}
          
          <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>
            Welcome {user.name}! 👋
          </h2>
          <p style={{ marginTop: '8px', color: '#6b7280' }}>
            Role: <strong style={{ 
              color: user.role === 'ADMIN' ? '#1e293b' : 
                     user.role === 'SUPER_USER' ? '#fbbf24' : 
                     user.role === 'TEAM_LEAD' ? '#10b981' : 
                     user.role === 'TEAM_MANAGER' ? '#3b82f6' : 
                     '#8b5cf6'
            }}>{user.role?.toLowerCase()}</strong>
          </p>
          <p style={{ color: '#6b7280' }}>Email: <strong>{user.email}</strong></p>
          
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            backgroundColor: '#f3f4f6', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#374151'
          }}>
            <strong>🔒 Your Permissions:</strong>
            {user.role === 'ADMIN' && ' Full system access, can manage all users and view logs.'}
            {user.role === 'SUPER_USER' && ' Receive updates from Team Leads and Managers. Chat only with Leads and Managers.'}
            {user.role === 'TEAM_LEAD' && ' Manage your team members and managers. Chat with other Leads and your team.'}
            {user.role === 'TEAM_MANAGER' && ' Manage team members. Chat with Team Lead and your team.'}
            {user.role === 'TEAM_MEMBER' && ' Chat with your Team Manager.'}
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
