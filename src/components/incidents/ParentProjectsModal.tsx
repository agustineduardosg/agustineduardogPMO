import React, { useState } from 'react';
import { ParentProject } from '@/store/projectStore';
import { FolderPlus, X } from 'lucide-react';

interface ParentProjectsModalProps {
  onClose: () => void;
  parentProjects: ParentProject[];
  onAdd: (name: string, description?: string) => Promise<void>;
  onUpdate: (id: string, name: string, description?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ParentProjectsModal: React.FC<ParentProjectsModalProps> = ({ 
  onClose, 
  parentProjects, 
  onAdd, 
  onUpdate, 
  onDelete 
}) => {
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDesc, setEditingDesc] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onAdd(newName.trim(), newDesc.trim());
    setNewName('');
    setNewDesc('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editingName.trim()) return;
    await onUpdate(editingId, editingName.trim(), editingDesc.trim());
    setEditingId(null);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '600px', maxWidth: '95vw', padding: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '16px', animation: 'scaleUp 0.2s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#003B64', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderPlus size={18} color="#0079C1" />
            Gestionar Agrupadores / Programas
          </h2>
          <button className="icon-btn" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: '300px' }}>
          <div style={{ borderRight: '1px solid var(--border-subtle)', paddingRight: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Crear Nuevo Agrupador</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Nombre del Programa/Agrupador" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }}
                required
              />
              <textarea 
                placeholder="Descripción (opcional)" 
                value={newDesc} 
                onChange={e => setNewDesc(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px', fontSize: '0.82rem', width: '100%' }}>Crear Agrupador</button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '350px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Agrupadores Existentes</h3>
            {parentProjects.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>No hay agrupadores registrados.</div>
            ) : (
              parentProjects.map(pp => (
                <div key={pp.id} style={{ padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {editingId === pp.id ? (
                    <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <input 
                        type="text" 
                        value={editingName} 
                        onChange={e => setEditingName(e.target.value)} 
                        style={{ width: '100%', padding: '6px 10px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-primary)', outline: 'none' }}
                        required
                      />
                      <input 
                        type="text" 
                        value={editingDesc} 
                        onChange={e => setEditingDesc(e.target.value)} 
                        placeholder="Descripción"
                        style={{ width: '100%', padding: '6px 10px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-primary)', outline: 'none' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setEditingId(null)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Guardar</button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pp.name}</div>
                        {pp.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{pp.description}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <button 
                          onClick={() => {
                            setEditingId(pp.id);
                            setEditingName(pp.name);
                            setEditingDesc(pp.description || '');
                          }}
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`¿Seguro que deseas eliminar el agrupador "${pp.name}"? Los proyectos hijos no se eliminarán, quedarán huérfanos.`)) {
                              onDelete(pp.id);
                            }
                          }}
                          className="btn btn-danger" 
                          style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'var(--accent-red)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
