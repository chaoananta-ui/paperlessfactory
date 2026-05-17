import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Save, AlertCircle, Plus, Trash2, Eye, X, FileDown, Send, Check } from 'lucide-react';
import clsx from 'clsx';

const FORM_CONFIGS = {
  'laminate-gsm': {
    title: 'Laminate Record for GSM Verification',
    formatNo: '5.Format',
    issueRevNo: '01/00',
    effectiveDate: '01.01.2026',
  }
};

const COLUMNS = [
  { key: 'rollNo', label: 'ROLL NO', type: 'text' },
  { key: 'vendor', label: 'VENDOR', type: 'text' },
  { key: 'declaredNetWt', label: 'DECLARED NETWT (Kg)', type: 'number' },
  { key: 'vendorDeclaredLength', label: 'VENDOR DECLARED LENGTH(m)', type: 'number' },
  { key: 'noOfPouchesVendorData', label: 'NO OF POUCHES VENDOR DATA', type: 'number' },
  { key: 'wtRecordedAtUnit', label: 'WT RECORDED (Kg) AT UNIT', type: 'number' },
  { key: 'rollDiameterAtUnit', label: 'ROLL DIAMETER AT UNIT (mm)', type: 'number' },
  { key: 'eyemarkCountedAtUnit', label: 'EYEMARK COUNTED AT UNIT', type: 'number' },
  { key: 'noOfUnprintedPouches', label: 'NO OF UNPRINTED POUCHES', type: 'number' },
  { key: 'operatorSignature', label: 'OPERATOR SIGNATURE', type: 'text' },
  { key: 'remarks', label: 'REMARKS', type: 'text' },
];

const EMPTY_ROW = Object.fromEntries(COLUMNS.map(c => [c.key, '']));

