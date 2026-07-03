import React from 'react';

const LoadingSkeleton = ({ type = 'card', count = 1 }) => {
  const skeletons = Array(count).fill(0);

  if (type === 'table') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        {skeletons.map((_, i) => (
          <div key={i} style={{ 
            height: '60px', 
            background: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-sm)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
              animation: 'shimmer 2s infinite linear'
            }} />
          </div>
        ))}
      </div>
    );
  }

  // default card type
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', width: '100%' }}>
      {skeletons.map((_, i) => (
        <div key={i} className="glass-card" style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
            animation: 'shimmer 2s infinite linear'
          }} />
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
