import React from 'react';
import { format, isValid, parseISO } from 'date-fns';

export default function ShiftReportView({ data, header, selectedMachines, SHIFT_ROWS = [], docStatus }) {
  const safeData = data || {};
  const safeHeader = header || {};
  const safeMachines = selectedMachines && selectedMachines.length > 0 ? selectedMachines : ['M/C 1', 'M/C 2', 'M/C 3'];
  const safeStatus = docStatus || {};

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, 'dd.MM.yyyy') : '—';
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isValid(d) ? format(d, 'dd.MM.yy HH:mm') : '—';
  };

  return (
    <div className="bg-white p-6 text-slate-900 font-sans border border-slate-300 shadow-sm mx-auto relative overflow-hidden" style={{ width: '100%', maxWidth: '1100px' }}>
      
      {/* Optional: PENDING Watermark if not fully verified */}
      {(!safeStatus?.verifiedBy) && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-slate-100 text-9xl font-black select-none pointer-events-none opacity-50 z-0">
          PENDING
        </div>
      )}

      <div className="relative z-10">
        {/* Excel Header */}
        <table className="w-full border-collapse border-2 border-slate-900 text-[11px]">
          <tbody>
            <tr>
              <td colSpan="3" className="border-2 border-slate-900 p-2 font-bold text-base">
                GOGOI PRIVATE LIMITED
              </td>
              <td className="border-2 border-slate-900 p-1 font-bold">Issue/ Rev. No.</td>
              <td className="border-2 border-slate-900 p-1 text-center font-bold">01/00</td>
            </tr>
            <tr>
              <td colSpan="3" className="border-2 border-slate-900 p-2 font-bold text-sm">
                PACKING SHIFT REPORT (SANKO MACHINE)
              </td>
              <td className="border-2 border-slate-900 p-1 font-bold">Effective date</td>
              <td className="border-2 border-slate-900 p-1 text-center font-bold">01.12.2025</td>
            </tr>
            <tr>
              <td colSpan="3" className="border-2 border-slate-900 p-2 font-bold">
                Format No. :
              </td>
              <td className="border-2 border-slate-900 p-1 font-bold">Page No.</td>
              <td className="border-2 border-slate-900 p-1 text-center font-bold">1 of 1</td>
            </tr>
          </tbody>
        </table>

        {/* Sub Header */}
        <div className="border-x-2 border-b-2 border-slate-900 p-2 text-sm font-bold grid grid-cols-2 gap-y-1">
          <div>Date:- {formatDate(safeHeader?.date)}</div>
          <div>Shift:- {safeHeader?.shift || '—'}</div>
          <div>Shift Incharge:- {safeHeader?.shiftIncharge || '—'}</div>
          <div className="text-indigo-700">Variety / SKU:- {safeHeader?.varietySKU || '—'}</div>
        </div>

        {/* Main Table */}
        <table className="w-full border-collapse border-2 border-slate-900 text-[11px]">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-2 border-slate-900 p-2 text-center font-bold w-[28%]">Varity:-</th>
              <th className="border-2 border-slate-900 p-2 text-center font-bold w-[10%]">UOM</th>
              {safeMachines.map(m => (
                <th key={m} className="border-2 border-slate-900 p-2 text-center font-bold">{m}</th>
              ))}
              <th className="border-2 border-slate-900 p-2 text-center font-bold w-[18%]">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {SHIFT_ROWS.map((row) => {
              if (row.section === 'separator') return null;
              
              const isManpower = row.section === 'manpower';
              const isMerged = row.section === 'merged';
              const isDynamicBreakdown = row.section === 'breakdown_dynamic';
              
              if (isDynamicBreakdown) {
                return safeMachines.map((m, idx) => (
                  <tr key={`${row.key}_${m}`} className="h-10">
                    {idx === 0 && (
                      <td rowSpan={safeMachines.length} className="border-2 border-slate-900 px-3 py-1 font-bold text-center align-middle bg-slate-50">
                        Machine Breakdown(Min) with reason
                      </td>
                    )}
                    <td className="border-2 border-slate-900 px-1 py-1 text-center font-bold text-indigo-700 bg-indigo-50/30">
                      {m}
                    </td>
                    <td colSpan={safeMachines.length + 1} className="border-2 border-slate-900 px-3 py-1 italic font-medium whitespace-pre-wrap break-words">
                      {safeData[`${row.key}_${m}`] || '—'}
                    </td>
                  </tr>
                ));
              }

              return (
                <tr key={row.key} className="h-8">
                  <td className="border-2 border-slate-900 px-3 py-1 font-bold whitespace-pre-wrap">{row.label}</td>
                  <td className="border-2 border-slate-900 px-1 py-1 text-center font-bold">{row.uom}</td>
                  {(isManpower || isMerged) ? (
                    <td colSpan={safeMachines.length} className="border-2 border-slate-900 px-2 py-1 text-center font-bold bg-slate-50/50 italic">
                      {safeData[`${row.key}_common`] || '—'}
                    </td>
                  ) : (
                    safeMachines.map(m => (
                      <td key={m} className="border-2 border-slate-900 px-1 py-1 text-center">
                        {safeData[`${row.key}_${m}`] || '—'}
                      </td>
                    ))
                  )}
                  <td className="border-2 border-slate-900 px-2 py-1">
                    {safeData[`${row.key}_remarks`] || ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Signature Section */}
        <div className="mt-12 flex justify-between px-10">
          <div className="text-center min-w-[220px]">
            <div className="text-xs italic mb-1 h-4">
              {safeStatus?.checkedBy ? (
                <span className="text-green-700 font-bold">Digitally Signed by {safeStatus.checkedBy.name} on {formatDateTime(safeStatus.checkedAt)}</span>
              ) : (
                <span className="text-slate-400 font-medium tracking-widest">[PENDING CHECKED BY]</span>
              )}
            </div>
            <div className="w-full border-b-2 border-slate-900 mb-2"></div>
            <div className="text-sm font-bold">Signature Shift Incharge</div>
          </div>
          
          <div className="text-center min-w-[220px]">
            <div className="text-xs italic mb-1 h-4">
              {safeStatus?.verifiedBy ? (
                <span className="text-green-700 font-bold">Digitally Verified by {safeStatus.verifiedBy.name} on {formatDateTime(safeStatus.verifiedAt)}</span>
              ) : (
                <span className="text-slate-400 font-medium tracking-widest">[PENDING VERIFIED BY]</span>
              )}
            </div>
            <div className="w-full border-b-2 border-slate-900 mb-2"></div>
            <div className="text-sm font-bold">Signature Production Manager</div>
          </div>
        </div>
      </div>
    </div>
  );
}
