import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layers, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const LoginPage = () => {
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@codity.ai');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Orbs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw',
        background: 'var(--accent-indigo-500)', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%', zIndex: 0
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-10%', width: '40vw', height: '40vw',
        background: 'var(--accent-rose-500)', filter: 'blur(150px)', opacity: 0.1, borderRadius: '50%', zIndex: 0
      }} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '3rem',
          position: 'relative',
          zIndex: 10,
          background: 'rgba(19, 22, 29, 0.6)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
            style={{ display: 'inline-flex', padding: '1rem', background: 'var(--gradient-indigo)', borderRadius: '24px', marginBottom: '1.5rem', border: '1px solid var(--border-card)' }}
          >
            <Layers size={40} color="var(--accent-indigo-400)" />
          </motion.div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Codity.ai</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Distributed Job Scheduling Platform</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ padding: '0.75rem', background: 'rgba(244,63,94,0.1)', borderLeft: '4px solid var(--status-error)', borderRadius: '4px', marginBottom: '1.5rem', color: 'var(--status-error)', fontSize: '0.875rem' }}>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
            <button type="button" onClick={() => setIsLogin(true)} style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: 'none', background: isLogin ? 'var(--bg-surface-3)' : 'transparent', color: isLogin ? 'white' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500 }}>
              Sign In
            </button>
            <button type="button" onClick={() => setIsLogin(false)} style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: 'none', background: !isLogin ? 'var(--bg-surface-3)' : 'transparent', color: !isLogin ? 'white' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500 }}>
              Register
            </button>
          </div>

          {!isLogin && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required={!isLogin} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)' }} placeholder="John Doe" />
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)' }} placeholder="you@company.com" />
          </div>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
              {isLogin && <a href="#" style={{ fontSize: '0.75rem', color: 'var(--accent-indigo-400)', textDecoration: 'none' }}>Forgot?</a>}
            </div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.03)' }} placeholder="••••••••" />
          </div>
          
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
            {loading ? 'Processing...' : (isLogin ? 'Sign in to Dashboard' : 'Create Account')}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
