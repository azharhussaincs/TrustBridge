'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamLeadDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamManagers, setTeamManagers] = useState<any[]>([]);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [showAddManagerForm, setShowAddManagerForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TEAM_MEMBER'
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    
    if (userData.role !== 'TEAM_LEAD') {
      router.push('/dashboard');
      return;
    }
    
    fetchTeamData(token);
    setLoading(false);
  }, []);

  const fetchTeamData = async (token: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const members = data.data.filter((u: any) => u.role === 'TEAM_MEMBER');
        setTeamMembers(members);
        
        const managers = data.data.filter((u: any) => u.role === 'TEAM_MANAGER');
        setTeamManagers(managers);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
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
        setMessage({ type: 'success', text: `✅ ${formData.name} (${formData.role}) added successfully!` });
        setFormData({ name: '', email: '', password: '', role: 'TEAM_MEMBER' });
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
    
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0fdf4' }}>
        <div style={{ color: '#065f46' }}>Loading Team Lead Dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0fdf4', color: '#064e3b' }}>
      <nav style={{ backgroundColor: '#065f46', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', padding: '0 20px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', height: '64px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🌿</span>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f0fdf4' }}>Team Lead Panel</h1>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ color: '#a7f3d0', fontSize: '14px' }}>👤 {user?.name}</span>
            <button onClick={() => router.push('/chat')} style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              💬 Chat
            </button>
            <button onClick={() => router.push('/dashboard')} style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              Dashboard
            </button>
            <button onClick={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('user'); router.push('/login'); }} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
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

        {/* Info Banner - Team Lead can add Team Members and Team Managers */}
        <div style={{
          backgroundColor: '#d1fae5',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #6ee7b7'
        }}>
          <p style={{ color: '#065f46', fontSize: '14px' }}>
            ✅ <strong>Team Lead Permissions:</strong> You can add <strong>Team Members</strong> and <strong>Team Managers</strong> for your team.
          </p>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#065f46', marginBottom: '8px' }}>👥 Team Management</h2>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Manage your team members and managers.
          </p>

          {/* Team Members */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#065f46' }}>
              Team Members ({teamMembers.length})
            </h3>
            <button
              onClick={() => {
                setShowAddMemberForm(!showAddMemberForm);
                setShowAddManagerForm(false);
                if (!showAddMemberForm) {
                  setFormData({ ...formData, role: 'TEAM_MEMBER' });
                }
              }}
              style={{
                padding: '6px 14px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showAddMemberForm ? '❌ Cancel' : '➕ Add Team Member'}
            </button>
          </div>

          {showAddMemberForm && (
            <form onSubmit={handleAddUser} style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #a7f3d0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#065f46' }}>Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #a7f3d0', borderRadius: '4px', marginTop: '4px' }} placeholder="John Doe" />
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#065f46' }}>Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #a7f3d0', borderRadius: '4px', marginTop: '4px' }} placeholder="member@company.com" />
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#065f46' }}>Password</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #a7f3d0', borderRadius: '4px', marginTop: '4px' }} placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" style={{ marginTop: '12px', padding: '8px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Add Team Member
              </button>
            </form>
          )}

          <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0fdf4', borderBottom: '2px solid #a7f3d0' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Role</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No team members yet.</td></tr>
                ) : (
                  teamMembers.map((member) => (
                    <tr key={member.id} style={{ borderBottom: '1px solid #d1fae5' }}>
                      <td style={{ padding: '12px' }}>{member.name}</td>
                      <td style={{ padding: '12px' }}>{member.email}</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#d1fae5', color: '#065f46' }}>{member.role}</span></td>
                      <td style={{ padding: '12px' }}>
                        <button onClick={() => handleDeleteUser(member.id, member.name)} style={{ padding: '4px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Team Managers */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#065f46' }}>
              Team Managers ({teamManagers.length})
            </h3>
            <button
              onClick={() => {
                setShowAddManagerForm(!showAddManagerForm);
                setShowAddMemberForm(false);
                if (!showAddManagerForm) {
                  setFormData({ ...formData, role: 'TEAM_MANAGER' });
                }
              }}
              style={{
                padding: '6px 14px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showAddManagerForm ? '❌ Cancel' : '➕ Add Team Manager'}
            </button>
          </div>

          {showAddManagerForm && (
            <form onSubmit={handleAddUser} style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #a7f3d0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#065f46' }}>Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #a7f3d0', borderRadius: '4px', marginTop: '4px' }} placeholder="Jane Smith" />
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#065f46' }}>Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #a7f3d0', borderRadius: '4px', marginTop: '4px' }} placeholder="manager@company.com" />
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#065f46' }}>Password</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #a7f3d0', borderRadius: '4px', marginTop: '4px' }} placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" style={{ marginTop: '12px', padding: '8px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Add Team Manager
              </button>
            </form>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0fdf4', borderBottom: '2px solid #a7f3d0' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Role</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamManagers.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No team managers yet.</td></tr>
                ) : (
                  teamManagers.map((manager) => (
                    <tr key={manager.id} style={{ borderBottom: '1px solid #d1fae5' }}>
                      <td style={{ padding: '12px' }}>{manager.name}</td>
                      <td style={{ padding: '12px' }}>{manager.email}</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#a7f3d0', color: '#065f46' }}>{manager.role}</span></td>
                      <td style={{ padding: '12px' }}>
                        <button onClick={() => handleDeleteUser(manager.id, manager.name)} style={{ padding: '4px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
