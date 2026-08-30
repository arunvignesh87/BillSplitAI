import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Subscriptions from './pages/Subscriptions';
import BillSplit from './pages/BillSplit';
import AIInsights from './pages/AIInsights';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import Loader from './components/Loader';
import CurrencyModal from './components/CurrencyModal';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <Loader />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="billsplit" element={<BillSplit />} />
        <Route path="insights" element={<AIInsights />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}

// PWA Install Banner
function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 9999,
      background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
      borderRadius: 14, padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 8px 32px rgba(108,99,255,0.4)',
    }}>
      <span style={{ fontSize: '1.8rem' }}>💸</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>
          Install BillSplit AI
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>
          Add to home screen for the best experience
        </div>
      </div>
      <button onClick={install} style={{
        padding: '8px 16px', background: 'white', border: 'none',
        borderRadius: 8, fontWeight: 700, fontSize: '0.8rem',
        color: '#6c63ff', cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        Install
      </button>
      <button onClick={() => setShow(false)} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
        fontSize: '1.1rem', cursor: 'pointer', padding: 4,
      }}>✕</button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <CurrencyModal />
        <InstallBanner />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e1e35',
              color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.08)',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
