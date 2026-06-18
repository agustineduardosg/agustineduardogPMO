import React, { useState } from 'react';
import { useProjectStore, Project } from '@/store/projectStore';
import { Sliders, X, Loader2 } from 'lucide-react';

const AREA_COLORS: Record<string, string> = {
  'Tecnología': '#6366f1', 'Operaciones': '#f59e0b', 'Salud Digital': '#0079C1',
  'Clínico': '#10b981', 'Administración': '#8b5cf6', 'Finanzas': '#ef4444',
  'Marketing': '#ec4899', 'Legal': '#14b8a6',
};

interface AssociateGlobalModalProps {
  onClose: () => void;
  onSave: (targetProjectId: string) => Promise<void>;
}

export const AssociateGlobalModal: React.FC<AssociateGlobalModalProps> = ({ 
  onClose, 
  onSave 
}) => {
  const projects = useProjectStore(state => state.projects);
  const parentProjects = useProjectStore(state => state.parentProjects);
  const addProject = useProjectStore(state => state.addProject);

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedId, setSelectedId] = useState('');
  
  // Fields for new project
  const [name, setName] = useState('');
  const [manager, setManager] = useState('');
  const [area, setArea] = useState('Tecnología');
  const [status, setStatus] = useState('Planificación');
  const [parentId, setParentId] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (mode === 'existing') {
        if (!selectedId) {
          alert('Por favor seleccione un proyecto.');
          setIsSaving(false);
          return;
        }
        await onSave(selectedId);
      } else {
        if (!name.trim()) {
          alert('El nombre del proyecto es obligatorio.');
          setIsSaving(false);
          return;
        }
        const newProjectId = `proj-${Date.now()}`;
        const newProjectObj: Project = {
          id: newProjectId,
          name: name.trim(),
          description: '',
          manager: manager.trim(),
          sponsor: '',
          responsible: '',
          area,
          status: status as any,
          hasEquipment: false,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          parentProjectId: parentId || null,
          phases: []
        };
        await addProject(newProjectObj);
        await onSave(newProjectId);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '500px', maxWidth: '95vw', padding: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '16px', animation: 'scaleUp 0.2s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#003B64', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="#0079C1" />
            Asociar Incidentes Globales a Proyecto
          </h2>
          <button className="icon-btn" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
          Puedes mover todos los incidentes globales que no tienen proyecto a un proyecto nuevo o uno ya existente en el sistema.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ 
            display: 'flex', 
            background: 'var(--bg-tertiary)', 
            borderRadius: '8px', 
            padding: '4px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '4px'
          }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMode('existing');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                background: mode === 'existing' ? '#0079C1' : 'transparent',
                color: mode === 'existing' ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: mode === 'existing' ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center'
              }}
            >
              Asociar a Proyecto Existente
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMode('new');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                background: mode === 'new' ? '#0079C1' : 'transparent',
                color: mode === 'new' ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: mode === 'new' ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center'
              }}
            >
              Crear Nuevo Proyecto y Asociar
            </button>
          </div>
          {mode === 'existing' ? (
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Seleccionar Proyecto Destino</label>
              <select 
                value={selectedId} 
                onChange={e => setSelectedId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.88rem', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                required
              >
                <option value="">-- Seleccione un proyecto --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Nombre del Proyecto</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.88rem', color: 'var(--text-primary)', outline: 'none' }}
                  placeholder="Ej. Proyecto Calidad"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>PM / Gerente</label>
                  <input 
                    type="text" 
                    value={manager} 
                    onChange={e => setManager(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.88rem', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Área</label>
                  <select 
                    value={area} 
                    onChange={e => setArea(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.88rem', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                  >
                    {Object.keys(AREA_COLORS).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Estado de Proyecto</label>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.88rem', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="Planificación">Planificación</option>
                    <option value="Ejecución">En Ejecución</option>
                    <option value="Pausado">Pausado</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Agrupador / Programa</label>
                  <select 
                    value={parentId} 
                    onChange={e => setParentId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.88rem', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="">📁 Independiente</option>
                    {parentProjects.map(pp => (
                      <option key={pp.id} value={pp.id}>📁 {pp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>Cancelar</button>
            <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isSaving && <Loader2 className="animate-spin" size={14} />}
              Asociar Todos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
