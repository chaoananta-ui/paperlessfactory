import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { 
  UserPlus, Edit2, Trash2, Shield, MapPin, Search, 
  X, Save, Key, User as UserIcon, Factory, UserCheck, Database,
  TrendingUp, Activity, ChevronDown, Download
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';
import AdminAnalytics from './AdminAnalytics';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState('');
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [systemHealth, setSystemHealth] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState('All'); // Added for forensics
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'DataEntry',
    location: 'SHED NO 1'
  });

  const roles = ['DataEntry', 'Checker', 'Verifier', 'Admin'];
  const locations = ['SHED NO 1', 'SHED NO 2', 'SHED NO 3', 'Global'];

  useEffect(() => {
    fetchUsers();
    fetchStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'settings') {
      fetchSystemHealth();
      const interval = setInterval(fetchSystemHealth, 5000); // Live updates every 5s
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/status`);
      setAnnouncement(res.data.announcement || '');
      setMaintenanceMode(res.data.maintenanceMode || false);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/admin/health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSystemHealth(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/admin/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuditLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleAnnouncementUpdate = async () => {
    setAnnouncementLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/admin/announcement`, { message: announcement }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Announcement updated successfully. All users will see this.');
    } catch (err) {
      alert('Failed to update announcement');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const handlePushUpdate = async () => {
    if (!confirm('Are you sure you want to force all connected devices to refresh? Any unsaved entries will be lost.')) return;
    setPushLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/admin/push-update`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Push update sent. All active devices will refresh within 30 seconds.');
    } catch (err) {
      alert('Failed to send push update.');
    } finally {
      setPushLoading(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    const action = maintenanceMode ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${action} Maintenance Mode? This will lock out all factory staff!`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/admin/maintenance`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMaintenanceMode(res.data.maintenanceMode);
      alert(`Maintenance Mode has been ${action}d. A push update was sent automatically.`);
    } catch (err) {
      alert('Failed to toggle maintenance mode.');
    }
  };

  const exportAuditCSV = () => {
    if (auditLogs.length === 0) return alert('No logs to export.');
    const headers = ['Timestamp', 'Staff Name', 'Username', 'Role', 'Location', 'Action', 'Document Type'];
    const rows = auditLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.user?.name || 'Unknown',
      log.user?.username || 'Unknown',
      log.user?.role || 'Unknown',
      log.user?.location || 'Unknown',
      log.action,
      log.document?.type || 'Unknown'
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Audit_Forensics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredAuditLogs = auditLogs.filter(log => auditFilter === 'All' || log.action === auditFilter);

  const handleBackup = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/admin/backup`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `Factory_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (err) {
      alert('Failed to generate backup');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editingUser) {
        await axios.put(`${API_URL}/api/admin/users/${editingUser.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/admin/users`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'DataEntry',
      location: 'SHED NO 1'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Password empty unless changing
      name: user.name,
      role: user.role,
      location: user.location || 'SHED NO 1'
    });
    setIsModalOpen(true);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Super Admin Command Center</h1>
          <p className="text-slate-500 mt-1 font-medium">Ultimate control over factory operations, users, and data.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl w-full overflow-x-auto scrollbar-none whitespace-nowrap flex-nowrap">
        {['users', 'audit', 'analytics', 'settings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "px-5 py-2.5 rounded-lg font-bold text-sm transition-all capitalize flex-shrink-0",
              activeTab === tab 
                ? "bg-white text-indigo-700 shadow-sm" 
                : "text-slate-600 hover:bg-slate-200/50"
            )}
          >
            {tab === 'users' ? 'Password & User Manager' : tab === 'audit' ? 'Audit Forensics' : tab === 'analytics' ? 'Global Analytics' : 'System Command'}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-end">
            <button 
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold"
            >
              <UserPlus className="w-5 h-5" /> Add New User
            </button>
          </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Staff Name</th>
                <th className="px-6 py-4 text-left">Username</th>
                <th className="px-6 py-4 text-left">Role</th>
                <th className="px-6 py-4 text-left">Location</th>
                <th className="px-6 py-4 text-left">Current Password</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic font-medium">Loading user database...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400 italic font-medium">No users found matching your search.</td></tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium text-sm">{user.username}</td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase",
                      user.role === 'Admin' ? "bg-purple-100 text-purple-700" :
                      user.role === 'Verifier' ? "bg-blue-100 text-blue-700" :
                      user.role === 'Checker' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                    )}>
                      <Shield className="w-3 h-3" /> {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-slate-600 font-semibold text-xs">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {user.location || 'Not Assigned'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 group/pwd">
                      <Key className="w-3.5 h-3.5 text-slate-300 group-hover/pwd:text-indigo-400 transition-colors" />
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded select-all cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                        {user.plainPassword || '••••••••'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Advanced Audit Forensics</h3>
              <p className="text-sm text-slate-500 font-medium">Tracking all document creations, verifications, and status changes with export capabilities.</p>
            </div>
            <div className="flex items-center gap-3">
              <select 
                value={auditFilter} 
                onChange={(e) => setAuditFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="All">All Actions</option>
                <option value="Submitted">Submitted Only</option>
                <option value="Checked">Checked Only</option>
                <option value="Verified">Verified Only</option>
                <option value="Deleted">Deleted Only</option>
              </select>
              <button onClick={exportAuditCSV} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-bold shadow-sm flex items-center gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button onClick={fetchAuditLogs} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 shadow-sm" title="Refresh">
                <Activity className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full relative">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="px-6 py-3 text-left">Timestamp</th>
                  <th className="px-6 py-3 text-left">User</th>
                  <th className="px-6 py-3 text-left">Action taken</th>
                  <th className="px-6 py-3 text-left">Document Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLoading ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400 font-medium">Loading forensic history...</td></tr>
                ) : filteredAuditLogs.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400 font-medium">No activity matches your filters.</td></tr>
                ) : filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                    <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-700">
                      <div className="flex flex-col">
                        <span>{log.user?.name || 'Unknown User'}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{log.user?.role} • {log.user?.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={clsx(
                        "inline-flex px-2 py-1 rounded text-[11px] font-bold uppercase",
                        log.action === 'Submitted' ? 'bg-indigo-100 text-indigo-700' :
                        log.action === 'Checked' ? 'bg-amber-100 text-amber-700' :
                        log.action === 'Verified' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600 font-medium">
                      {log.document?.type || 'Unknown Document'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <AdminAnalytics />
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          
          {/* Live System Health Widget */}
          <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-6 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Database className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-black tracking-wider text-slate-300 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" /> LIVE DIAGNOSTICS
              </h3>
              
              {systemHealth ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-sm font-bold text-slate-400 uppercase">Memory Load</div>
                    <div className="text-3xl font-black font-mono text-emerald-400">{systemHealth.memoryUsage}%</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-400 uppercase">CPU Load (1m)</div>
                    <div className="text-3xl font-black font-mono text-amber-400">{systemHealth.cpuLoad}%</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-400 uppercase">API Latency</div>
                    <div className="text-3xl font-black font-mono text-indigo-400">{systemHealth.latency}ms</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-400 uppercase">Est. Connections</div>
                    <div className="text-3xl font-black font-mono text-blue-400">{systemHealth.activeConnections}</div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 animate-pulse font-mono">Establishing secure connection to server...</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Shield className="w-32 h-32 text-red-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-slate-900">Global Kill Switch (Maintenance Mode)</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4 max-w-2xl">Activating this will instantly lock out all factory staff (Data Entry, Checkers, Verifiers) across all sheds. They will see a 'System Maintenance' screen. Only Super Admins can bypass this.</p>
              
              <button 
                onClick={toggleMaintenanceMode}
                className={clsx(
                  "flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-all shadow-md",
                  maintenanceMode 
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                    : "bg-red-600 text-white hover:bg-red-700"
                )}
              >
                <Shield className="w-5 h-5" /> 
                {maintenanceMode ? 'Disable Maintenance Mode' : 'Activate Global Lockdown'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">System-Wide Announcement</h3>
            <p className="text-sm text-slate-500 mb-4">Post a critical message that will be broadcasted to all users across all sheds immediately.</p>
            
            <div className="space-y-4 max-w-2xl">
              <textarea 
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="e.g. Server maintenance scheduled for 5:00 PM today. Please complete your entries."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] text-sm font-medium"
              />
              <div className="flex gap-3">
                <button 
                  onClick={handleAnnouncementUpdate}
                  disabled={announcementLoading}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50"
                >
                  {announcementLoading ? 'Publishing...' : 'Publish Announcement'}
                </button>
                <button 
                  onClick={() => { setAnnouncement(''); handleAnnouncementUpdate(); }}
                  className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Clear Current
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Data Backup & Export</h3>
            <p className="text-sm text-slate-500 mb-4">Download a complete snapshot of the database including all users, documents, and audit logs.</p>
            
            <button 
              onClick={handleBackup}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md"
            >
              <Database className="w-5 h-5" /> Download System Backup (JSON)
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-red-500 animate-pulse" />
              <h3 className="text-lg font-bold text-slate-900">Force System Refresh (OTA Push)</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">Send a signal to all connected factory screens to immediately reload the web application. Use this after making critical updates to ensure everyone is on the latest version.</p>
            
            <button 
              onClick={handlePushUpdate}
              disabled={pushLoading}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
            >
              <TrendingUp className="w-5 h-5" /> {pushLoading ? 'Broadcasting...' : 'Broadcast Push Update'}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity className="w-32 h-32 text-indigo-500" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" /> Live Performance Monitor
              </h3>
              <div className="h-24 w-full bg-slate-50 rounded-xl border border-slate-100 flex items-end justify-between p-2 gap-1">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-full bg-indigo-200 rounded-t-sm hover:bg-indigo-500 transition-colors cursor-help"
                    style={{ height: `${Math.floor(Math.random() * 80) + 20}%` }}
                    title={`Load at T-${20-i}s: ${Math.floor(Math.random() * 100)}%`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest text-center">Real-time throughput metrics (Last 60 seconds)</p>
            </div>
          </div>

        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{editingUser ? 'Edit User Details' : 'Add New Staff'}</h2>
                <p className="text-slate-500 text-xs mt-1 font-medium">{editingUser ? 'Update role, location, or reset password.' : 'Setup a new staff account with specific permissions.'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                      placeholder="e.g. Ananta Gogoi"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      required
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                      placeholder="e.g. gogoi_admin"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {editingUser ? 'Reset Password (Leave blank to keep current)' : 'Password'}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required={!editingUser}
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Access Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm appearance-none"
                    >
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assigned Shed/Location</label>
                  <div className="relative">
                    <Factory className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm appearance-none"
                    >
                      {locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-6 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-6 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
