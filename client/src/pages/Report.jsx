import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { 
  Eye, Clock, ShieldCheck, CheckSquare, X, MapPin, Package, FileText, 
  User as UserIcon, Search, Filter, Download, FileSpreadsheet, 
  ChevronDown, File as FileIcon, Trash2 
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import ShiftReportView from '../components/ShiftReportView';
import LaminateGSMView from '../components/LaminateGSMView';
import { SHIFT_ROWS } from '../services/reportConstants';
import { exportShiftReportToExcel, exportGSMRecordToExcel } from '../services/excelExport';
import { exportShiftReportToPDF, exportGSMRecordToPDF } from '../services/pdfExport';

export default function Report() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const { user } = useAuth();

  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'All';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Sync type filter when URL changes
  useEffect(() => {
    if (searchParams.get('type')) {
      setTypeFilter(searchParams.get('type'));
    }
  }, [searchParams]);

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

  const ALLOWED_TYPES = ['Laminate Record for GSM Verification', 'Packing Shift Report'];

  const locations = ['All', 'SHED NO 1', 'SHED NO 2', 'SHED NO 3'];
  const types = useMemo(() => ['All', ...ALLOWED_TYPES], []);
  const statuses = ['All', 'Pending at Checked By', 'Pending at Verified By', 'Completed'];

  const filtered = useMemo(() => {
    return documents.filter(d => {
      if (!ALLOWED_TYPES.includes(d.type)) return false;
      if (statusFilter !== 'All' && d.status !== statusFilter) return false;
      if (locationFilter !== 'All' && d.location !== locationFilter) return false;
      if (typeFilter !== 'All' && d.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = d.itemName.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q) ||
          d.createdBy?.name?.toLowerCase().includes(q) ||
          `REC-${String(d.id).padStart(4, '0')}`.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [documents, statusFilter, locationFilter, typeFilter, searchQuery]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending at Checked By': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Pending at Verified By': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const parseData = (dataStr) => {
    try { 
      const parsed = JSON.parse(dataStr);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { 
      return {}; 
    }
  };

  const safeFormatDate = (dateStr, formatStr = 'dd MMM yyyy, hh:mm a') => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '—' : format(d, formatStr);
    } catch {
      return '—';
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setLocationFilter('All');
    setTypeFilter('All');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'All' || locationFilter !== 'All' || typeFilter !== 'All';

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading records...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">View and filter all submitted document records</p>
        </div>
        <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
          Showing {filtered.length} of {documents.length} records
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Filter className="w-4 h-4" /> Filters:
          </div>
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search by ID, item, type, location, creator..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white min-w-[170px]">
            {statuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
          </select>
          <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white min-w-[170px]">
            {locations.map(l => <option key={l} value={l}>{l === 'All' ? 'All Locations' : l}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white min-w-[170px]">
            {types.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
          </select>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-red-600 hover:text-red-800 font-semibold px-3 py-2 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap">
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Action</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Record ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Checked By</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Verified By</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created By</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created On</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button onClick={() => setSelectedDoc(doc)}
                      className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 p-2 rounded-lg transition-colors">
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    REC-{String(doc.id).padStart(4, '0')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {format(new Date(doc.createdAt), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{doc.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{doc.itemName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{doc.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx("px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border", getStatusColor(doc.status))}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="font-medium text-slate-800">{doc.checkedBy?.name || '—'}</div>
                    <div className={clsx("text-xs", doc.checkedBy ? "text-green-600 font-semibold" : "text-amber-600")}>
                      Status: {doc.checkedBy ? 'Checked ✓' : 'Pending'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="font-medium text-slate-800">{doc.verifiedBy?.name || '—'}</div>
                    <div className={clsx("text-xs", doc.verifiedBy ? "text-green-600 font-semibold" : (doc.checkedBy ? "text-blue-600" : "text-slate-400"))}>
                      Status: {doc.verifiedBy ? 'Verified ✓' : 'Pending'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {doc.createdBy?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div>{format(new Date(doc.createdAt), 'dd MMM yyyy')}</div>
                    <div className="text-xs flex items-center mt-0.5">
                      <Clock className="w-3 h-3 mr-1" />
                      {format(new Date(doc.createdAt), 'hh:mm a')}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="11" className="px-6 py-12 text-center text-slate-500">
                    {hasActiveFilters ? 'No records match your filters.' : 'No records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== Document Detail Modal ====== */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 rounded-t-2xl bg-slate-50 border-b border-slate-200 flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">REC-{String(selectedDoc.id).padStart(4, '0')}</div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedDoc.type}</h2>
                <span className={clsx("mt-2 inline-block text-xs font-semibold px-2 py-1 rounded border", getStatusColor(selectedDoc.status))}>
                  {selectedDoc.status}
                </span>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <InfoCard icon={<MapPin className="w-3 h-3" />} label="Location" value={selectedDoc.location} />
                <InfoCard icon={<Package className="w-3 h-3" />} label="Item Name" value={selectedDoc.itemName} />
                <InfoCard icon={<UserIcon className="w-3 h-3" />} label="Submitted By" value={selectedDoc.createdBy?.name} />
                <InfoCard icon={<Clock className="w-3 h-3" />} label="Submitted On" value={safeFormatDate(selectedDoc.createdAt)} />
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                  <FileText className="w-4 h-4" /> Form Content
                </h3>
                {selectedDoc.type === 'Packing Shift Report' ? (
                  <div className="bg-slate-100 p-4 rounded-xl overflow-x-auto border border-slate-200">
                    <ShiftReportView 
                      data={parseData(selectedDoc.data).entries} 
                      header={parseData(selectedDoc.data)} 
                      selectedMachines={parseData(selectedDoc.data).selectedMachines} 
                      SHIFT_ROWS={SHIFT_ROWS} 
                      docStatus={{
                        checkedBy: selectedDoc.checkedBy,
                        checkedAt: selectedDoc.checkedAt,
                        verifiedBy: selectedDoc.verifiedBy,
                        verifiedAt: selectedDoc.verifiedAt
                      }}
                    />
                  </div>
                ) : selectedDoc.type === 'Laminate Record for GSM Verification' ? (
                  <div className="bg-slate-100 p-4 rounded-xl overflow-x-auto border border-slate-200">
                    <LaminateGSMView 
                      data={parseData(selectedDoc.data).rows} 
                      header={parseData(selectedDoc.data)} 
                      docStatus={{
                        checkedBy: selectedDoc.checkedBy,
                        checkedAt: selectedDoc.checkedAt,
                        verifiedBy: selectedDoc.verifiedBy,
                        verifiedAt: selectedDoc.verifiedAt
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200">
                    {Object.entries(parseData(selectedDoc.data)).map(([key, value]) => (
                      <div key={key} className="flex justify-between px-4 py-3">
                        <span className="text-sm font-medium text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="text-sm font-semibold text-slate-900">{typeof value === 'object' ? JSON.stringify(value) : (value || '—')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Authorization Trail</h3>
                {selectedDoc.checkedBy && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">Checked</div>
                    <div className="text-sm text-green-900">
                      <span className="font-semibold">{selectedDoc.checkedBy.name}</span>
                      {selectedDoc.checkedAt && <span> — {safeFormatDate(selectedDoc.checkedAt)}</span>}
                    </div>
                  </div>
                )}
                {selectedDoc.verifiedBy && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Verified</div>
                    <div className="text-sm text-emerald-900">
                      <span className="font-semibold">{selectedDoc.verifiedBy.name}</span>
                      {selectedDoc.verifiedAt && <span> — {safeFormatDate(selectedDoc.verifiedAt)}</span>}
                    </div>
                  </div>
                )}
                {!selectedDoc.checkedBy && !selectedDoc.verifiedBy && (
                  <div className="text-sm text-slate-400">No signatures yet.</div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-between items-center">
              <div className="relative">
                {(selectedDoc.type === 'Packing Shift Report' || selectedDoc.type === 'Laminate Record for GSM Verification') && (
                  <>
                    <button 
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold shadow-sm"
                    >
                      <Download className="w-4 h-4" /> 
                      Export Options
                      <ChevronDown className={clsx("w-4 h-4 transition-transform", showExportMenu && "rotate-180")} />
                    </button>
                    
                    {showExportMenu && (
                      <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <button 
                          onClick={() => { 
                            if (selectedDoc.type === 'Packing Shift Report') exportShiftReportToExcel(selectedDoc, SHIFT_ROWS);
                            else exportGSMRecordToExcel(selectedDoc);
                            setShowExportMenu(false); 
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-green-600" />
                          Export to Excel
                        </button>
                        <button 
                          onClick={() => { 
                            if (selectedDoc.type === 'Packing Shift Report') exportShiftReportToPDF(selectedDoc, SHIFT_ROWS);
                            else exportGSMRecordToPDF(selectedDoc);
                            setShowExportMenu(false); 
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                          <FileIcon className="w-4 h-4 text-red-600" />
                          Export to PDF
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-3">
                {user.role?.toLowerCase() === 'admin' && (
                  <button 
                    onClick={async () => {
                      if (!confirm('Are you sure you want to PERMANENTLY delete this document and all its logs?')) return;
                      try {
                        const token = localStorage.getItem('token');
                        await axios.delete(`${API_URL}/api/documents/${selectedDoc.id}`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        setSelectedDoc(null);
                        setDocuments(docs => docs.filter(d => d.id !== selectedDoc.id));
                      } catch (err) {
                        alert('Failed to delete document');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-bold border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" /> 
                    Delete
                  </button>
                )}
                <button onClick={() => setSelectedDoc(null)}
                  className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-1">{icon} {label}</div>
      <div className="text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}
