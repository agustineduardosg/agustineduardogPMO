import React from 'react';
import { Sliders, Layers } from 'lucide-react';

interface IndependentLandingCardProps {
  stats: {
    totalCount: number;
    openCount: number;
    progress: number;
  };
  onSelect: () => void;
  onAssociateClick: () => void;
}

export const IndependentLandingCard: React.FC<IndependentLandingCardProps> = ({
  stats,
  onSelect,
  onAssociateClick
}) => {
  const { totalCount, openCount, progress } = stats;

  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: 0, 
        overflow: 'hidden', 
        cursor: 'pointer', 
        transition: 'transform 0.2s, box-shadow 0.2s', 
        display: 'flex', 
        flexDirection: 'column',
        border: '1px solid rgba(124, 58, 237, 0.25)', 
        background: 'rgba(124, 58, 237, 0.02)'
      }}
      onClick={onSelect}
    >
      <div style={{ height: '5px', background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }} />
      
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 6px', color: '#7c3aed' }}>
                Incidentes Globales / Sin Proyecto
              </h3>
              {totalCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssociateClick();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#7c3aed',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s',
                    marginTop: '-6px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Asociar incidentes a un proyecto"
                >
                  <Sliders size={16} />
                </button>
              )}
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
              Global / Independiente
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '45px', height: '45px' }}>
              <svg width="45" height="45" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="22.5" cy="22.5" r="18" fill="none" stroke="var(--border-light)" strokeWidth="4" />
                <circle cx="22.5" cy="22.5" r="18" fill="none" stroke="#7c3aed" strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 18}
                  strokeDashoffset={2 * Math.PI * 18 - (progress / 100) * (2 * Math.PI * 18)}
                  strokeLinecap="round"
                />
              </svg>
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: '#7c3aed' }}>
                {progress}%
              </span>
            </div>
            <span style={{ fontSize: '8px', color: '#7c3aed', fontWeight: 800, marginTop: '2px', textTransform: 'uppercase' }}>Cierre</span>
          </div>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, minHeight: '2.5em' }}>
          Buzón global de incidentes reportados en sedes que aún no han sido vinculados o asignados a un proyecto formal de calibración o infraestructura.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(124, 58, 237, 0.15)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <Layers size={12} style={{ color: '#7c3aed' }} />
            <span style={{ fontWeight: 600 }}>Estado:</span>
            <span>Monitoreo Activo Permanente</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(124, 58, 237, 0.04)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(124, 58, 237, 0.1)', marginTop: '4px' }}>
          <div>
            <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Incidentes</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCount} registrados</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Abiertos</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#7c3aed' }}>{openCount} pendientes</span>
          </div>
        </div>
      </div>
    </div>
  );
};
