import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Play, Activity, List, Server, Zap, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import api from '../api/axios';
import SimulationPanel from '../components/SimulationPanel';
import StatCard from '../components/StatCard';

const DashboardPage = () => {
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);

  const { data: throughputRes, isLoading: throughputLoading } = useQuery({
    queryKey: ['metrics', 'throughput'],
    queryFn: () => api.get('/metrics/throughput'),
    refetchInterval: 5000
  });
  const throughput = throughputRes?.data || [];

  const { data: errorRateRes, isLoading: errorRateLoading } = useQuery({
    queryKey: ['metrics', 'error-rate'],
    queryFn: () => api.get('/metrics/error-rate'),
    refetchInterval: 5000
  });
  const errorRateData = errorRateRes?.data || { timeSeries: [], summary: {} };
  const errorRate = errorRateData.timeSeries || [];

  const { data: overviewRes } = useQuery({
    queryKey: ['metrics', 'overview'],
    queryFn: () => api.get('/metrics/overview'),
    refetchInterval: 5000
  });
  const overview = overviewRes?.data || {
    activeQueues: 0,
    onlineWorkers: 0,
    totalProcessed: 0,
    successRate: '100.0'
  };

  const { data: activityRes } = useQuery({
    queryKey: ['metrics', 'activity'],
    queryFn: () => api.get('/metrics/activity'),
    refetchInterval: 5000
  });
  const activities = activityRes?.data || [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' }}>System Overview</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Real-time cluster metrics and job throughput</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setIsSimulationOpen(true)}
          style={{ padding: '0.75rem 1.25rem' }}
        >
          <Play fill="currentColor" size={16} /> Launch Simulation
        </button>
      </div>
      
      {/* Top Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard 
          title="Active Queues" 
          value={overview.activeQueues} 
          icon={List} 
          color="indigo" 
        />
        <StatCard 
          title="Workers Online" 
          value={overview.onlineWorkers} 
          icon={Server} 
          color="emerald" 
          animatePulse={overview.onlineWorkers > 0}
        />
        <StatCard 
          title="Total Processed" 
          value={overview.totalProcessed.toLocaleString()} 
          icon={Zap} 
          color="amber" 
          trend={overview.processedTrend} trendUp={overview.processedTrendUp}
        />
        <StatCard 
          title="Success Rate" 
          value={`${overview.successRate}%`} 
          icon={Target} 
          color={parseFloat(overview.successRate) > 95 ? "emerald" : "rose"} 
        />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Throughput Chart */}
        <div className="glass-card" style={{ height: '380px', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Throughput (Jobs/min)</h3>
          {throughputLoading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
          ) : (
            <div style={{ width: '100%', height: 'calc(100% - 3rem)' }}>
              <ResponsiveContainer>
                <AreaChart data={throughput} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-indigo-500)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-indigo-500)" stopOpacity={0}/>
                    </linearGradient>
                    <filter id="glow-indigo" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="var(--accent-indigo-500)" floodOpacity="0.4" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--text-tertiary)" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="var(--text-tertiary)" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-surface-3)', borderColor: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-primary)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: 'var(--accent-indigo-400)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="var(--accent-indigo-500)" strokeWidth={3} fillOpacity={1} fill="url(#colorThroughput)" animationDuration={1000} style={{ filter: 'url(#glow-indigo)' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Error Rate Chart */}
        <div className="glass-card" style={{ height: '380px', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Error Volume</h3>
          {errorRateLoading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>
          ) : (
            <div style={{ width: '100%', height: 'calc(100% - 3rem)' }}>
              <ResponsiveContainer>
                <AreaChart data={errorRate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-rose-500)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-rose-500)" stopOpacity={0}/>
                    </linearGradient>
                    <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="var(--accent-rose-500)" floodOpacity="0.4" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--text-tertiary)" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="var(--text-tertiary)" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-surface-3)', borderColor: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-primary)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: 'var(--accent-rose-500)' }}
                  />
                  <Area type="monotone" dataKey="errors" stroke="var(--accent-rose-500)" strokeWidth={3} fillOpacity={1} fill="url(#colorError)" animationDuration={1000} style={{ filter: 'url(#glow-rose)' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Activity color="var(--accent-indigo-400)" size={20} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Live Activity Feed
            <span className="animate-pulse-dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald-500)' }}></span>
          </h3>
        </div>
        
        {activities.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255, 255, 255, 0.05)' }}>
            No recent activity detected. Launch a simulation to see it in action!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activities.map((activity, i) => {
              const isSuccess = activity.status === 'completed';
              const isFail = activity.status === 'failed';
              const statusColor = isSuccess ? 'var(--accent-emerald-500)' : isFail ? 'var(--accent-rose-500)' : 'var(--accent-amber-500)';
              
              return (
                <motion.div 
                  key={activity.id} 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '0.875rem 1rem', 
                    background: 'var(--bg-surface-2)', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-surface-3)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg-surface-2)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: 500 }}>{activity.type}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', fontFamily: 'monospace' }}>#{activity.id.substring(0,8)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <span style={{ 
                      fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: statusColor, background: `rgba(${isSuccess ? '16, 185, 129' : isFail ? '244, 63, 94' : '245, 158, 11'}, 0.1)`, padding: '2px 8px', borderRadius: '12px'
                    }}>
                      {activity.status}
                    </span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', minWidth: '90px', textAlign: 'right' }}>
                      {formatDistanceToNow(new Date(activity.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <SimulationPanel isOpen={isSimulationOpen} onClose={() => setIsSimulationOpen(false)} />
    </motion.div>
  );
};

export default DashboardPage;
