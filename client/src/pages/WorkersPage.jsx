import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Server, Activity, Cpu, MemoryStick } from 'lucide-react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

const CircularProgress = ({ value, max, size = 80, strokeWidth = 8, color = 'var(--accent-indigo-500)' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = max > 0 ? (value / max) * 100 : 0;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle 
          cx={size / 2} cy={size / 2} r={radius} 
          fill="transparent" 
          stroke="var(--bg-base)" 
          strokeWidth={strokeWidth} 
        />
        <circle 
          cx={size / 2} cy={size / 2} r={radius} 
          fill="transparent" 
          stroke={color} 
          strokeWidth={strokeWidth} 
          strokeDasharray={circumference} 
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>/ {max}</span>
      </div>
    </div>
  );
};

const WorkersPage = () => {
  const { data: res, isLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: () => api.get('/metrics/workers'),
    refetchInterval: 5000
  });

  const workers = res?.data || [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Worker Fleet</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Monitor compute nodes processing jobs in real-time</p>
        </div>
        <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-card)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-success)', boxShadow: '0 0 10px var(--status-success)' }} />
          {workers.filter(w => w.status === 'online' || w.status === 'busy').length} Online
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton type="card" count={4} />
      ) : workers.length === 0 ? (
        <EmptyState 
          icon={Server} 
          title="No Workers Found" 
          description="Start a worker node using the CLI to see it appear here."
          action={<code style={{ background: 'var(--bg-base)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)', display: 'block', color: 'var(--accent-emerald-400)' }}>npm run dev:worker</code>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {workers.map((worker, i) => {
            const isOnline = worker.status === 'online' || worker.status === 'busy';
            const statusColor = worker.status === 'online' ? 'var(--accent-emerald-500)' : worker.status === 'busy' ? 'var(--accent-indigo-500)' : 'var(--accent-rose-500)';
            
            return (
              <motion.div 
                key={worker.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className="glass-card"
                style={{
                  borderTop: `3px solid ${statusColor}`,
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: 'var(--radius-md)', 
                      background: `rgba(var(--accent-${worker.status === 'online' ? 'emerald' : worker.status === 'busy' ? 'indigo' : 'rose'}-500-rgb, 128,128,128), 0.1)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: statusColor
                    }}>
                      <Server size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {worker.hostname}
                      </h3>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                        {worker.id}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={worker.status} pulse={isOnline} />
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                      Concurrency Utilization
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <CircularProgress 
                        value={worker.active_jobs} 
                        max={worker.concurrency_slots} 
                        color={worker.active_jobs === worker.concurrency_slots ? 'var(--accent-amber-500)' : statusColor} 
                      />
                    </div>
                  </div>
                  
                  <div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--border-subtle)' }} />
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        <Activity size={14} /> Last Heartbeat
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        {new Date(worker.last_heartbeat_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        <Cpu size={14} /> Memory Usage
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '4px', background: 'var(--bg-base)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: '45%', height: '100%', background: 'var(--accent-indigo-400)' }} />
                        </div>
                        45%
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default WorkersPage;
