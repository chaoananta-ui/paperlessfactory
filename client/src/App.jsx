import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EntryForm from './pages/EntryForm';
import ShiftReportForm from './pages/ShiftReportForm';
import Approval from './pages/Approval';
import Report from './pages/Report';
import AdminPanel from './pages/AdminPanel';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="entry-form" element={<EntryForm />} />
            <Route path="shift-report" element={<ShiftReportForm />} />
            <Route path="approval" element={<Approval />} />
            <Route path="report" element={<Report />} />
            <Route path="admin" element={<AdminPanel />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
