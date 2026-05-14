import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CheckSquare, FileText, BarChart3, LogOut, User, ChevronDown, ChevronRight, Factory, Settings, Database, HardDrive } from 'lucide-react';
import clsx from 'clsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showEntryMenu, setShowEntryMenu] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [activeDept, setActiveDept] = useState(null);
  const [activeReportDept, setActiveReportDept] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [isMaintenance, setIsMaintenance] = useState(false);
  const appLoadTime = useRef(Date.now());

  useEffect(() => {
    // Fetch announcement
    const fetchAnnouncement = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/status`);
        const data = await res.json();
        if (data.announcement !== undefined) setAnnouncement(data.announcement);
        
        // Push Update Logic
        if (data.latestPushUpdate && data.latestPushUpdate > appLoadTime.current) {
          console.log("Push update received, reloading...");
          window.location.reload(true);
        }

        // Maintenance Mode Logic
        if (data.maintenanceMode !== undefined) {
          setIsMaintenance(data.maintenanceMode);
        }
      } catch (err) {
        console.error("Failed to fetch announcement", err);
      }
    };
    fetchAnnouncement();
    // Poll every 30 seconds
    const interval = setInterval(fetchAnnouncement, 30000);
    return () => clearInterval(interval);
  }, []);

  const entryDepartments = [
    { id: 'prod', name: 'Production Dept', icon: <Factory className="w-4 h-4" />, forms: [
      { name: 'Laminate GSM Record', path: '/entry-form?type=laminate-gsm' },
      { name: 'Shift Report', path: '/shift-report' }
    ]},
    { id: 'qc', name: 'QC Dept', icon: <Settings className="w-4 h-4" />, forms: [] },
    { id: 'maint', name: 'Maintenance Dept', icon: <HardDrive className="w-4 h-4" />, forms: [] },
    { id: 'store', name: 'Store Dept', icon: <Database className="w-4 h-4" />, forms: [] },
  ];

  const reportDepartments = [
    { id: 'prod', name: 'Production Reports', icon: <Factory className="w-4 h-4" />, reports: [
      { name: 'Laminate GSM Reports', path: '/report?type=Laminate Record for GSM Verification' },
      { name: 'Shift Reports', path: '/report?type=Packing Shift Report' }
    ]},
    { id: 'qc', name: 'QC Reports', icon: <Settings className="w-4 h-4" />, reports: [] },
    { id: 'maint', name: 'Maintenance Reports', icon: <HardDrive className="w-4 h-4" />, reports: [] },
    { id: 'store', name: 'Store Reports', icon: <Database className="w-4 h-4" />, reports: [] },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) => clsx(
    "flex items-center px-4 py-3 rounded-lg transition-colors font-medium text-sm",
    isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  );

  if (isMaintenance && user.role?.toLowerCase() !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="mx-auto w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
            <Settings className="w-12 h-12 text-red-500 animate-spin-slow" />
          </div>
          <h1 className="text-4xl font-black text-white">System Maintenance</h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            The Paperless Factory system is currently undergoing critical updates. All data entry and verification is paused. Please try again later.
          </p>
          <button 
            onClick={handleLogout}
            className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <span className="font-bold text-xl text-slate-800 tracking-tight">Paperless Factory</span>
              </div>
              <nav className="hidden md:ml-8 md:flex md:space-x-2">
                <NavLink to="/" className={navLinkClass}>
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </NavLink>
                {user.role?.toLowerCase() !== 'dataentry' && (
                  <NavLink to="/approval" className={navLinkClass}>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Approval Queue
                  </NavLink>
                )}

                {user.role?.toLowerCase() === 'admin' && (
                  <NavLink to="/admin" className={navLinkClass}>
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Panel
                  </NavLink>
                )}
                
                {/* Entry Form Dropdown */}
                <div className="relative" onMouseLeave={() => setShowEntryMenu(false)}>
                  <button 
                    onMouseEnter={() => setShowEntryMenu(true)}
                    className="flex items-center px-4 py-3 rounded-lg transition-colors font-medium text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Entry Form
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                  
                  {showEntryMenu && (
                    <div className="absolute left-0 mt-0 w-64 rounded-xl shadow-xl bg-white border border-slate-200 py-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                      {entryDepartments.map((dept) => (
                        <div 
                          key={dept.id}
                          className="relative group"
                          onMouseEnter={() => setActiveDept(dept.id)}
                          onMouseLeave={() => setActiveDept(null)}
                        >
                          <button className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">{dept.icon}</span>
                              <span className="font-medium">{dept.name}</span>
                            </div>
                            {dept.forms.length > 0 && <ChevronRight className="w-4 h-4 text-slate-300" />}
                          </button>
                          
                          {activeDept === dept.id && dept.forms.length > 0 && (
                            <div className="absolute left-full top-0 -ml-px w-64 rounded-xl shadow-xl bg-white border border-slate-200 py-2 z-[70] animate-in fade-in zoom-in-95 duration-200">
                              {dept.forms.map((form) => (
                                <NavLink
                                  key={form.path}
                                  to={form.path}
                                  onClick={() => setShowEntryMenu(false)}
                                  className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors font-medium"
                                >
                                  {form.name}
                                </NavLink>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Report Dropdown */}
                <div className="relative" onMouseLeave={() => setShowReportMenu(false)}>
                  <button 
                    onMouseEnter={() => setShowReportMenu(true)}
                    className="flex items-center px-4 py-3 rounded-lg transition-colors font-medium text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Reports
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                  
                  {showReportMenu && (
                    <div className="absolute left-0 mt-0 w-64 rounded-xl shadow-xl bg-white border border-slate-200 py-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                      {reportDepartments.map((dept) => (
                        <div 
                          key={dept.id}
                          className="relative group"
                          onMouseEnter={() => setActiveReportDept(dept.id)}
                          onMouseLeave={() => setActiveReportDept(null)}
                        >
                          <button className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">{dept.icon}</span>
                              <span className="font-medium">{dept.name}</span>
                            </div>
                            {dept.reports.length > 0 && <ChevronRight className="w-4 h-4 text-slate-300" />}
                          </button>
                          
                          {activeReportDept === dept.id && dept.reports.length > 0 && (
                            <div className="absolute left-full top-0 -ml-px w-64 rounded-xl shadow-xl bg-white border border-slate-200 py-2 z-[70] animate-in fade-in zoom-in-95 duration-200">
                              {dept.reports.map((report) => (
                                <NavLink
                                  key={report.path}
                                  to={report.path}
                                  onClick={() => setShowReportMenu(false)}
                                  className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors font-medium"
                                >
                                  {report.name}
                                </NavLink>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end hidden md:flex">
                <span className="text-sm font-semibold text-slate-800">{user?.name}</span>
                <span className="text-xs text-slate-500 flex items-center">
                  <User className="w-3 h-3 mr-1" /> {user?.role}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {announcement && (
        <div className="bg-amber-100 border-b border-amber-200 text-amber-800 px-4 py-2.5 text-center text-sm font-bold flex justify-center items-center gap-2 shadow-inner">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          IMPORTANT NOTICE: {announcement}
        </div>
      )}

      <main className="flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
