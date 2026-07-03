import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const AnimatedNumber = ({ value }) => {
  const [node, setNode] = useState(null);
  
  useEffect(() => {
    if (!node) return;
    
    // Parse value to handle strings like "1,234" or "98.5%"
    const isPercent = typeof value === 'string' && value.endsWith('%');
    const isFloat = typeof value === 'string' && value.includes('.') && !isPercent;
    
    const numValue = typeof value === 'string' 
      ? parseFloat(value.replace(/,/g, '').replace('%', ''))
      : value;
      
    if (isNaN(numValue)) {
      node.textContent = value;
      return;
    }

    const controls = animate(0, numValue, {
      duration: 1,
      ease: "easeOut",
      onUpdate(v) {
        let formatted = v;
        if (isPercent) {
          formatted = v.toFixed(1) + '%';
        } else if (isFloat) {
          formatted = v.toFixed(1);
        } else {
          formatted = Math.floor(v).toLocaleString();
        }
        node.textContent = formatted;
      }
    });
    
    return () => controls.stop();
  }, [value, node]);

  return <span ref={setNode} className="tabular-nums" />;
};

// Generate deterministic dummy data for sparkline based on title
const generateSparklineData = (title) => {
  const seed = title.length;
  let current = 50;
  return Array.from({ length: 20 }).map((_, i) => {
    current += (Math.sin(i * seed) * 10) + (Math.random() * 5 - 2.5);
    return { value: Math.max(0, current) };
  });
};

const StatCard = ({ title, value, icon: Icon, color = 'indigo', trend, trendUp, animatePulse }) => {
  const textColorClass = `var(--accent-${color}-400)`;
  const sparklineData = React.useMemo(() => generateSparklineData(title), [title]);
  
  // Decide if trend is positive or negative for semantic color
  const trendColor = trendUp ? 'var(--accent-emerald-500)' : 'var(--accent-rose-500)';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="glass-card"
      style={{ 
        padding: '1.5rem', 
        position: 'relative', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '140px'
      }}
    >
      {/* Background Sparkline */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', opacity: 0.15, pointerEvents: 'none' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparklineData}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={textColorClass} 
              strokeWidth={2} 
              dot={false}
              isAnimationActive={true}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.02em' }}>
            {title}
          </h3>
          <p style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            <AnimatedNumber value={value} />
          </p>
        </div>
        <div style={{
          background: `rgba(255, 255, 255, 0.03)`,
          padding: '10px',
          borderRadius: '12px',
          color: textColorClass,
          position: 'relative',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          {Icon && <Icon size={20} strokeWidth={2.5} />}
          {animatePulse && (
            <div className={`animate-pulse-dot-${color === 'emerald' ? 'emerald' : 'indigo'}`} 
                 style={{
                   position: 'absolute', 
                   top: '-2px', right: '-2px', 
                   width: '8px', height: '8px', 
                   background: textColorClass,
                   borderRadius: '50%'
                 }} 
            />
          )}
        </div>
      </div>
      
      {trend && (
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', position: 'relative', zIndex: 1 }}>
          <span style={{ 
            color: trendColor,
            background: `rgba(${trendUp ? '16, 185, 129' : '244, 63, 94'}, 0.1)`,
            padding: '2px 6px',
            borderRadius: '4px',
            display: 'flex', alignItems: 'center', gap: '2px',
            fontWeight: 600
          }}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>vs last hr</span>
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;
