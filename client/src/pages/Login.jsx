import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, Activity, AlertTriangle } from 'lucide-react';
import { API_URL } from '../config';
import { useEffect } from 'react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState('checking');
  const { login } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then(res => res.ok ? setServerStatus('online') : setServerStatus('offline'))
      .catch(() => setServerStatus('offline'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-600 p-3 rounded-full">
            <Lock className="text-white w-8 h-8" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Paperless Factory Portal</h2>
        
        <div className="flex justify-center mb-8">
          {serverStatus === 'online' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-pulse">
              <Activity className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">System Online</span>
            </div>
          ) : serverStatus === 'offline' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">System Offline (Check Backend)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-400 rounded-full border border-slate-100">
              <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Connecting...</span>
            </div>
          )}
        </div>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}
        
        {serverStatus === 'offline' && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
            <p className="text-xs text-amber-800 font-medium">
              <span className="font-black">🔴 CRITICAL:</span> The frontend cannot reach the backend server at <code className="bg-amber-100 px-1 rounded">{API_URL}</code>.
              Please ensure your backend is hosted and the <code className="bg-amber-100 px-1 rounded">VITE_API_URL</code> environment variable is set in Netlify.
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            Secure Login
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">System Access Directory</h3>
          </div>
          
          <div className="space-y-4">
            {/* Super Admin */}
            <div className="bg-indigo-600 p-4 rounded-xl shadow-md border border-indigo-700 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShieldCheck className="w-12 h-12" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-tighter opacity-80">Super Admin (Global Power)</p>
                <div className="flex justify-between items-end mt-1">
                  <div>
                    <p className="text-lg font-black tracking-tight">ID: DEVELOPER</p>
                    <p className="text-xs font-medium opacity-90">Pass: PASSWORD</p>
                  </div>
                  <div className="bg-white/20 px-2 py-1 rounded text-[9px] font-bold">DEVELOPER ACCESS</div>
                </div>
              </div>
            </div>

            {/* Shed Grid */}
            <div className="grid grid-cols-1 gap-3">
              {[1, 2, 3].map(shed => (
                <div key={shed} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-indigo-300 transition-colors">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
                    <span className="text-[11px] font-black text-slate-700 uppercase">SHED NO {shed}</span>
                    <span className="text-[9px] font-bold text-slate-400">PWD: password</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="bg-slate-50 p-1.5 rounded-lg text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Entry</p>
                      <p className="text-[11px] font-bold text-slate-800">entry{shed}</p>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded-lg text-center border-x border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Checker</p>
                      <p className="text-[11px] font-bold text-slate-800">check{shed}</p>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded-lg text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Verifier</p>
                      <p className="text-[11px] font-bold text-slate-800">verify{shed}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
