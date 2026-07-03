import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Play, Pause, List, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

const QueuesPage = () => {
  const qc = useQueryClient();
  const [editingQueue, setEditingQueue] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState({ priority: 5, concurrency_limit: 10, status: 'active' });
  const [createForm, setCreateForm] = useState({ name: '', priority: 5, concurrency_limit: 10 });

  const { data, isLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: () => api.get('/queues'),
    refetchInterval: 5000
  });

  const updateMutation = useMutation({
    mutationFn: (updates) => api.put(`/queues/${editingQueue.id}`, updates),
    onSuccess: () => {
      qc.invalidateQueries(['queues']);
      setEditingQueue(null);
      toast.success('Queue updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update queue');
    }
  });

  const createMutation = useMutation({
    mutationFn: (newQueue) => api.post('/queues', newQueue),
    onSuccess: () => {
      qc.invalidateQueries(['queues']);
      setIsCreating(false);
      setCreateForm({ name: '', priority: 5, concurrency_limit: 10 });
      toast.success('Queue created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create queue');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`/queues/${id}`, { status: status === 'active' ? 'paused' : 'active' }),
    onSuccess: (data) => {
      qc.invalidateQueries(['queues']);
      if (data.data.status === 'paused') {
        toast('Queue paused', { icon: '⏸' });
      } else {
        toast.success('Queue resumed');
      }
    }
  });

  const handleEditClick = (queue) => {
    setEditingQueue(queue);
    setEditForm({
      priority: queue.priority,
      concurrency_limit: queue.concurrency_limit,
      status: queue.status
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateMutation.mutate(editForm);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error('Queue name is required');
      return;
    }
    createMutation.mutate(createForm);
  };

  const queues = data?.data || [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Queue Management</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Configure priorities, concurrency, and lifecycle</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
          <Plus size={16} /> New Queue
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton type="card" count={4} />
      ) : queues.length === 0 ? (
        <EmptyState 
          icon={List} 
          title="No Queues Found" 
          description="Create your first queue to start processing background jobs."
          action={<button className="btn btn-primary" onClick={() => setIsCreating(true)}><Plus size={16} /> Create Queue</button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {queues.map((q, i) => {
            const isActive = q.status === 'active';
            const statusColor = isActive ? 'var(--status-success)' : 'var(--accent-amber-500)';
            const utilPercent = Math.min(100, (q.total_processed / (q.total_processed + q.total_failed || 1)) * 100);

            return (
              <motion.div 
                key={q.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className="glass-card"
                style={{
                  borderLeft: `3px solid ${statusColor}`,
                  display: 'flex', flexDirection: 'column'
                }}
              >
                <div style={{ padding: '1.5rem', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{q.name}</h3>
                    <StatusBadge status={q.status} pulse={isActive} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Priority</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${(q.priority/10)*100}%`, height: '100%', background: 'var(--accent-indigo-400)' }} />
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{q.priority}/10</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Concurrency</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{q.concurrency_limit} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>slots</span></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                      <span>Processed</span>
                      <span>Failed</span>
                    </div>
                    <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ width: `${utilPercent}%`, background: 'var(--accent-emerald-500)' }} />
                      <div style={{ width: `${100 - utilPercent}%`, background: 'var(--accent-rose-500)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 500, marginTop: '0.25rem' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{q.total_processed.toLocaleString()}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{q.total_failed.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', padding: '0.75rem 1rem', 
                  background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border-card)',
                  gap: '0.5rem'
                }}>
                  <button 
                    onClick={() => toggleStatusMutation.mutate({ id: q.id, status: q.status })}
                    className="btn-ghost" 
                    style={{ flex: 1, padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: isActive ? 'var(--accent-amber-500)' : 'var(--accent-emerald-500)', borderRadius: 'var(--radius-sm)' }}
                  >
                    {isActive ? <Pause size={16} /> : <Play size={16} />}
                    {isActive ? 'Pause' : 'Resume'}
                  </button>
                  <div style={{ width: '1px', background: 'var(--border-card)' }} />
                  <button 
                    onClick={() => handleEditClick(q)}
                    className="btn-ghost" 
                    style={{ flex: 1, padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <Settings size={16} />
                    Configure
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!editingQueue} onClose={() => setEditingQueue(null)} title={`Configure Queue: ${editingQueue?.name}`}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</label>
            <select 
              value={editForm.status}
              onChange={(e) => setEditForm({...editForm, status: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)', border: '1px solid var(--border-card)', color: 'white' }}
            >
              <option value="active">Active (Processing jobs)</option>
              <option value="paused">Paused (Not processing)</option>
            </select>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Priority</label>
              <span style={{ fontSize: '0.875rem', color: 'var(--accent-indigo-400)', fontWeight: 600 }}>{editForm.priority}</span>
            </div>
            <input 
              type="range" min="1" max="10"
              value={editForm.priority}
              onChange={(e) => setEditForm({...editForm, priority: parseInt(e.target.value, 10)})}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
              <span>Low (1)</span>
              <span>High (10)</span>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Concurrency Limit</label>
            <input 
              type="number" min="1"
              value={editForm.concurrency_limit}
              onChange={(e) => setEditForm({...editForm, concurrency_limit: parseInt(e.target.value, 10)})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)', border: '1px solid var(--border-card)', color: 'white' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>Max number of jobs from this queue that can run concurrently across all workers.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn-ghost" onClick={() => setEditingQueue(null)} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving...' : 'Save Configuration'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCreating} onClose={() => setIsCreating(false)} title="Create New Queue">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Queue Name</label>
            <input 
              type="text" 
              value={createForm.name}
              onChange={(e) => setCreateForm({...createForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')})}
              required
              placeholder="e.g. emails"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)', border: '1px solid var(--border-card)', color: 'white' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>Only lowercase letters, numbers, hyphens, and underscores allowed.</p>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Priority</label>
              <span style={{ fontSize: '0.875rem', color: 'var(--accent-indigo-400)', fontWeight: 600 }}>{createForm.priority}</span>
            </div>
            <input 
              type="range" min="1" max="10"
              value={createForm.priority}
              onChange={(e) => setCreateForm({...createForm, priority: parseInt(e.target.value, 10)})}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Concurrency Limit</label>
            <input 
              type="number" min="1"
              value={createForm.concurrency_limit}
              onChange={(e) => setCreateForm({...createForm, concurrency_limit: parseInt(e.target.value, 10)})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-base)', border: '1px solid var(--border-card)', color: 'white' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn-ghost" onClick={() => setIsCreating(false)} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create Queue'}</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default QueuesPage;
