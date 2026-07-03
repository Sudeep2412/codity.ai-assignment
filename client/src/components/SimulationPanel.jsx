import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Play, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';

const SimulationPanel = ({ isOpen, onClose }) => {
  const qc = useQueryClient();
  const [queueId, setQueueId] = useState('');
  const [count, setCount] = useState(50);
  const [jobType, setJobType] = useState('simulation');
  const [failProbability, setFailProbability] = useState(0.1);
  const [durationMs, setDurationMs] = useState(1000);
  const [isSimulating, setIsSimulating] = useState(false);

  const { data: queuesRes } = useQuery({
    queryKey: ['queues'],
    queryFn: () => api.get('/queues')
  });
  const queues = queuesRes?.data || [];

  // Automatically select first queue if none selected
  React.useEffect(() => {
    if (!queueId && queues.length > 0) {
      setQueueId(queues[0].id);
    }
  }, [queues, queueId]);

  const burstMutation = useMutation({
    mutationFn: (payload) => api.post('/simulate/burst', payload),
    onSuccess: (data) => {
      qc.invalidateQueries(['queues']);
      qc.invalidateQueries(['jobs']);
      qc.invalidateQueries(['metrics']);
      setIsSimulating(false);
      toast.success(data?.data?.message || 'Burst deployed!');
      onClose();
    },
    onError: (err) => {
      setIsSimulating(false);
      toast.error(err.response?.data?.error || 'Failed to deploy simulation');
    }
  });

  const handleLaunch = (e) => {
    e.preventDefault();
    if (!queueId) {
      toast.error('Please create or select a queue first');
      return;
    }
    setIsSimulating(true);
    burstMutation.mutate({
      queueId,
      count,
      jobType,
      failProbability,
      durationMs
    });
  };

  if (!isOpen) return null;

  const modalContent = (
    <Modal isOpen={isOpen} onClose={onClose} title="Launch Simulation" maxWidth="500px">
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem', marginTop: '-0.5rem' }}>
        Flood a queue with jobs to watch the system process them in real-time. The workers will pick them up immediately.
      </p>

        <form onSubmit={handleLaunch} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Target Queue</label>
            {queues.length === 0 ? (
              <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber-500)', borderRadius: '6px', fontSize: '0.875rem' }}>
                No queues found. Please create a queue in the Queues page first.
              </div>
            ) : (
              <select 
                value={queueId} 
                onChange={(e) => setQueueId(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white' }}
              >
                <option value="" disabled>Select a queue</option>
                {queues.map(q => (
                  <option key={q.id} value={q.id}>{q.name}</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Job Type</label>
              <select 
                value={jobType} 
                onChange={(e) => setJobType(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white' }}
              >
                <option value="simulation">Generic Simulation</option>
                <option value="send-email">Email Campaign</option>
                <option value="generate-report">Data Export</option>
                <option value="process-webhook">Webhook Delivery</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Job Count ({count})</label>
              <input 
                type="number" min="1" max="1000"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value, 10))}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 500 }}>
              <span>Fail Probability</span>
              <span style={{ color: 'var(--accent-primary)' }}>{(failProbability * 100).toFixed(0)}%</span>
            </label>
            <input 
              type="range" min="0" max="1" step="0.05"
              value={failProbability}
              onChange={(e) => setFailProbability(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
            <small style={{ color: 'var(--text-secondary)' }}>Percentage of jobs that will intentionally fail (to test DLQ & retries)</small>
          </div>

          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 500 }}>
              <span>Execution Delay</span>
              <span style={{ color: 'var(--accent-primary)' }}>{durationMs}ms</span>
            </label>
            <input 
              type="range" min="100" max="10000" step="100"
              value={durationMs}
              onChange={(e) => setDurationMs(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
            <small style={{ color: 'var(--text-secondary)' }}>How long each job takes to process</small>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}
              disabled={isSimulating || !queueId}
            >
              {isSimulating ? 'Deploying...' : <><Play fill="currentColor" size={20} /> Deploy Burst</>}
            </button>
          </div>
        </form>
    </Modal>
  );

  return createPortal(modalContent, document.body);
};

export default SimulationPanel;
