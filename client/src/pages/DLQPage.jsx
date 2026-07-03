import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { RefreshCw, Trash2, Filter, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';
import SlideOver from '../components/SlideOver';

const DLQPage = () => {
  const queryClient = useQueryClient();
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  const { data: queuesRes } = useQuery({
    queryKey: ['queues'],
    queryFn: () => api.get('/queues')
  });
  const queues = queuesRes?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['dlq', selectedQueueId],
    queryFn: () => api.get(selectedQueueId ? `/queues/${selectedQueueId}/dlq` : '/dlq'),
    refetchInterval: 5000
  });

  const retryMutation = useMutation({
    mutationFn: (dlqId) => api.post(`/dlq/${dlqId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries(['dlq']);
      queryClient.invalidateQueries(['jobs']);
      toast.success('Job restored to queue');
      setSelectedEntry(null);
    }
  });

  const discardMutation = useMutation({
    mutationFn: (dlqId) => api.post(`/dlq/${dlqId}/discard`),
    onSuccess: () => {
      queryClient.invalidateQueries(['dlq']);
      toast.success('Dead letter discarded');
      setSelectedEntry(null);
    }
  });

  const dlqEntries = data?.data || [];

  const columns = [
    { 
      header: 'Job ID', 
      cell: (entry) => <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{entry.original_job_id.substring(0,8)}...</span> 
    },
    { 
      header: 'Type', 
      cell: (entry) => <span style={{ fontWeight: 500 }}>{entry.job_type}</span> 
    },
    { 
      header: 'Failure Reason', 
      cell: (entry) => (
        <span style={{ 
          color: 'var(--accent-rose-500)', 
          background: 'rgba(244,63,94,0.1)', 
          padding: '0.25rem 0.5rem', 
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem'
        }}>
          {entry.failure_reason.length > 40 ? entry.failure_reason.substring(0, 40) + '...' : entry.failure_reason}
        </span>
      )
    },
    { 
      header: 'Failed At', 
      cell: (entry) => <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{new Date(entry.failed_at || entry.created_at).toLocaleString()}</span> 
    },
    { 
      header: 'Actions', 
      cell: (entry) => (
        <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
          <button 
            className="btn-ghost" 
            style={{ color: 'var(--accent-indigo-400)', padding: '0.25rem' }}
            onClick={(e) => { e.stopPropagation(); retryMutation.mutate(entry.id); }}
            title="Retry Job"
            disabled={retryMutation.isPending}
          >
            <RefreshCw size={16} />
          </button>
          <button 
            className="btn-ghost" 
            style={{ color: 'var(--accent-rose-500)', padding: '0.25rem' }}
            onClick={(e) => { e.stopPropagation(); discardMutation.mutate(entry.id); }}
            title="Discard"
            disabled={discardMutation.isPending}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Dead Letter Queue</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Review and recover permanently failed jobs</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface-2)', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
          <Filter size={18} color="var(--text-tertiary)" style={{ marginLeft: '0.5rem' }} />
          <select 
            value={selectedQueueId} 
            onChange={(e) => setSelectedQueueId(e.target.value)}
            style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: '0.25rem', color: 'var(--text-primary)' }}
          >
            <option value="">All Queues</option>
            {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={dlqEntries} 
        isLoading={isLoading} 
        onRowClick={(entry) => setSelectedEntry(entry)}
        emptyMessage="No dead letters found. Your system is perfectly healthy! 🎉"
      />

      <SlideOver 
        isOpen={!!selectedEntry} 
        onClose={() => setSelectedEntry(null)} 
        title="Dead Letter Details"
        width="500px"
      >
        {selectedEntry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', background: 'rgba(244,63,94,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244,63,94,0.2)' }}>
              <AlertTriangle color="var(--accent-rose-500)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ color: 'var(--accent-rose-500)', fontWeight: 600, marginBottom: '0.25rem' }}>Failed permanently</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{selectedEntry.failure_reason}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Job ID</div>
                <div style={{ fontFamily: 'monospace' }}>{selectedEntry.original_job_id}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Job Type</div>
                <div style={{ fontWeight: 500 }}>{selectedEntry.job_type}</div>
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Failed At</div>
              <div>{new Date(selectedEntry.failed_at || selectedEntry.created_at).toLocaleString()}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Payload Snapshot</div>
              <pre style={{ 
                background: 'var(--bg-base)', 
                padding: '1rem', 
                borderRadius: 'var(--radius-md)', 
                overflowX: 'auto', 
                fontSize: '0.85rem',
                border: '1px solid var(--border-card)',
                color: 'var(--text-secondary)'
              }}>
                {JSON.stringify(selectedEntry.payload, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
                onClick={() => retryMutation.mutate(selectedEntry.id)}
                disabled={retryMutation.isPending}
              >
                <RefreshCw size={16} /> Re-queue Job
              </button>
              <button 
                className="btn" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose-500)', border: '1px solid rgba(244,63,94,0.2)' }}
                onClick={() => discardMutation.mutate(selectedEntry.id)}
                disabled={discardMutation.isPending}
              >
                <Trash2 size={16} /> Discard
              </button>
            </div>
          </div>
        )}
      </SlideOver>
    </motion.div>
  );
};

export default DLQPage;
