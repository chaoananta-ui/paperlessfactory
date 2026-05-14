import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { 
  Check, ShieldAlert, CheckCircle, Eye, X, Clock, MapPin, Package, FileText, User, Trash2,
  ChevronDown, FileSpreadsheet, File as FileIcon, Download 
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import ShiftReportView from '../components/ShiftReportView';
import LaminateGSMView from '../components/LaminateGSMView';
import { SHIFT_ROWS } from '../services/reportConstants';
import { exportShiftReportToExcel, exportGSMRecordToExcel } from '../services/excelExport';
import { exportShiftReportToPDF, exportGSMRecordToPDF } from '../services/pdfExport';

export default function Approval() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/documents/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let filtered = res.data;
      const role = user.role?.toLowerCase();
      if (role === 'checker') {
        filtered = res.data.filter(d => d.status === 'Pending at Checked By');
      } else if (role === 'verifier') {
        filtered = res.data.filter(d => d.status === 'Pending at Verified By');
      } else if (role === 'admin') {
        filtered = res.data;
      } else {
        filtered = [];
      }
      
      setDocuments(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/documents/${id}/status`, 
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedDoc(null);
      fetchDocuments();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    }
  };

  const parseData = (dataStr) => {
    try { return JSON.parse(dataStr); } catch { return {}; }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading queue...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Approval Queue</h1>
        <p className="text-slate-500 mt-1">
          {user.role?.toLowerCase() === 'checker' ? 'Documents pending your check — click View to review before approving.' : 
           user.role?.toLowerCase() === 'verifier' ? 'Documents pending your final verification — click View to review before approving.' : 
           user.role?.toLowerCase() === 'admin' ? 'Administrative dashboard for document management.' :
           'You do not have authorization to approve documents.'}
        </p>
      </div>

      {(user.role?.toLowerCase() === 'dataentry') ? (
        <div className="bg-amber-50 text-amber-800 p-6 rounded-xl border border-amber-200 flex items-center gap-4">
          <ShieldAlert className="w-8 h-8 text-amber-500" />
          <div>
            <h3 className="font-bold text-lg">Access Restricted</h3>
            <p className="text-sm">Your current role ({user.role}) does not have approval permissions.</p>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-slate-200">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">All Caught Up!</h3>
          <p className="text-slate-500">There are no documents pending your approval in the queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className={clsx("h-2", doc.status === 'Pending at Checked By' ? "bg-amber-400" : "bg-blue-500")}></div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">REC-{String(doc.id).padStart(4, '0')}</div>
                    <h3 className="font-bold text-lg text-slate-800 mt-1">{doc.type}</h3>
                  </div>
                  <span className={clsx("text-xs font-semibold px-2 py-1 rounded border", 
                    doc.status === 'Pending at Checked By' ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-blue-100 text-blue-800 border-blue-200"
                  )}>
                    {doc.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex justify-between">
                    <span className="font-medium">Item Name:</span>
                    <span className="text-slate-900">{doc.itemName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Location:</span>
                    <span className="text-slate-900">{doc.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Submitted By:</span>
                    <span className="text-slate-900">{doc.createdBy?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Date:</span>
                    <span className="text-slate-900">{format(new Date(doc.createdAt), 'dd MMM yyyy')}</span>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    onClick={() => setSelectedDoc(doc)}
                    className="flex-1 flex justify-center items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors border border-slate-200"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ====== Document Detail Modal ====== */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={clsx("px-6 py-5 rounded-t-2xl flex justify-between items-start",
              selectedDoc.status === 'Pending at Checked By' ? "bg-amber-50 border-b border-amber-200" : "bg-blue-50 border-b border-blue-200"
            )}>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  REC-{String(selectedDoc.id).padStart(4, '0')}
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedDoc.type}</h2>
                <span className={clsx("mt-2 inline-block text-xs font-semibold px-2 py-1 rounded border",
                  selectedDoc.status === 'Pending at Checked By' ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-blue-100 text-blue-800 border-blue-200"
                )}>
                  {selectedDoc.status}
                </span>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Key info grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-1">
                    <MapPin className="w-3 h-3" /> Location
                  </div>
                  <div className="text-sm font-bold text-slate-900">{selectedDoc.location}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-1">
                    <Package className="w-3 h-3" /> Item Name
                  </div>
                  <div className="text-sm font-bold text-slate-900">{selectedDoc.itemName}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-1">
                    <User className="w-3 h-3" /> Submitted By
                  </div>
                  <div className="text-sm font-bold text-slate-900">{selectedDoc.createdBy?.name}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-1">
                    <Clock className="w-3 h-3" /> Submitted On
                  </div>
                  <div className="text-sm font-bold text-slate-900">{format(new Date(selectedDoc.createdAt), 'dd MMM yyyy, hh:mm a')}</div>
                </div>
              </div>

              {/* Form Data Section */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                  <FileText className="w-4 h-4" /> Form Data
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
                        <span className="text-sm font-semibold text-slate-900">
                          {typeof value === 'object' ? (Array.isArray(value) ? value.join(', ') : 'Nested Data') : (value || '—')}
                        </span>
                      </div>
                    ))}
                    {Object.keys(parseData(selectedDoc.data)).length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-400 text-center">No form data recorded.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Checker signature */}
              {selectedDoc.checkedBy && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">Checker Signature</h3>
                  <div className="text-sm text-green-900">
                    <span className="font-semibold">{selectedDoc.checkedBy.name}</span> — Checked on {selectedDoc.checkedAt ? format(new Date(selectedDoc.checkedAt), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer — Action Buttons */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-between items-center">
              <div className="relative">
                {(selectedDoc.type === 'Packing Shift Report' || selectedDoc.type === 'Laminate Record for GSM Verification') && (
                  <>
                    <button 
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-semibold shadow-sm"
                    >
                      <Download className="w-4 h-4" /> 
                      Export
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
                      if (!confirm('Are you sure you want to PERMANENTLY delete this document?')) return;
                      try {
                        const token = localStorage.getItem('token');
                        await axios.delete(`${API_URL}/api/documents/${selectedDoc.id}`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        setSelectedDoc(null);
                        setDocuments(docs => docs.filter(d => d.id !== selectedDoc.id));
                      } catch (err) {
                        alert('Failed to delete');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-bold border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" /> 
                    Delete
                  </button>
                )}
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-semibold shadow-sm"
                >
                  Close
                </button>

                {(user.role?.toLowerCase() === 'checker' || user.role?.toLowerCase() === 'admin') && selectedDoc.status === 'Pending at Checked By' && (
                  <button 
                    onClick={() => handleAction(selectedDoc.id, 'check')}
                    className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Authorize & Forward
                  </button>
                )}
                {(user.role?.toLowerCase() === 'verifier' || user.role?.toLowerCase() === 'admin') && selectedDoc.status === 'Pending at Verified By' && (
                  <button 
                    onClick={() => handleAction(selectedDoc.id, 'verify')}
                    className="flex items-center px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Final Verify
                  </button>
                )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
