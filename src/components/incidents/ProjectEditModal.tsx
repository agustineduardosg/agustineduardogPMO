import React, { useState } from 'react';
import { Project } from '@/store/projectStore';
import { Edit2, X, Loader2 } from 'lucide-react';

const AREA_COLORS: Record<string, string> = {
  'Tecnología': '#6366f1', 'Operaciones': '#f59e0b', 'Salud Digital': '#0079C1',
  'Clínico': '#10b981', 'Administración': '#8b5cf6', 'Finanzas': '#ef4444',
  'Marketing': '#ec4899', 'Legal': '#14b8a6',
};

interface ProjectEditModalProps {
  project: Project;
  onClose: () => void;
  onSave: (id: string, updates: any) => Promise<void>;
}

export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({ 
  project, 
  onClose, 
  onSave 
}) => {
  const [name, setName] = useState(project.name);
  const [manager, setManager] = useState(project.manager || '');
  const [description, setDescription] = useState(project.description || '');
  const [area, setArea] = useState(project.area || 'Tecnología');
  const [status, setStatus] = useState(project.status || 'Planificación');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(project.id, {
        name: name.trim(),
        manager: manager.trim(),
        description: description.trim(),
        area,
        status
      });
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
            <Edit2 size={18} color="#0079C1" />
            Editar Proyecto
          </h2>
          <button className="icon-btn" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Nombre del Proyecto</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.88rem', color: 'var(--text-primary)', outline: 'none' }}
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
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Descripción</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '8px 12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.88rem', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>Cancelar</button>
            <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isSaving && <Loader2 className="animate-spin" size={14} />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
