import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, XCircle, Search, Filter, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/axios';
import DataTable from '../components/DataTable';
import SlideOver from '../components/SlideOver';
import StatusBadge from '../components/StatusBadge';

const JobsPage = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);

  const { data: queuesRes } = useQuery({
    queryKey: ['queues'],
    queryFn: () => api.get('/queues')
  });
  const queues = queuesRes?.data || [];
  
  const { data, isLoading } = useQuery({
    queryKey: ['jobs', selectedQueueId, page, status],
    queryFn: () => api.get(selectedQueueId ? `/queues/${selectedQueueId}/jobs` : '/jobs', { params: { page, status, limit: 20 } }),
    refetchInterval: 5000
  });

  const retryMutation = useMutation({
    mutationFn: (jobId) => api.post(`/jobs/${jobId}/retry`),
    onSuccess: () => {
      qc.invalidateQueries(['jobs']);
      toast.success('Job queued for retry');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId) => api.delete(`/jobs/${jobId}`),
    onSuccess: () => {
      qc.invalidateQueries(['jobs']);
      toast.success('Job cancelled');
    }
  });

  const jobs = data?.data || [];
  const meta = data?.meta || {};

  const columns = [
    { 
      header: 'ID', 
      cell: (job) => <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{job.id.substring(0,8)}...</span> 
    },
    { 
      header: 'Type', 
      cell: (job) => <span style={{ fontWeight: 500 }}>{job.type}</span> 
    },
    { 
      header: 'Status', 
      cell: (job) => <StatusBadge status={job.status} pulse={job.status === 'running'} />
    },
    { 
      header: 'Attempts', 
      cell: (job) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${(job.attempt_number / job.max_attempts) * 100}%`, height: '100%', background: job.status === 'failed' ? 'var(--accent-rose-500)' : 'var(--accent-indigo-400)' }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{job.attempt_number}/{job.max_attempts}</span>
        </div>
      )
    },
    { 
      header: 'Created At', 
      cell: (job) => <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{new Date(job.created_at).toLocaleString()}</span> 
    },
    { 
      header: 'Actions', 
      cell: (job) => (
        <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
          {job.status === 'failed' && (
            <button 
              className="btn-ghost" 
              style={{ color: 'var(--accent-indigo-400)', padding: '0.25rem' }}
              onClick={(e) => { e.stopPropagation(); retryMutation.mutate(job.id); }}
              title="Retry Job"
            >
              <RefreshCw size={16} />
            </button>
          )}
          {!['completed', 'failed', 'cancelled'].includes(job.status) && (
            <button 
              className="btn-ghost" 
              style={{ color: 'var(--accent-rose-500)', padding: '0.25rem' }}
              onClick={(e) => { e.stopPropagation(); cancelMutation.mutate(job.id); }}
              title="Cancel Job"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Job Explorer</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Search and manage individual jobs across all queues</p>
      </div>

      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px', background: 'var(--bg-base)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)' }}>
            <Search size={16} color="var(--text-tertiary)" />
            <input type="text" placeholder="Search by Job ID..." style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', boxShadow: 'none' }} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-base)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)' }}>
            <Filter size={16} color="var(--text-tertiary)" style={{ marginLeft: '0.5rem' }} />
            <select 
              value={selectedQueueId} 
              onChange={(e) => { setSelectedQueueId(e.target.value); setPage(1); }}
              style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: '0.25rem' }}
            >
              <option value="">All Queues</option>
              {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-base)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)' }}>
            <Calendar size={16} color="var(--text-tertiary)" style={{ marginLeft: '0.5rem' }} />
            <select 
              value={status} 
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: '0.25rem' }}
            >
              <option value="">All Statuses</option>
              <option value="queued">Queued</option>
              <option value="scheduled">Scheduled</option>
              <option value="claimed">Claimed</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={jobs} 
        isLoading={isLoading} 
        onRowClick={(job) => setSelectedJob(job)}
      />

      {!isLoading && jobs.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0 0.5rem' }}>
          <button 
            className="btn btn-ghost" 
            disabled={!meta.hasPrevPage} 
            onClick={() => setPage(p => p - 1)}
          >
            ← Previous
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Page {meta.page} of {meta.totalPages || 1}</span>
          <button 
            className="btn btn-ghost" 
            disabled={!meta.hasNextPage} 
            onClick={() => setPage(p => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      <SlideOver 
        isOpen={!!selectedJob} 
        onClose={() => setSelectedJob(null)} 
        title={`Job Details`}
        width="500px"
      >
        {selectedJob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Job ID</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{selectedJob.id}</div>
              </div>
              <StatusBadge status={selectedJob.status} pulse={selectedJob.status === 'running'} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Type</div>
                <div style={{ fontWeight: 500 }}>{selectedJob.type}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Attempts</div>
                <div>{selectedJob.attempt_number} / {selectedJob.max_attempts}</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Payload</div>
              <pre style={{ 
                background: 'var(--bg-base)', 
                padding: '1rem', 
                borderRadius: 'var(--radius-md)', 
                overflowX: 'auto', 
                fontSize: '0.85rem',
                border: '1px solid var(--border-card)',
                color: 'var(--text-secondary)'
              }}>
                {JSON.stringify(selectedJob.payload, null, 2)}
              </pre>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Result / Error</div>
              <pre style={{ 
                background: 'var(--bg-base)', 
                padding: '1rem', 
                borderRadius: 'var(--radius-md)', 
                overflowX: 'auto', 
                fontSize: '0.85rem',
                border: '1px solid var(--border-card)',
                color: selectedJob.status === 'failed' ? 'var(--accent-rose-500)' : 'var(--accent-emerald-500)'
              }}>
                {selectedJob.result ? JSON.stringify(selectedJob.result, null, 2) : 'No result yet'}
              </pre>
            </div>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Timeline</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '5px', top: '5px', bottom: '5px', width: '2px', background: 'var(--border-strong)' }} />
                
                {[
                  { label: 'Created', time: selectedJob.created_at, active: true },
                  { label: 'Scheduled', time: selectedJob.run_at, active: selectedJob.run_at && new Date(selectedJob.run_at) <= new Date() },
                  { label: 'Started', time: selectedJob.started_at, active: !!selectedJob.started_at },
                  { label: 'Finished', time: selectedJob.finished_at, active: !!selectedJob.finished_at }
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center', opacity: step.active ? 1 : 0.4 }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: step.active ? 'var(--accent-indigo-500)' : 'var(--bg-surface-3)', border: `2px solid ${step.active ? 'var(--bg-base)' : 'var(--border-strong)'}`, zIndex: 1 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{step.label}</div>
                      {step.time && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{new Date(step.time).toLocaleString()}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </motion.div>
  );
};

export default JobsPage;