export default function EntryForm() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'unknown';
  const config = FORM_CONFIGS[type] || FORM_CONFIGS['laminate-gsm'];
  const { user } = useAuth();
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const DRAFT_KEY = `draft_${type}`;

  const [headerData, setHeaderData] = useState({
    date: new Date().toISOString().split('T')[0],
    shift: '', sku: '', rewinderNo: '',
    location: 'SHED NO 1', itemName: '',
  });

  const [rows, setRows] = useState([{ ...EMPTY_ROW }]);
  const [genericData, setGenericData] = useState({ notes: '', quantity: '' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.headerData) {
          setHeaderData({
            ...draft.headerData,
            location: (user.role !== 'Admin' && user.location) ? user.location : draft.headerData.location
          });
        }
        if (draft.rows && draft.rows.length > 0) setRows(draft.rows);
        if (draft.genericData) setGenericData(draft.genericData);
      } catch {}
    } else if (user && user.role !== 'Admin' && user.location) {
      setHeaderData(prev => ({ ...prev, location: user.location }));
    }
  }, [DRAFT_KEY, user]);

  const handleHeaderChange = (e) => {
    setHeaderData({ ...headerData, [e.target.name]: e.target.value });
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const addRow = () => setRows([...rows, { ...EMPTY_ROW }]);

  const removeRow = (index) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  // Handle Enter key: move to next cell or add row at the end
  const handleCellKeyDown = (e, rowIdx, colIdx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      const nextColIdx = colIdx + 1;
      if (nextColIdx < COLUMNS.length) {
        // Move to next cell in same row
        focusCell(rowIdx, nextColIdx);
      } else {
        // End of row — move to first cell of next row, or add new row
        if (rowIdx + 1 < rows.length) {
          focusCell(rowIdx + 1, 0);
        } else {
          // Add new row and focus its first cell
          setRows(prev => {
            const newRows = [...prev, { ...EMPTY_ROW }];
            setTimeout(() => focusCell(newRows.length - 1, 0), 50);
            return newRows;
          });
        }
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      // Tab also moves nicely but we let default behavior work
    }
  };

  const focusCell = (rowIdx, colIdx) => {
    if (!tableRef.current) return;
    const input = tableRef.current.querySelector(`[data-row="${rowIdx}"][data-col="${colIdx}"]`);
    if (input) input.focus();
  };

  // Save as Draft (localStorage)
  const saveDraft = () => {
    const draft = { headerData, rows, genericData, savedAt: new Date().toISOString() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  // Clear draft
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHeaderData({ date: new Date().toISOString().split('T')[0], shift: '', sku: '', rewinderNo: '', location: 'SHED NO 1', itemName: '' });
    setRows([{ ...EMPTY_ROW }]);
    setGenericData({ notes: '', quantity: '' });
  };

  // Final Submit
  const handleSubmit = async () => {
    if (user.role !== 'DataEntry') {
      setError('Only DataEntry role can submit forms.');
      return;
    }
    setLoading(true);
    setError('');

    const formData = type === 'laminate-gsm'
      ? { ...headerData, rows }
      : { ...headerData, ...genericData };

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/documents`, {
        type: config.title,
        location: headerData.location,
        itemName: headerData.itemName || headerData.sku || 'N/A',
        data: formData,
      }, { headers: { Authorization: `Bearer ${token}` } });

      localStorage.removeItem(DRAFT_KEY);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  // Prevent form-level Enter submission
  const preventEnterSubmit = (e) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  const isLaminateGSM = type === 'laminate-gsm';

  return (
    <div className={isLaminateGSM ? "max-w-full" : "max-w-3xl mx-auto"}>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* ===== Document Header ===== */}
        <div className="border-b border-slate-200">
          <div className="grid grid-cols-12 border-b border-slate-200">
            <div className="col-span-12 md:col-span-8 px-6 py-4 space-y-1">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">GOGOI PRIVATE LIMITED</h2>
              <h3 className="text-sm font-bold text-indigo-700 uppercase">{config.title}</h3>
              {config.formatNo && (
                <div className="text-xs text-slate-500">Format No.: <span className="font-semibold text-slate-700">{config.formatNo}</span></div>
              )}
            </div>
            <div className="col-span-12 md:col-span-4 px-6 py-4 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 text-xs space-y-1">
              {config.issueRevNo && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Issue/Rev. No.</span>
                  <span className="font-bold text-slate-800">{config.issueRevNo}</span>
                </div>
              )}
              {config.effectiveDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Effective Date</span>
                  <span className="font-bold text-slate-800">{config.effectiveDate}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Page No.</span>
                <span className="font-bold text-slate-800">1 of 1</span>
              </div>
            </div>
          </div>

          {isLaminateGSM ? (
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 divide-x-0 md:divide-x divide-slate-200 border-b border-slate-200">
              <HeaderField label="Date" name="date" type="date" value={headerData.date} onChange={handleHeaderChange} onKeyDown={preventEnterSubmit} />
              <HeaderField label="Shift" name="shift" value={headerData.shift} onChange={handleHeaderChange} placeholder="e.g. A / B / C" onKeyDown={preventEnterSubmit} />
              <HeaderField label="SKU" name="sku" value={headerData.sku} onChange={handleHeaderChange} placeholder="Enter SKU" onKeyDown={preventEnterSubmit} />
              <HeaderField label="Rewinder No." name="rewinderNo" value={headerData.rewinderNo} onChange={handleHeaderChange} placeholder="e.g. RW-01" onKeyDown={preventEnterSubmit} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 divide-x-0 md:divide-x divide-slate-200 border-b border-slate-200">
              <HeaderField label="Location" name="location" value={headerData.location} onChange={handleHeaderChange} isSelect
                disabled={user.role !== 'Admin'}
                options={['SHED NO 1', 'SHED NO 2', 'SHED NO 3']} onKeyDown={preventEnterSubmit} />
              <HeaderField label="Item Name / Subject" name="itemName" value={headerData.itemName} onChange={handleHeaderChange} placeholder="e.g. ADDITIVE, INK" required onKeyDown={preventEnterSubmit} />
            </div>
          )}
        </div>

        {/* ===== Form Body ===== */}
        <div onKeyDown={preventEnterSubmit}>
          {error && (
            <div className="mx-6 mt-4 flex items-center gap-2 text-red-700 bg-red-50 p-4 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {isLaminateGSM ? (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Location / Plant</label>
                  <select 
                    name="location" 
                    value={headerData.location} 
                    onChange={handleHeaderChange}
                    disabled={user.role !== 'Admin'}
                    className={clsx(
                      "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500",
                      user.role !== 'Admin' && "bg-slate-50 cursor-not-allowed opacity-75"
                    )}
                  >
                    <option value="SHED NO 1">SHED NO 1</option>
                    <option value="SHED NO 2">SHED NO 2</option>
                    <option value="SHED NO 3">SHED NO 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Item Name</label>
                  <input type="text" name="itemName" value={headerData.itemName} onChange={handleHeaderChange}
                    onKeyDown={preventEnterSubmit}
                    placeholder="e.g. LAMINATE" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg" ref={tableRef}>
                <table className="min-w-[1300px] text-sm">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="px-2 py-2.5 text-xs font-semibold text-center border-r border-slate-600 w-10">#</th>
                      {COLUMNS.map(col => (
                        <th key={col.key} className="px-2 py-2.5 text-xs font-semibold text-center border-r border-slate-600">{col.label}</th>
                      ))}
                      <th className="px-2 py-2.5 text-xs font-semibold text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-2 py-1 text-center text-xs font-bold text-slate-400 border-r border-slate-100">{rowIdx + 1}</td>
                        {COLUMNS.map((col, colIdx) => (
                          <td key={col.key} className="px-1 py-1 border-r border-slate-100">
                            <input
                              data-row={rowIdx}
                              data-col={colIdx}
                              type={col.type}
                              value={row[col.key]}
                              onChange={e => handleRowChange(rowIdx, col.key, e.target.value)}
                              onKeyDown={e => handleCellKeyDown(e, rowIdx, colIdx)}
                              className="w-full px-2 py-1.5 border-0 bg-transparent text-xs focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded transition-colors"
                              step={col.type === 'number' ? 'any' : undefined}
                            />
                          </td>
                        ))}
                        <td className="px-1 py-1 text-center">
                          {rows.length > 1 && (
                            <button type="button" onClick={() => removeRow(rowIdx)}
                              className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button type="button" onClick={addRow}
                className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors">
                <Plus className="w-4 h-4" /> Add Row
              </button>

              <div className="mt-2 text-xs text-slate-400">
                💡 Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono">Enter</kbd> to move to the next cell. A new row is added automatically at the end of each row.
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Quantity (if applicable)</label>
                  <input type="number" value={genericData.quantity}
                    onChange={e => setGenericData({ ...genericData, quantity: e.target.value })}
                    onKeyDown={preventEnterSubmit}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Additional Notes / Observation</label>
                <textarea value={genericData.notes}
                  onChange={e => setGenericData({ ...genericData, notes: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </div>
          )}

          {/* ===== Action Bar ===== */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={saveDraft}
                className={clsx("flex items-center px-4 py-2.5 font-semibold rounded-lg transition-all text-sm border",
                  draftSaved
                    ? "bg-green-50 text-green-700 border-green-300"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100")}>
                {draftSaved ? <Check className="w-4 h-4 mr-2" /> : <FileDown className="w-4 h-4 mr-2" />}
                {draftSaved ? 'Draft Saved!' : 'Save as Draft'}
              </button>
              <button type="button" onClick={clearDraft}
                className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
                Clear Draft
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowPreview(true)}
                className="flex items-center px-5 py-2.5 bg-white border border-indigo-300 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-50 transition-colors text-sm">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </button>
              <button type="button" onClick={handleSubmit} disabled={loading}
                className="flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 text-sm">
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Submitting...' : 'Final Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ====== Preview Modal ====== */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Preview Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50 rounded-t-2xl flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">📋 Preview — {config.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Review all data before final submission</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <PreviewField label="Date" value={headerData.date} />
                <PreviewField label="Location" value={headerData.location} />
                <PreviewField label="Item Name" value={headerData.itemName || '—'} />
                {isLaminateGSM && <>
                  <PreviewField label="Shift" value={headerData.shift || '—'} />
                  <PreviewField label="SKU" value={headerData.sku || '—'} />
                  <PreviewField label="Rewinder No." value={headerData.rewinderNo || '—'} />
                </>}
                {!isLaminateGSM && <>
                  <PreviewField label="Quantity" value={genericData.quantity || '—'} />
                </>}
              </div>

              {/* Table preview for Laminate */}
              {isLaminateGSM && (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-slate-700 text-white">
                        <th className="px-2 py-2 text-center border-r border-slate-600">#</th>
                        {COLUMNS.map(col => (
                          <th key={col.key} className="px-2 py-2 text-center border-r border-slate-600">{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rows.map((row, idx) => {
                        const hasData = Object.values(row).some(v => v !== '');
                        if (!hasData) return null;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-2 py-2 text-center font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                            {COLUMNS.map(col => (
                              <td key={col.key} className="px-2 py-2 text-center border-r border-slate-100 text-slate-800">
                                {row[col.key] || '—'}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500">
                    Total rows with data: {rows.filter(r => Object.values(r).some(v => v !== '')).length}
                  </div>
                </div>
              )}

              {/* Notes preview for generic forms */}
              {!isLaminateGSM && genericData.notes && (
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase mb-1">Notes / Observation</div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-800 whitespace-pre-wrap">
                    {genericData.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Preview Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setShowPreview(false)}
                className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors text-sm">
                Back to Edit
              </button>
              <button onClick={() => { setShowPreview(false); handleSubmit(); }} disabled={loading}
                className="flex items-center px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 text-sm">
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderField({ label, name, value, onChange, type = 'text', placeholder = '', isSelect = false, options = [], required = false, onKeyDown, disabled = false }) {
  return (
    <div className="px-4 py-3">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      {isSelect ? (
        <select name={name} value={value} onChange={onChange} disabled={disabled}
          className={clsx(
            "w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 bg-white",
            disabled && "bg-slate-50 cursor-not-allowed opacity-75"
          )}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required}
          onKeyDown={onKeyDown} disabled={disabled}
          className={clsx(
            "w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500",
            disabled && "bg-slate-50 cursor-not-allowed opacity-75"
          )} />
      )}
    </div>
  );
}

function PreviewField({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <div className="text-xs font-semibold text-slate-500 uppercase mb-0.5">{label}</div>
      <div className="text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}
