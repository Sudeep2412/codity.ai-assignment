import React from 'react';

const StatusBadge = ({ status, pulse }) => {
  let colorClass = 'gray';
  let dotColor = 'rgba(148, 163, 184, 1)';
  
  switch (status.toLowerCase()) {
    case 'online':
    case 'running':
    case 'success':
    case 'completed':
    case 'active':
      colorClass = 'emerald';
      dotColor = 'rgba(16, 185, 129, 1)';
      break;
    case 'busy':
    case 'retried':
      colorClass = 'indigo';
      dotColor = 'rgba(99, 102, 241, 1)';
      break;
    case 'failed':
    case 'offline':
    case 'error':
      colorClass = 'rose';
      dotColor = 'rgba(244, 63, 94, 1)';
      break;
    case 'paused':
    case 'queued':
      colorClass = 'amber';
      dotColor = 'rgba(245, 158, 11, 1)';
      break;
    default:
      break;
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.25rem 0.625rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      background: `rgba(var(--accent-${colorClass}-500-rgb, 128,128,128), 0.1)`,
      border: `1px solid rgba(var(--accent-${colorClass}-500-rgb, 128,128,128), 0.2)`,
      color: `var(--accent-${colorClass}-400, #ccc)`
    }}>
      {pulse && (
        <div style={{ position: 'relative', width: '6px', height: '6px' }}>
          <div className={`animate-pulse-dot-${colorClass === 'emerald' ? 'emerald' : 'indigo'}`} 
               style={{
                 position: 'absolute', inset: 0,
                 background: dotColor,
                 borderRadius: '50%'
               }} 
          />
          <div style={{ position: 'absolute', inset: 0, background: dotColor, borderRadius: '50%' }} />
        </div>
      )}
      {!pulse && (
        <div style={{ width: '6px', height: '6px', background: dotColor, borderRadius: '50%' }} />
      )}
      {status}
    </div>
  );
};

export default StatusBadge;
