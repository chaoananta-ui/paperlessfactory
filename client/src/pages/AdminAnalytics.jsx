import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, ComposedChart, Area
} from 'recharts';
import { 
  Download, FileText, Presentation, FileSpreadsheet, Activity, 
  TrendingUp, Calendar, Filter, Factory 
} from 'lucide-react';
import { 
  format, parseISO, startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear,
  isAfter, subDays, subMonths, subYears, getWeek
} from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import pptxgen from 'pptxgenjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import clsx from 'clsx';

const COLORS = {
  Shed1: '#4f46e5', // Indigo
  Shed2: '#10b981', // Emerald
  Shed3: '#f59e0b', // Amber
  Created: '#94a3b8', // Slate
  Completed: '#3b82f6' // Blue
};

const DEPARTMENTS = {
  'Packing Shift Report': 'Production',
  'Laminate Record for GSM Verification': 'Production',
  // Future mappings
  'QC Report': 'Quality Control',
  'Maintenance Log': 'Maintenance',
  'Store Issue': 'Store'
};

export default function AdminAnalytics() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week'); // day, week, month, quarter, year
  const [dateRange, setDateRange] = useState('30d'); // 7d, 30d, 90d, 1y, all
  const dashboardRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Data Processing Engine ---
  
  const filteredData = useMemo(() => {
    const now = new Date();
    let limitDate;
    if (dateRange === '7d') limitDate = subDays(now, 7);
    else if (dateRange === '30d') limitDate = subDays(now, 30);
    else if (dateRange === '90d') limitDate = subMonths(now, 3);
    else if (dateRange === '1y') limitDate = subYears(now, 1);
    
    return limitDate 
      ? documents.filter(d => isAfter(parseISO(d.createdAt), limitDate))
      : documents;
  }, [documents, dateRange]);

  const timeSeriesData = useMemo(() => {
    const map = {};
    
    filteredData.forEach(doc => {
      const date = parseISO(doc.createdAt);
      let key = '';
      let display = '';

      if (timeframe === 'day') {
        key = format(startOfDay(date), 'yyyy-MM-dd');
        display = format(date, 'dd MMM');
      } else if (timeframe === 'week') {
        key = `${format(date, 'yyyy')}-W${getWeek(date)}`;
        display = `Week ${getWeek(date)}`;
      } else if (timeframe === 'month') {
        key = format(startOfMonth(date), 'yyyy-MM');
        display = format(date, 'MMM yyyy');
      } else if (timeframe === 'quarter') {
        key = `${format(date, 'yyyy')}-Q${Math.floor((date.getMonth() / 3)) + 1}`;
        display = `Q${Math.floor((date.getMonth() / 3)) + 1} ${format(date, 'yyyy')}`;
      } else if (timeframe === 'year') {
        key = format(startOfYear(date), 'yyyy');
        display = format(date, 'yyyy');
      }

      if (!map[key]) {
        map[key] = { 
          name: display, key, sortDate: date.getTime(),
          Shed1_Created: 0, Shed1_Completed: 0,
          Shed2_Created: 0, Shed2_Completed: 0,
          Shed3_Created: 0, Shed3_Completed: 0,
          Total_Created: 0, Total_Completed: 0
        };
      }

      const shedKey = doc.location === 'SHED NO 1' ? 'Shed1' : 
                      doc.location === 'SHED NO 2' ? 'Shed2' : 
                      doc.location === 'SHED NO 3' ? 'Shed3' : null;

      if (shedKey) {
        map[key][`${shedKey}_Created`]++;
        map[key].Total_Created++;
        if (doc.status === 'Completed') {
          map[key][`${shedKey}_Completed`]++;
          map[key].Total_Completed++;
        }
      }
    });

    return Object.values(map).sort((a, b) => a.sortDate - b.sortDate);
  }, [filteredData, timeframe]);

  const departmentData = useMemo(() => {
    const map = {};
    filteredData.forEach(doc => {
      const dept = DEPARTMENTS[doc.type] || 'Other';
      if (!map[dept]) map[dept] = { name: dept, Created: 0, Completed: 0 };
      map[dept].Created++;
      if (doc.status === 'Completed') map[dept].Completed++;
    });
    return Object.values(map);
  }, [filteredData]);

  const shedPerformance = useMemo(() => {
    return [
      { name: 'SHED NO 1', Created: 0, Completed: 0, fill: COLORS.Shed1 },
      { name: 'SHED NO 2', Created: 0, Completed: 0, fill: COLORS.Shed2 },
      { name: 'SHED NO 3', Created: 0, Completed: 0, fill: COLORS.Shed3 }
    ].map(shed => {
      const docs = filteredData.filter(d => d.location === shed.name);
      return {
        ...shed,
        Created: docs.length,
        Completed: docs.filter(d => d.status === 'Completed').length,
        Effectiveness: docs.length > 0 ? Math.round((docs.filter(d => d.status === 'Completed').length / docs.length) * 100) : 0
      };
    });
  }, [filteredData]);


  // --- Export Functions ---

  const exportPDF = async () => {
    if (!dashboardRef.current) return;
    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.text("Factory Effectiveness Report", 14, 15);
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
      pdf.addImage(imgData, 'PNG', 0, 30, pdfWidth, pdfHeight);
      pdf.save(`Factory_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (err) {
      alert("Failed to export PDF.");
      console.error(err);
    }
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    
    // Timeline Sheet
    const ws1 = workbook.addWorksheet('Timeline Data');
    ws1.columns = [
      { header: 'Period', key: 'name', width: 20 },
      { header: 'Total Created', key: 'Total_Created', width: 15 },
      { header: 'Total Completed', key: 'Total_Completed', width: 15 },
      { header: 'Shed 1 Created', key: 'Shed1_Created', width: 15 },
      { header: 'Shed 1 Completed', key: 'Shed1_Completed', width: 15 },
      { header: 'Shed 2 Created', key: 'Shed2_Created', width: 15 },
      { header: 'Shed 2 Completed', key: 'Shed2_Completed', width: 15 },
      { header: 'Shed 3 Created', key: 'Shed3_Created', width: 15 },
      { header: 'Shed 3 Completed', key: 'Shed3_Completed', width: 15 },
    ];
    timeSeriesData.forEach(row => ws1.addRow(row));
    ws1.getRow(1).font = { bold: true };

    // Shed Performance Sheet
    const ws2 = workbook.addWorksheet('Shed Performance');
    ws2.columns = [
      { header: 'Shed', key: 'name', width: 20 },
      { header: 'Created', key: 'Created', width: 15 },
      { header: 'Completed', key: 'Completed', width: 15 },
      { header: 'Effectiveness (%)', key: 'Effectiveness', width: 20 },
    ];
    shedPerformance.forEach(row => ws2.addRow(row));
    ws2.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Factory_Analytics_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const exportPPT = () => {
    const pres = new pptxgen();
    
    // Title Slide
    let slide = pres.addSlide();
    slide.addText("Factory Effectiveness Report", { x: 1, y: 2, w: '80%', h: 1, fontSize: 36, bold: true, color: '363636' });
    slide.addText(`Generated on ${new Date().toLocaleString()}`, { x: 1, y: 3, w: '80%', h: 1, fontSize: 18, color: '888888' });

    // Data Slide
    let slide2 = pres.addSlide();
    slide2.addText("Shed Performance Overview", { x: 0.5, y: 0.5, fontSize: 24, bold: true });
    
    const tableData = [
      ['Shed', 'Created', 'Completed', 'Effectiveness']
    ];
    shedPerformance.forEach(s => tableData.push([s.name, s.Created, s.Completed, `${s.Effectiveness}%`]));
    
    slide2.addTable(tableData, { x: 0.5, y: 1.5, w: 9, fill: 'F7F7F7', color: '363636', fontSize: 14, border: { pt: 1, color: 'CCCCCC' }});

    pres.writeFile({ fileName: `Factory_Presentation_${format(new Date(), 'yyyyMMdd')}.pptx` });
  };


  if (loading) return <div className="p-12 text-center text-slate-500 animate-pulse">Loading big data analytics...</div>;

  return (
    <div className="space-y-6">
      
      {/* Top Control Bar */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-slate-100 rounded-lg p-1 overflow-x-auto scrollbar-none whitespace-nowrap flex-nowrap max-w-full">
            {['day', 'week', 'month', 'quarter', 'year'].map(t => (
              <button key={t} onClick={() => setTimeframe(t)} className={clsx("px-4 py-1.5 text-xs font-bold rounded-md capitalize transition-all flex-shrink-0", timeframe === t ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
                {t}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="text-sm font-bold border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-auto">
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-bold border border-green-200 transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-bold border border-red-200 transition-colors">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={exportPPT} className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-sm font-bold border border-orange-200 transition-colors">
            <Presentation className="w-4 h-4" /> PPT
          </button>
        </div>
      </div>

      {/* Dashboard Content to capture for PDF */}
      <div ref={dashboardRef} className="space-y-6 pb-4" style={{ backgroundColor: '#f8fafc' }}>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shedPerformance.map(shed => (
            <div key={shed.name} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-500">{shed.name} Effectiveness</h4>
                  <div className="text-3xl font-black mt-1" style={{ color: shed.fill }}>
                    {shed.Effectiveness}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-opacity-10" style={{ backgroundColor: shed.fill + '20', color: shed.fill }}>
                  <Factory className="w-6 h-6" />
                </div>
              </div>
              <div className="flex gap-4 text-sm font-medium">
                <div className="flex items-center gap-1.5 text-slate-600"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Created: {shed.Created}</div>
                <div className="flex items-center gap-1.5 text-indigo-600"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Completed: {shed.Completed}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Effectiveness Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> 
            Completion Trend ({timeframe}-wise)
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                
                <Area type="monotone" dataKey="Total_Created" name="Total Created" fill="#e2e8f0" stroke="#cbd5e1" />
                <Line type="monotone" dataKey="Shed1_Completed" name="Shed 1 Completed" stroke={COLORS.Shed1} strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Shed2_Completed" name="Shed 2 Completed" stroke={COLORS.Shed2} strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Shed3_Completed" name="Shed 3 Completed" stroke={COLORS.Shed3} strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shed Comparison Bar Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Shed Comparison (Created vs Completed)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shedPerformance} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="Created" fill={COLORS.Created} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completed" fill={COLORS.Completed} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Breakdown Bar Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Department Effectiveness</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} width={100} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  <Bar dataKey="Created" fill={COLORS.Created} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Completed" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
