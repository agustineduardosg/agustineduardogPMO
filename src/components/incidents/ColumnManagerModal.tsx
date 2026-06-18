import React, { useState } from 'react';
import { Sliders, X, Check, Edit2, Trash2 } from 'lucide-react';

export const COLUMN_CONFIG: Record<string, { label: string; width?: string; minWidth?: string }> = {
  id: { label: 'ID', width: '55px' },
  fecha: { label: 'Fecha', width: '120px' },
  recintoName: { label: 'Sede / Clínica', width: '160px' },
  equipmentName: { label: 'Equipo Afectado', width: '180px' },
  faseAfectada: { label: 'Fase Afectada', width: '150px' },
  descripcion: { label: 'Descripción del Incidente / Desviación', minWidth: '280px' },
  impacto: { label: 'Impacto', width: '115px' },
  responsable: { label: 'Responsable', width: '160px' },
  estado: { label: 'Estado', width: '120px' },
  planDeAccion: { label: 'Plan de Acción Inmediato / Mitigación', minWidth: '240px' },
  fechaCierre: { label: 'F. Cierre', width: '120px' },
  projectId: { label: 'Proyecto Asociado', width: '180px' }
};

export const DEFAULT_COLUMN_ORDER = [
  'id',
  'fecha',
  'recintoName',
  'equipmentName',
  'faseAfectada',
  'descripcion',
  'impacto',
  'responsable',
  'estado',
  'planDeAccion',
  'fechaCierre',
  'projectId'
];

export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  id: 60,
  fecha: 110,
  recintoName: 150,
  equipmentName: 180,
  faseAfectada: 130,
  descripcion: 320,
  impacto: 110,
  responsable: 150,
  estado: 110,
  planDeAccion: 280,
  fechaCierre: 110,
  projectId: 170
};

interface ColumnManagerModalProps {
  onClose: () => void;
  customColumns: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
  onToggleColumnVisibility: (colKey: string) => void;
  onAdjustColumnWidth: (colKey: string, delta: number) => void;
  onSetColumnWidthDirect: (colKey: string, val: number) => void;
  onMoveColumn: (orderIdx: number, direction: 'up' | 'down') => void;
  onAddColumn: (name: string) => void;
  onRenameColumn: (colKey: string, newName: string) => void;
  onDeleteColumn: (colKey: string) => void;
  
  // States from parent for header-click editing integration
  editingColIndex: number | null;
  setEditingColIndex: (idx: number | null) => void;
  editingColName: string;
  setEditingColName: (name: string) => void;
}

