import React from 'react';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';
import { Database } from 'lucide-react';

const DataTable = ({ columns, data, isLoading, emptyMessage, emptyAction, onRowClick }) => {
  if (isLoading) {
    return <LoadingSkeleton type="table" count={5} />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState 
        icon={Database} 
        title="No Data Found" 
        description={emptyMessage || "There is no data to display in this table."}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="glass-card" style={{ overflowX: 'auto', padding: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ 
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid var(--border-card)'
        }}>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{ 
                padding: '1rem', 
                color: 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '0.875rem'
              }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr 
              key={row.id || i} 
              onClick={() => onRowClick && onRowClick(row)}
              style={{ 
                borderBottom: i === data.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.2s ease, box-shadow 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.boxShadow = 'inset 3px 0 0 var(--accent-indigo-500)';
                }
              }}
              onMouseLeave={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {columns.map((col, j) => (
                <td key={j} style={{ padding: '1rem' }}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
