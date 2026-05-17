import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Eye, X, FileDown, Send, Check, Download } from 'lucide-react';
import clsx from 'clsx';
import ShiftReportView from '../components/ShiftReportView';

import { SHIFT_ROWS, MACHINES_BY_LOCATION } from '../services/reportConstants';

const ALL_MACHINES_FLAT = Object.values(MACHINES_BY_LOCATION).flat();
const DRAFT_KEY = 'draft_shift-report';

export default function ShiftReportForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedMachines, setSelectedMachines] = useState([]);
  const [header, setHeader] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: '', shiftIncharge: '',
    location: 'SHED NO 1',
    varietySKU: '',
  });

  const initData = () => {
    const d = {};
    SHIFT_ROWS.filter(r => !r.key.startsWith('_')).forEach(r => {
      if (r.section === 'manpower' || r.section === 'merged') {
        d[`${r.key}_common`] = '';
      } else {
        ALL_MACHINES_FLAT.forEach(m => { d[`${r.key}_${m}`] = ''; });
      }
      d[`${r.key}_remarks`] = '';
    });
    return d;
  };

  const availableMachines = MACHINES_BY_LOCATION[header.location] || [];

  const [data, setData] = useState(initData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.header) {
          setHeader({
            ...d.header,
            location: (user.role !== 'Admin' && user.location) ? user.location : d.header.location
          });
        }
        if (d.data) setData(prev => ({ ...prev, ...d.data }));
        if (d.selectedMachines) setSelectedMachines(d.selectedMachines);
      } catch {}
    } else if (user && user.role !== 'Admin' && user.location) {
      setHeader(prev => ({ ...prev, location: user.location }));
    }
  }, [user]);

  const toggleMachine = (m) => {
    setSelectedMachines(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const handleHeaderChange = (e) => {
    const updated = { ...header, [e.target.name]: e.target.value };
    setHeader(updated);
    // Reset machine selection when location changes
    if (e.target.name === 'location') {
      setSelectedMachines([]);
    }
  };
  const handleDataChange = (key, value) => setData({ ...data, [key]: value });
  const preventEnter = (e) => { if (e.key === 'Enter') e.preventDefault(); };

  // Auto-generate machine name label
  const machineLabel = selectedMachines.length > 0
    ? selectedMachines.sort().join(', ')
    : 'No machine selected';

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ header, data, selectedMachines, savedAt: new Date().toISOString() }));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHeader({ date: new Date().toISOString().split('T')[0], shift: '', shiftIncharge: '', location: 'SHED NO 1', varietySKU: '' });
    setSelectedMachines([]);
    setData(initData());
  };

  const handleSubmit = async () => {
    if (user.role !== 'DataEntry') { setError('Only DataEntry role can submit.'); return; }
    if (selectedMachines.length === 0) { setError('Please select at least one machine.'); return; }
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/documents`, {
        type: 'Packing Shift Report',
        location: header.location,
        itemName: machineLabel,
        data: { ...header, selectedMachines, entries: data },
      }, { headers: { Authorization: `Bearer ${token}` } });
      localStorage.removeItem(DRAFT_KEY);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit');
    } finally { setLoading(false); }
  };

  const sectionBg = (s) => {
    const map = { 
      'header-row': 'bg-slate-100', 
      production: 'bg-indigo-50/30', 
      wastage: 'bg-amber-50/30', 
      consumption: 'bg-blue-50/30', 
      manpower: 'bg-green-50/30', 
      breakdown: 'bg-red-50/30',
      merged: 'bg-slate-50',
      breakdown_item: 'bg-white'
    };
    return map[s] || '';
  };

  const colCount = 3 + selectedMachines.length; // Variety + UOM + machines + Remarks

  return (
    <div className="max-w-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Document Header */}
        <div className="border-b border-slate-200">
          <div className="grid grid-cols-12 border-b border-slate-200">
            <div className="col-span-12 md:col-span-8 px-6 py-4 space-y-1">
              <h2 className="text-lg font-extrabold text-slate-900">GOGOI PRIVATE LIMITED</h2>
              <h3 className="text-sm font-bold text-indigo-700 uppercase">PACKING SHIFT REPORT (SANKO MACHINE)</h3>
              <div className="text-xs text-slate-500">Format No.:</div>
            </div>
            <div className="col-span-12 md:col-span-4 px-6 py-4 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Issue/Rev. No.</span><span className="font-bold text-slate-800">01/00</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Effective Date</span><span className="font-bold text-slate-800">01.01.2025</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Page No.</span><span className="font-bold text-slate-800">1 of 1</span></div>
            </div>
          </div>

          {/* Machine Selection Checkboxes */}
          <div className="px-6 py-3 border-b border-slate-200 bg-indigo-50/50">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Select Running Machines</label>
            <div className="flex flex-wrap gap-3">
              {availableMachines.map(m => {
                const active = selectedMachines.includes(m);
                return (
                  <button key={m} type="button" onClick={() => toggleMachine(m)}
                    className={clsx("flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all",
                      active
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                        : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400 hover:text-indigo-600")}>
                    <div className={clsx("w-4 h-4 rounded border-2 flex items-center justify-center",
                      active ? "bg-white border-white" : "border-slate-400")}>
                      {active && <Check className="w-3 h-3 text-indigo-600" />}
                    </div>
                    {m}
                  </button>
                );
              })}
            </div>
            {selectedMachines.length > 0 && (
              <div className="mt-2 text-xs text-indigo-700 font-medium">
                Active: <span className="font-bold">{machineLabel}</span> — {selectedMachines.length} column{selectedMachines.length > 1 ? 's' : ''} will show
              </div>
            )}
          </div>

          {/* Header Fields */}
          <div className="grid grid-cols-2 lg:grid-cols-5 border-t border-slate-200 bg-white">
            <div className="px-4 py-3 border-b border-r border-slate-200 lg:border-b-0">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Location</label>
              <select 
                name="location" 
                value={header.location} 
                onChange={handleHeaderChange}
                disabled={user.role !== 'Admin'}
                className={clsx(
                  "w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 bg-white",
                  user.role !== 'Admin' && "bg-slate-50 cursor-not-allowed opacity-75"
                )}
              >
                <option>SHED NO 1</option><option>SHED NO 2</option><option>SHED NO 3</option>
              </select>
            </div>
            <div className="px-4 py-3 border-b border-slate-200 lg:border-b-0 lg:border-r">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
              <input type="date" name="date" value={header.date} onChange={handleHeaderChange} onKeyDown={preventEnter}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="px-4 py-3 border-b border-r border-slate-200 lg:border-b-0">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Shift</label>
              <input type="text" name="shift" value={header.shift} onChange={handleHeaderChange} onKeyDown={preventEnter}
                placeholder="e.g. A / B / C" className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="px-4 py-3 border-b border-slate-200 lg:border-b-0 lg:border-r">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Shift Incharge</label>
              <input type="text" name="shiftIncharge" value={header.shiftIncharge} onChange={handleHeaderChange} onKeyDown={preventEnter}
                placeholder="Name" className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="col-span-2 lg:col-span-1 px-4 py-3 bg-amber-50/50">
              <label className="block text-xs font-semibold text-amber-700 uppercase mb-1 font-bold">Variety / SKU Name</label>
              <input type="text" name="varietySKU" value={header.varietySKU} onChange={handleHeaderChange} onKeyDown={preventEnter}
                placeholder="e.g. Product Name" className="w-full px-3 py-1.5 border border-amber-300 rounded text-sm focus:ring-2 focus:ring-amber-500 font-bold" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto" onKeyDown={preventEnter}>
          {error && (
            <div className="mx-6 mt-4 flex items-center gap-2 text-red-700 bg-red-50 p-4 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />{error}
            </div>
          )}

          {selectedMachines.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <div className="text-4xl mb-3">⚙️</div>
              <div className="font-semibold text-lg text-slate-500">No Machine Selected</div>
              <div className="text-sm mt-1">Select at least one machine above to start entering data.</div>
            </div>
          ) : (
            <table className="min-w-[900px] text-sm border-collapse">
              <thead>
                <tr className="bg-slate-700 text-white">
                  <th className="px-3 py-2.5 text-xs font-semibold text-left border-r border-slate-600 w-[280px]">Variety</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-center border-r border-slate-600 w-[70px]">UOM</th>
                  {selectedMachines.map(m => (
                    <th key={m} className="px-3 py-2.5 text-xs font-semibold text-center border-r border-slate-600 bg-indigo-800">{m}</th>
                  ))}
                  <th className="px-3 py-2.5 text-xs font-semibold text-center">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {SHIFT_ROWS.map((row) => {
                  if (row.section === 'separator') {
                    return <tr key={row.key}><td colSpan={colCount} className="h-2 bg-slate-100 border-y border-slate-200"></td></tr>;
                  }
                  const isManpower = row.section === 'manpower';
                  const isMerged = row.section === 'merged';
                  const isDynamicBreakdown = row.section === 'breakdown_dynamic';

                  if (isDynamicBreakdown) {
                    return selectedMachines.map((m, bIdx) => (
                      <tr key={`${row.key}_${m}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        {bIdx === 0 && (
                          <td rowSpan={selectedMachines.length} className="px-3 py-1.5 text-xs font-bold text-slate-800 border-r border-slate-200 bg-slate-50 align-middle text-center">
                            Machine Breakdown(Min) with reason
                          </td>
                        )}
                        <td className="px-3 py-1.5 text-xs text-center text-indigo-700 border-r border-slate-200 font-bold bg-indigo-50/50">
                          {m}
                        </td>
                        <td colSpan={selectedMachines.length + 1} className="px-1 py-1 border-r border-slate-200">
                          <textarea 
                            value={data[`${row.key}_${m}`] || ''}
                            onChange={e => {
                              handleDataChange(`${row.key}_${m}`, e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onKeyDown={preventEnter}
                            rows={1}
                            placeholder={`Enter Breakdown details for ${m}...`}
                            className="w-full px-2 py-1.5 border-0 bg-transparent text-xs focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded font-medium resize-none overflow-hidden min-h-[32px]"
                          />
                        </td>
                      </tr>
                    ));
                  }

                  return (
                    <tr key={row.key} className={clsx("border-b border-slate-200 hover:bg-slate-50 transition-colors", sectionBg(row.section))}>
                      <td className="px-3 py-1.5 text-xs font-bold text-slate-800 border-r border-slate-200">{row.label}</td>
                      <td className="px-3 py-1.5 text-xs text-center text-slate-500 border-r border-slate-200 font-bold">{row.uom}</td>
                      {(isManpower || isMerged) ? (
                        <td colSpan={selectedMachines.length} className="px-1 py-1 border-r border-slate-200">
                          <input type="text" value={data[`${row.key}_common`] || ''}
                            onChange={e => handleDataChange(`${row.key}_common`, e.target.value)}
                            onKeyDown={preventEnter}
                            placeholder={isManpower ? "Common Manpower for all lines" : "Enter details"}
                            className="w-full px-2 py-1.5 border-0 bg-transparent text-xs text-center focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded font-bold" />
                        </td>
                      ) : (
                        selectedMachines.map(m => (
                          <td key={m} className="px-1 py-1 border-r border-slate-200">
                            <input type="text" value={data[`${row.key}_${m}`] || ''}
                              onChange={e => handleDataChange(`${row.key}_${m}`, e.target.value)}
                              onKeyDown={preventEnter}
                              className="w-full px-2 py-1.5 border-0 bg-transparent text-xs text-center focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded" />
                          </td>
                        ))
                      )}
                      <td className="px-1 py-1">
                        <input type="text" value={data[`${row.key}_remarks`] || ''}
                          onChange={e => handleDataChange(`${row.key}_remarks`, e.target.value)}
                          onKeyDown={preventEnter}
                          className="w-full px-2 py-1.5 border-0 bg-transparent text-xs focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Action Bar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={saveDraft}
              className={clsx("flex items-center px-4 py-2.5 font-semibold rounded-lg transition-all text-sm border",
                draftSaved ? "bg-green-50 text-green-700 border-green-300" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100")}>
              {draftSaved ? <Check className="w-4 h-4 mr-2" /> : <FileDown className="w-4 h-4 mr-2" />}
              {draftSaved ? 'Draft Saved!' : 'Save as Draft'}
            </button>
            <button type="button" onClick={clearDraft}
              className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">Clear Draft</button>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setShowPreview(true)}
              className="flex items-center px-5 py-2.5 bg-white border border-indigo-300 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-50 transition-colors text-sm">
              <Eye className="w-4 h-4 mr-2" />Preview
            </button>
            <button type="button" onClick={handleSubmit} disabled={loading}
              className="flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 text-sm">
              <Send className="w-4 h-4 mr-2" />{loading ? 'Submitting...' : 'Final Submit'}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50 rounded-t-2xl flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">📋 Preview — Packing Shift Report</h2>
                <p className="text-xs text-slate-500 mt-0.5">Review all data before final submission</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="p-1.5 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[['Machines', machineLabel], ['Location', header.location], ['Date', header.date], ['Shift', header.shift || '—'], ['Shift Incharge', header.shiftIncharge || '—']].map(([l, v]) => (
                  <div key={l} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-0.5">{l}</div>
                    <div className="text-sm font-bold text-slate-900">{v}</div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-100 p-4 rounded-xl overflow-x-auto">
                <ShiftReportView 
                  data={data} 
                  header={header} 
                  selectedMachines={selectedMachines} 
                  SHIFT_ROWS={SHIFT_ROWS} 
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setShowPreview(false)} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 text-sm">Back to Edit</button>
              <button onClick={() => { setShowPreview(false); handleSubmit(); }} disabled={loading}
                className="flex items-center px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md disabled:opacity-50 text-sm">
                <Send className="w-4 h-4 mr-2" />{loading ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
