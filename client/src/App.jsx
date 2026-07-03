import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, List, Activity, Settings, AlertTriangle, Layers, LogOut, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import { useSocket } from './hooks/useSocket';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import QueuesPage from './pages/QueuesPage';
import JobsPage from './pages/JobsPage';
import WorkersPage from './pages/WorkersPage';
import DLQPage from './pages/DLQPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  // We'd ideally pull socket status from context, but for now mock it as connected
  const [isConnected, setIsConnected] = useState(true);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/queues', icon: List, label: 'Queues' },
    { path: '/jobs', icon: Activity, label: 'Jobs' },
    { path: '/workers', icon: Settings, label: 'Workers' },
    { path: '/dlq', icon: AlertTriangle, label: 'DLQ' }
  ];

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100vh', background: 'var(--bg-surface-2)',
        borderRight: '1px solid var(--border-card)',
        padding: '1.5rem 0',
        position: 'sticky', top: 0,
        zIndex: 50, overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', padding: '0 1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
          <Layers color="var(--accent-indigo-500)" size={32} style={{ flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.5))' }} />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.h2 
                initial={{ opacity: 0, width: 0 }} 
                animate={{ opacity: 1, width: 'auto' }} 
                exit={{ opacity: 0, width: 0 }}
                style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}
              >
                Codity.ai
              </motion.h2>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 1rem' }}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
                  position: 'relative', overflow: 'hidden'
                }}
              >
                {active && (
                  <motion.div 
                    layoutId="activeNavIndicator"
                    style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: 'var(--accent-indigo-500)', borderRadius: '0 4px 4px 0' }}
                  />
                )}
                <item.icon size={20} color={active ? 'var(--accent-indigo-400)' : 'currentColor'} style={{ flexShrink: 0 }} />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ fontWeight: active ? 600 : 500, whiteSpace: 'nowrap' }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '0 1rem', marginTop: 'auto' }}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="btn-ghost"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        <div style={{ 
          borderTop: '1px solid var(--border-card)', 
          paddingTop: '1.5rem', 
          display: 'flex', alignItems: 'center', 
          justifyContent: isCollapsed ? 'center' : 'space-between',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', flexShrink: 0 }}>
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? 'var(--accent-emerald-500)' : 'var(--status-error)', boxShadow: isConnected ? '0 0 5px rgba(16,185,129,0.5)' : 'none' }} />
              </div>
            </div>
            
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name || 'User'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{user?.email || ''}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={logout} className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%', color: 'var(--text-tertiary)' }} title="Logout">
                <LogOut size={18} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
};

const Layout = ({ children }) => {
  useSocket();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <main style={{ flex: 1, padding: '2rem 3rem', maxWidth: '1600px', margin: '0 auto', width: '100%', overflowX: 'hidden' }}>
        {children}
      </main>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-surface-3)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-card)',
            backdropFilter: 'blur(8px)',
          }
        }}
      />
    </div>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/queues" element={<ProtectedRoute><Layout><QueuesPage /></Layout></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><Layout><JobsPage /></Layout></ProtectedRoute>} />
      <Route path="/workers" element={<ProtectedRoute><Layout><WorkersPage /></Layout></ProtectedRoute>} />
      <Route path="/dlq" element={<ProtectedRoute><Layout><DLQPage /></Layout></ProtectedRoute>} />
    </Routes>
  );
}

export default App;
