import React from 'react';
import { motion } from 'framer-motion';

const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.02)',
        borderStyle: 'dashed',
        borderWidth: '2px',
        borderColor: 'var(--border-strong)'
      }}
    >
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '1rem',
        borderRadius: '50%',
        marginBottom: '1.5rem',
        color: 'var(--text-secondary)'
      }}>
        {Icon && <Icon size={48} strokeWidth={1.5} />}
      </div>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '2rem' }}>
        {description}
      </p>
      {action}
    </motion.div>
  );
};

export default EmptyState;
