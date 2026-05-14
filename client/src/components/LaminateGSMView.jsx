import { format, parseISO, isValid } from 'date-fns';

const COLUMNS = [
  { key: 'rollNo', label: 'ROLL NO' },
  { key: 'vendor', label: 'VENDOR' },
  { key: 'declaredNetWt', label: 'DECLARED NETWT (Kg)' },
  { key: 'vendorDeclaredLength', label: 'VENDOR DECLARED LENGTH(m)' },
  { key: 'noOfPouchesVendorData', label: 'NO OF POUCHES VENDOR DATA' },
  { key: 'wtRecordedAtUnit', label: 'WT RECORDED (Kg) AT UNIT' },
  { key: 'rollDiameterAtUnit', label: 'ROLL DIAMETER AT UNIT (mm)' },
  { key: 'eyemarkCountedAtUnit', label: 'EYEMARK COUNTED AT UNIT' },
  { key: 'noOfUnprintedPouches', label: 'NO OF UNPRINTED POUCHES' },
  { key: 'operatorSignature', label: 'Operator signature' },
  { key: 'remarks', label: 'REMARKS' },
];

export default function LaminateGSMView({ data = [], header = {}, docStatus = {} }) {
  const safeFormatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, 'dd.MM.yyyy') : '—';
  };

  const safeFormatTime = (dateStr) => {
    if (!dateStr) return '—';
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, 'dd.MM.yy HH:mm') : '—';
  };

  return (
    <div className="bg-white border border-slate-300 rounded shadow-sm text-[11px] leading-tight overflow-x-auto">
      {/* Header Table */}
      <table className="w-full border-collapse border-b border-slate-300">
        <tbody>
          <tr>
            <td colSpan="8" className="p-2 border-r border-slate-300 font-extrabold text-sm uppercase">GOGOI PRIVATE LIMITED</td>
            <td colSpan="3" className="p-1 border-slate-300">
              <div className="flex justify-between px-1"><span>Issue/ Rev. No.</span> <span className="font-bold">01/00</span></div>
            </td>
          </tr>
          <tr>
            <td colSpan="8" className="p-2 border-r border-slate-300 font-bold uppercase">LAMINATE RECORD FOR GSM VERIFICATION</td>
            <td colSpan="3" className="p-1 border-slate-300">
              <div className="flex justify-between px-1"><span>Effective date</span> <span className="font-bold">01.01.2026</span></div>
            </td>
          </tr>
          <tr>
            <td colSpan="8" className="p-2 border-r border-slate-300 font-medium">Format No. : 5.Format</td>
            <td colSpan="3" className="p-1 border-slate-300">
              <div className="flex justify-between px-1"><span>Page No.</span> <span className="font-bold">1 of 1</span></div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Sub-header */}
      <div className="grid grid-cols-4 border-b border-slate-300 bg-slate-50 font-bold uppercase text-[10px]">
        <div className="p-2 border-r border-slate-200">Date: {safeFormatDate(header.date)}</div>
        <div className="p-2 border-r border-slate-200">Shift: {header.shift || '—'}</div>
        <div className="p-2 border-r border-slate-200">SKU: {header.sku || '—'}</div>
        <div className="p-2">Rewinder No: {header.rewinderNo || '—'}</div>
      </div>

      {/* Main Data Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-100 text-center uppercase font-bold text-[9px]">
            <th className="p-2 border border-slate-300 w-8">#</th>
            {COLUMNS.map(col => (
              <th key={col.key} className="p-2 border border-slate-300">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? data.map((row, idx) => (
            <tr key={idx} className="text-center hover:bg-slate-50">
              <td className="p-2 border border-slate-200 font-bold text-slate-400">{idx + 1}</td>
              {COLUMNS.map(col => (
                <td key={col.key} className="p-2 border border-slate-200">{row[col.key] || '—'}</td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={COLUMNS.length + 1} className="p-8 text-center text-slate-400 italic font-medium">No data entries recorded for this document.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Signatures */}
      <div className="p-6 grid grid-cols-2 gap-20 mt-4">
        <div className="space-y-2">
          <div className="border-t border-slate-400 pt-1 text-center font-bold">Signature ( Production Shift Incharge)</div>
          {docStatus.checkedBy ? (
            <div className="text-center bg-green-50 rounded p-2 border border-green-200">
              <div className="text-green-700 font-bold italic">Digitally Signed by {docStatus.checkedBy.name}</div>
              <div className="text-[9px] text-green-600">{safeFormatTime(docStatus.checkedAt)}</div>
            </div>
          ) : (
            <div className="text-center text-slate-300 italic">Pending Authorization</div>
          )}
        </div>
        <div className="space-y-2">
          <div className="border-t border-slate-400 pt-1 text-center font-bold">Signature ( Quality Control)</div>
          {docStatus.verifiedBy ? (
            <div className="text-center bg-blue-50 rounded p-2 border border-blue-200">
              <div className="text-blue-700 font-bold italic">Digitally Verified by {docStatus.verifiedBy.name}</div>
              <div className="text-[9px] text-blue-600">{safeFormatTime(docStatus.verifiedAt)}</div>
            </div>
          ) : (
            <div className="text-center text-slate-300 italic">Pending Verification</div>
          )}
        </div>
      </div>
    </div>
  );
}
