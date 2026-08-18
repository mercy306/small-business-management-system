import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Business, User, AuditLog } from '../types';
import { Settings as SettingsIcon, Users, Shield, Building, Plus, UserX, CheckCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'business' | 'users' | 'audit'>('business');
  const [business, setBusiness] = useState<Business | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Business form state
  const [bizName, setBizName] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizCurrency, setBizCurrency] = useState('USD');
  const [bizTaxRate, setBizTaxRate] = useState('0');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // User form modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState<number | undefined>();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, uRes, rRes, aRes] = await Promise.all([
        api.get('/api/settings'),
        api.get('/api/users').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/api/roles').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/api/audit-logs?limit=50').catch(() => ({ data: { success: false, data: [] } })),
      ]);

      if (bRes.data.success) {
        const b = bRes.data.data;
        setBusiness(b);
        setBizName(b.name);
        setBizPhone(b.phone || '');
        setBizEmail(b.email || '');
        setBizAddress(b.address || '');
        setBizCurrency(b.currency || 'USD');
        setBizTaxRate(String(b.tax_rate || 0));
      }
      if (uRes.data?.success) setUsers(uRes.data.data);
      if (rRes.data?.success) {
        setRoles(rRes.data.data);
        if (rRes.data.data.length > 0 && !newUserRoleId) {
          setNewUserRoleId(rRes.data.data[0].id);
        }
      }
      if (aRes.data?.success) setAuditLogs(aRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    try {
      await api.put('/api/settings', {
        name: bizName,
        phone: bizPhone || null,
        email: bizEmail || null,
        address: bizAddress || null,
        currency: bizCurrency,
        tax_rate: parseFloat(bizTaxRate) || 0,
      });
      setSuccessMsg('Business settings updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update settings.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role_id: newUserRoleId,
      });
      setIsUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create user.');
    }
  };

  const handleDeactivateUser = async (id: number) => {
    if (!window.confirm('Deactivate this user account?')) return;
    try {
      await api.delete(`/api/users/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate user.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-500">Manage business details, tax rates, staff accounts, and security audit logs</p>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('business')}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'business'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building className="h-3.5 w-3.5" /> Business Profile & Taxes
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Staff & Roles ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield className="h-3.5 w-3.5" /> Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Business Settings */}
      {activeTab === 'business' && (
        <div className="card max-w-2xl">
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {successMsg}
            </div>
          )}

          <form onSubmit={handleUpdateBusiness} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                className="input text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Currency Code</label>
                <input
                  type="text"
                  required
                  value={bizCurrency}
                  onChange={(e) => setBizCurrency(e.target.value)}
                  placeholder="USD, EUR, GBP"
                  className="input text-xs uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Default Sales Tax (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={bizTaxRate}
                  onChange={(e) => setBizTaxRate(e.target.value)}
                  className="input text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Phone</label>
                <input
                  type="text"
                  value={bizPhone}
                  onChange={(e) => setBizPhone(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={bizEmail}
                  onChange={(e) => setBizEmail(e.target.value)}
                  className="input text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Address</label>
              <textarea
                rows={2}
                value={bizAddress}
                onChange={(e) => setBizAddress(e.target.value)}
                className="input text-xs"
              ></textarea>
            </div>

            <div className="pt-2">
              <button type="submit" className="btn-primary text-xs">
                Save Business Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: User Accounts */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setIsUserModalOpen(true)} className="btn-primary text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Staff User
            </button>
          </div>

          <div className="card !p-0 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="badge bg-slate-900 text-white text-[11px] capitalize">
                        {u.role_name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.is_active && (
                        <button
                          onClick={() => handleDeactivateUser(u.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Deactivate Account"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="card !p-0 overflow-hidden">
          {auditLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No audit records stored yet.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge bg-slate-100 text-slate-800 text-[10px] font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs capitalize text-slate-700">
                      {log.entity_type} #{log.entity_id || ''}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-400">User #{log.user_id || '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono max-w-xs truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Add Staff Account</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Cashier Sarah"
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="sarah@business.com"
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Temporary Password *</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Role / Permissions *</label>
                <select
                  value={newUserRoleId}
                  onChange={(e) => setNewUserRoleId(Number(e.target.value))}
                  className="input text-xs capitalize"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} — {r.description}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary text-xs">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
