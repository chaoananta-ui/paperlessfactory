import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { FileText, CheckCircle, Clock, ShieldCheck, TrendingUp, Filter } from 'lucide-react';
import { format, parseISO, startOfMonth, startOfDay, subDays, subMonths, isAfter } from 'date-fns';
import clsx from 'clsx';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#ef4444'];
const LOCATION_COLORS = { 'SHED NO 1': '#6366f1', 'SHED NO 2': '#f59e0b', 'SHED NO 3': '#10b981' };

export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [locationFilter, setLocationFilter] = useState('All');
  const { user } = useAuth();

  useEffect(() => { fetchDocuments(); }, []);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const locations = ['All', 'SHED NO 1', 'SHED NO 2', 'SHED NO 3'];

  const ALLOWED_TYPES = ['Laminate Record for GSM Verification', 'Packing Shift Report'];

  const filtered = useMemo(() => {
    let docs = documents.filter(d => ALLOWED_TYPES.includes(d.type));
    if (locationFilter !== 'All') docs = docs.filter(d => d.location === locationFilter);
    const now = new Date();
    if (timeRange === '7d') docs = docs.filter(d => isAfter(new Date(d.createdAt), subDays(now, 7)));
    else if (timeRange === '30d') docs = docs.filter(d => isAfter(new Date(d.createdAt), subDays(now, 30)));
    else if (timeRange === '90d') docs = docs.filter(d => isAfter(new Date(d.createdAt), subMonths(now, 3)));
    return docs;
  }, [documents, locationFilter, timeRange]);

  // Summary cards
  const stats = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter(d => d.status === 'Pending at Checked By').length,
    inReview: filtered.filter(d => d.status === 'Pending at Verified By').length,
    completed: filtered.filter(d => d.status === 'Completed').length,
  }), [filtered]);

  // Status pie chart
  const statusData = useMemo(() => [
    { name: 'Pending Check', value: stats.pending, color: '#f59e0b' },
    { name: 'Pending Verify', value: stats.inReview, color: '#3b82f6' },
    { name: 'Completed', value: stats.completed, color: '#10b981' },
  ].filter(d => d.value > 0), [stats]);

  // Daily submission trend
  const dailyTrend = useMemo(() => {
    const map = {};
    filtered.forEach(d => {
      const day = format(new Date(d.createdAt), 'dd MMM');
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [filtered]);

  // Location-wise breakdown
  const locationBreakdown = useMemo(() => {
    const map = {};
    filtered.forEach(d => {
      if (!map[d.location]) map[d.location] = { location: d.location, total: 0, completed: 0, pending: 0 };
      map[d.location].total++;
      if (d.status === 'Completed') map[d.location].completed++;
      else map[d.location].pending++;
    });
    return Object.values(map);
  }, [filtered]);

  // Document type breakdown
  const typeBreakdown = useMemo(() => {
    const map = {};
    filtered.forEach(d => {
      map[d.type] = (map[d.type] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Document submission analytics &amp; effectiveness overview</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {[['7d','7 Days'],['30d','30 Days'],['90d','90 Days'],['all','All']].map(([val, label]) => (
              <button key={val} onClick={() => setTimeRange(val)}
                className={clsx("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                  timeRange === val ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={<FileText className="w-5 h-5" />} label="Total Documents" value={stats.total} color="bg-indigo-50 text-indigo-600 border-indigo-100" />
        <SummaryCard icon={<Clock className="w-5 h-5" />} label="Pending Check" value={stats.pending} color="bg-amber-50 text-amber-600 border-amber-100" />
        <SummaryCard icon={<ShieldCheck className="w-5 h-5" />} label="Pending Verify" value={stats.inReview} color="bg-blue-50 text-blue-600 border-blue-100" />
        <SummaryCard icon={<CheckCircle className="w-5 h-5" />} label="Completed" value={stats.completed} color="bg-green-50 text-green-600 border-green-100" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
            <TrendingUp className="w-4 h-4 text-indigo-500" /> Submission Trend
          </h3>
          {dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} name="Submissions" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data for this period</div>}
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4">Status Distribution</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} (${(percent*100).toFixed(0)}%)`}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data for this period</div>}
        </div>
      </div>

      {/* Plant-wise Effectiveness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4">Plant-wise Effectiveness</h3>
          {locationBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={locationBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                <YAxis dataKey="location" type="category" width={130} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" radius={[0,0,0,0]} />
                <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>

        {/* Document Type Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4">By Document Type</h3>
          {typeBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={typeBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[4,4,0,0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }) {
  return (
    <div className={clsx("rounded-xl border p-5 flex items-center gap-4", color)}>
      <div className="p-2.5 rounded-lg bg-white/60 border border-white/80">{icon}</div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs font-medium opacity-80">{label}</div>
      </div>
    </div>
  );
}
