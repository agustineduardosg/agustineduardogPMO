import React from 'react';
import { Project, ParentProject } from '@/store/projectStore';
import { Edit2, User, Layers, Building2 } from 'lucide-react';

type ProjectStatus = 'Planificación' | 'Ejecución' | 'Pausado' | 'Completado';

const STATUS_CONFIG: Record<ProjectStatus, { color: string; bg: string; label: string }> = {
  'Planificación': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Planificación' },
  'Ejecución':     { color: '#0079C1', bg: 'rgba(0,121,193,0.1)',  label: 'En Ejecución' },
  'Pausado':       { color: '#6b7280', bg: 'rgba(107,114,128,0.1)',label: 'Pausado' },
  'Completado':    { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Completado' },
};

const AREA_COLORS: Record<string, string> = {
  'Tecnología': '#6366f1', 'Operaciones': '#f59e0b', 'Salud Digital': '#0079C1',
  'Clínico': '#10b981', 'Administración': '#8b5cf6', 'Finanzas': '#ef4444',
  'Marketing': '#ec4899', 'Legal': '#14b8a6',
};

interface ProjectLandingCardProps {
  project: Project;
  stats: {
    totalCount: number;
    openCount: number;
    progress: number;
  };
  parentProjects: ParentProject[];
  onSelect: (id: string) => void;
  onEdit: (project: Project) => void;
  onUpdateParent: (projectId: string, parentProjectId: string | null) => Promise<void>;
}

export const ProjectLandingCard: React.FC<ProjectLandingCardProps> = ({
  project,
  stats,
  parentProjects,
  onSelect,
  onEdit,
  onUpdateParent
}) => {
  const { totalCount, openCount, progress } = stats;
  const status = project.status || 'Planificación';
  const sc = STATUS_CONFIG[status as ProjectStatus] || STATUS_CONFIG['Planificación'];
  const areaColor = AREA_COLORS[project.area || ''] || '#0079C1';

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
        border: '1px solid var(--border-light)',
        background: 'var(--bg-primary)'
      }}
      onClick={() => onSelect(project.id)}
    >
      <div style={{ height: '5px', background: `linear-gradient(90deg, ${areaColor}, ${areaColor}88)` }} />
      
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', flex: 1 }} title={project.name}>
                {project.name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '2px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s, background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#0079C1';
                  e.currentTarget.style.backgroundColor = 'rgba(0,121,193,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Editar Información del Proyecto"
              >
                <Edit2 size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: sc.bg, color: sc.color }}>
                {sc.label}
              </span>
              {project.area && (
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: `${areaColor}15`, color: areaColor }}>
                   {project.area}
                </span>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '45px', height: '45px' }}>
              <svg width="45" height="45" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="22.5" cy="22.5" r="18" fill="none" stroke="var(--border-light)" strokeWidth="4" />
                <circle cx="22.5" cy="22.5" r="18" fill="none" stroke="#10b981" strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 18}
                  strokeDashoffset={2 * Math.PI * 18 - (progress / 100) * (2 * Math.PI * 18)}
                  strokeLinecap="round"
                />
              </svg>
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800 }}>
                {progress}%
              </span>
            </div>
            <span style={{ fontSize: '8px', color: 'var(--text-secondary)', fontWeight: 800, marginTop: '2px', textTransform: 'uppercase' }}>Cierre</span>
          </div>
        </div>

        <p style={{ fontSize: '0.8rem', color: project.description ? 'var(--text-secondary)' : 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '2.5em', fontStyle: project.description ? 'normal' : 'italic' }}>
          {project.description || 'Sin descripción detallada disponible.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <User size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ fontWeight: 600, flexShrink: 0 }}>PM:</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.manager || 'No asignado'}</span>
            </div>
            <select
              value={project.parentProjectId || ''}
              onChange={async (e) => {
                e.stopPropagation();
                const newParentId = e.target.value || null;
                await onUpdateParent(project.id, newParentId);
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '2px 4px',
                borderRadius: '4px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-secondary)',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                color: 'var(--text-secondary)',
                outline: 'none',
                cursor: 'pointer',
                maxWidth: '130px',
                flexShrink: 0
              }}
            >
              <option value="">📁 Independiente</option>
              {parentProjects.map(pp => (
                <option key={pp.id} value={pp.id}>📁 {pp.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginTop: '4px' }}>
          <div>
            <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Incidentes</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCount} registrados</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Abiertos</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#e11d48' }}>{openCount} pendientes</span>
          </div>
        </div>
      </div>
    </div>
  );
};