export const ColumnManagerModal: React.FC<ColumnManagerModalProps> = ({
  onClose,
  customColumns,
  columnOrder,
  columnWidths,
  onToggleColumnVisibility,
  onAdjustColumnWidth,
  onSetColumnWidthDirect,
  onMoveColumn,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  editingColIndex,
  setEditingColIndex,
  editingColName,
  setEditingColName
}) => {
  const [newColName, setNewColName] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    onAddColumn(newColName.trim());
    setNewColName('');
  };

  return (
    <div className="custom-modal-backdrop">
      <div className="custom-modal-card" style={{ width: '560px', maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#003B64', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} />
            Administrar Columnas
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Formulario Agregar Columna */}
        <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>+ Crear Columna Nueva</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Ej. Jira Ticket, Observación, Nivel..." 
              value={newColName} 
              onChange={e => setNewColName(e.target.value)}
              className="control-input"
              style={{ flex: 1, padding: '8px', border: '1px solid var(--border-light)', borderRadius: '6px', outline: 'none', background: 'white', fontSize: '0.85rem' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', background: '#004B87', color: 'white', border: 'none', fontSize: '0.82rem' }}>Crear</button>
          </div>
        </form>

        {/* Listado de Columnas (Reordenamiento, Visibilidad, CRUD y Anchos) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Columna ({[...DEFAULT_COLUMN_ORDER, ...customColumns].length})</span>
            <span>Visibilidad / Ancho / Acciones</span>
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
            {[...DEFAULT_COLUMN_ORDER, ...customColumns].map((colKey) => {
              const isStandard = DEFAULT_COLUMN_ORDER.includes(colKey);
              const label = isStandard ? COLUMN_CONFIG[colKey].label : colKey;
              const isVisible = columnOrder.includes(colKey);
              const orderIdx = columnOrder.indexOf(colKey);
              const cIdx = isStandard ? -1 : customColumns.indexOf(colKey);
              const width = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 150;

              return (
                <div key={colKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: isVisible ? 'var(--bg-primary)' : 'rgba(0,0,0,0.02)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', opacity: isVisible ? 1 : 0.6 }}>
                  
                  {/* Checkbox Visibilidad + Nombre Columna */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <input 
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => onToggleColumnVisibility(colKey)}
                      title="Mostrar/Ocultar columna"
                      style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                    />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isStandard ? 'var(--text-secondary)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={colKey}>
                      <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>{isStandard ? '📌' : '⚡'}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                    </span>
                  </div>

                  {/* Ajuste de Ancho */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <button
                      type="button"
                      onClick={() => onAdjustColumnWidth(colKey, -15)}
                      style={{ padding: '2px 6px', background: 'rgba(0, 75, 135, 0.05)', border: '1px solid var(--border-light)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', color: '#004B87' }}
                      title="Estrechar columna (-15px)"
                    >
                      -
                    </button>
                    <input 
                      type="number"
                      value={width}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 50;
                        onSetColumnWidthDirect(colKey, val);
                      }}
                      style={{ width: '55px', textAlign: 'center', fontSize: '0.78rem', padding: '2px', border: '1px solid var(--border-light)', borderRadius: '4px', background: 'white', fontWeight: 600 }}
                      title="Ancho de columna en px"
                    />
                    <button
                      type="button"
                      onClick={() => onAdjustColumnWidth(colKey, 15)}
                      style={{ padding: '2px 6px', background: 'rgba(0, 75, 135, 0.05)', border: '1px solid var(--border-light)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', color: '#004B87' }}
                      title="Ensanchar columna (+15px)"
                    >
                      +
                    </button>
                  </div>

                  {/* Botones de Reordenamiento (Solo si está visible) */}
                  <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                    <button
                      type="button"
                      disabled={!isVisible || orderIdx <= 0}
                      onClick={() => onMoveColumn(orderIdx, 'up')}
                      style={{
                        border: 'none',
                        background: (!isVisible || orderIdx <= 0) ? 'transparent' : 'rgba(0, 75, 135, 0.05)',
                        cursor: (!isVisible || orderIdx <= 0) ? 'not-allowed' : 'pointer',
                        color: (!isVisible || orderIdx <= 0) ? 'var(--text-muted)' : '#004B87',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        transition: 'all 0.15s'
                      }}
                      title="Mover hacia la izquierda"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={!isVisible || orderIdx === -1 || orderIdx === columnOrder.length - 1}
                      onClick={() => onMoveColumn(orderIdx, 'down')}
                      style={{
                        border: 'none',
                        background: (!isVisible || orderIdx === -1 || orderIdx === columnOrder.length - 1) ? 'transparent' : 'rgba(0, 75, 135, 0.05)',
                        cursor: (!isVisible || orderIdx === -1 || orderIdx === columnOrder.length - 1) ? 'not-allowed' : 'pointer',
                        color: (!isVisible || orderIdx === -1 || orderIdx === columnOrder.length - 1) ? 'var(--text-muted)' : '#004B87',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        transition: 'all 0.15s'
                      }}
                      title="Mover hacia la derecha"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Botones de Edición / Borrado para Personalizadas */}
                  {!isStandard && (
                    <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '8px', alignItems: 'center' }}>
                      {editingColIndex === cIdx ? (
                        <>
                          <input 
                            type="text" 
                            value={editingColName}
                            onChange={e => setEditingColName(e.target.value)}
                            className="control-input"
                            style={{ width: '80px', padding: '2px 4px', fontSize: '0.78rem', border: '1px solid var(--accent-primary)', borderRadius: '4px', background: 'white' }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onRenameColumn(colKey, editingColName);
                                setEditingColIndex(null);
                              }
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              onRenameColumn(colKey, editingColName);
                              setEditingColIndex(null);
                            }}
                            style={{ border: 'none', background: 'transparent', color: '#10b981', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingColIndex(null)}
                            style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingColIndex(cIdx);
                              setEditingColName(colKey);
                            }}
                            style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                            title="Renombrar columna"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => onDeleteColumn(colKey)}
                            style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                            title="Eliminar columna"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px', background: '#004B87', color: 'white', border: 'none' }}>Listo</button>
        </div>
      </div>
    </div>
  );
};
