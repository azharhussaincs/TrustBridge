'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isOnline: boolean;
}

// Admin can ONLY add Super User and Team Lead (per SRS REQ-3.2 and REQ-3.3)
const ADMIN_ALLOWED_ROLES = ['SUPER_USER', 'TEAM_LEAD'];

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SUPER_USER'
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    if (user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    
    fetchUsers(token);
  }, []);

  const fetchUsers = async (token: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `✅ ${formData.name} (${formData.role}) created successfully!` });
        setFormData({ name: '', email: '', password: '', role: 'SUPER_USER' });
        setShowForm(false);
        fetchUsers(token);
      } else {
        setMessage({ type: 'error', text: `❌ ${data.message}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Error creating user.' });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return;
    
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (userId === currentUser.id) {
      setMessage({ type: 'error', text: '❌ You cannot delete yourself!' });
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `✅ ${userName} deleted successfully!` });
        fetchUsers(token);
      } else {
        setMessage({ type: 'error', text: `❌ ${data.message}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Error deleting user.' });
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading users...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <nav style={{ backgroundColor: '#1e293b', padding: '0 20px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', height: '64px', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>👥 User Management</h1>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button onClick={() => router.push('/admin')} style={{ padding: '8px 16px', backgroundColor: '#64748b', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              ⚙️ Admin Panel
            </button>
            <button onClick={() => router.push('/dashboard')} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              Dashboard
            </button>
            <button onClick={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('user'); router.push('/login'); }} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Info Banner - Admin can only add Super User and Team Lead */}
        <div style={{
          backgroundColor: '#dbeafe',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #93c5fd'
        }}>
          <p style={{ color: '#1e40af', fontSize: '14px' }}>
            ⚠️ <strong>Admin Permissions:</strong> You can only add <strong>Super User</strong> and <strong>Team Lead</strong> roles.
            Team Members and Team Managers are added by Team Leads.
          </p>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b'
          }}>
            {message.text}
          </div>
        )}

        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>Users ({users.length})</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {showForm ? '❌ Cancel' : '➕ Add User (Super User / Team Lead)'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreateUser} style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', marginTop: '4px' }} placeholder="John Doe" />
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', marginTop: '4px' }} placeholder="user@company.com" />
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Password</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', marginTop: '4px' }} placeholder="••••••••" />
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Role</label>
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', marginTop: '4px' }}>
                    {ADMIN_ALLOWED_ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                    Admin can only add Super User and Team Lead
                  </p>
                </div>
              </div>
              <button type="submit" style={{ marginTop: '12px', padding: '8px 24px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Create User
              </button>
            </form>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Role</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>{user.name}</td>
                    <td style={{ padding: '12px' }}>{user.email}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: user.role === 'ADMIN' ? '#dbeafe' :
                                      user.role === 'SUPER_USER' ? '#fef3c7' :
                                      user.role === 'TEAM_LEAD' ? '#d1fae5' :
                                      user.role === 'TEAM_MANAGER' ? '#e0e7ff' :
                                      '#f3f4f6',
                        color: user.role === 'ADMIN' ? '#1e40af' :
                               user.role === 'SUPER_USER' ? '#92400e' :
                               user.role === 'TEAM_LEAD' ? '#065f46' :
                               user.role === 'TEAM_MANAGER' ? '#3730a3' :
                               '#374151'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {user.isOnline ? (
                        <span style={{ color: '#22c55e' }}>● Online</span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>● Offline</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
