"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useEquipmentStore, ClinicalEquipment, Recinto, EquipmentPhaseStatus } from '@/store/equipmentStore';
import { useProjectStore } from '@/store/projectStore';
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2, Calendar, FileSpreadsheet, Building2, ShieldAlert, CheckCircle2, RefreshCw, Layers, X, UploadCloud, Loader2, Check, Edit2, Sliders, ChevronDown, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { InlineInput, InlineTextarea } from '@/components/InlineInput';
import ReportViewer from '@/components/ReportViewer';
import { EquipmentCommentsModal } from '@/components/EquipmentCommentsModal';
import { parseComments } from '@/utils/commentUtils';


const PHASE_STATUSES: EquipmentPhaseStatus[] = ['No iniciado', 'En progreso', 'Completado', 'Descartado', 'Desestimado'];

const STATUS_STYLE: Record<EquipmentPhaseStatus, { bg: string; color: string; border: string }> = {
  'Completado': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  'En progreso': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  'No iniciado': { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: 'var(--border-light)' },
  'Descartado': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
  'Desestimado': { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', border: 'rgba(107, 114, 128, 0.2)' }
};

const CustomSelect = ({ 
  value, 
  onChange,
  customStatuses = []
}: { 
  value: string; 
  onChange: (val: string) => void;
  customStatuses?: string[];
}) => {
  const isStandard = PHASE_STATUSES.includes(value as any);
  const isCustomOption = customStatuses.includes(value);
  const style = STATUS_STYLE[value as EquipmentPhaseStatus] || { bg: 'rgba(0, 121, 193, 0.08)', color: '#0079C1', border: 'rgba(0, 121, 193, 0.15)' };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      const customVal = prompt("Ingrese el valor personalizado para la fase:");
      if (customVal && customVal.trim()) {
        onChange(customVal.trim());
      }
    } else {
      onChange(val);
    }
  };

  return (
    <select
      value={value}
      onChange={handleSelectChange}
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        padding: '6px 8px',
        borderRadius: '6px',
        fontSize: '0.78rem',
        fontWeight: 'bold',
        outline: 'none',
        cursor: 'pointer',
        width: '100%',
        transition: 'all 0.15s ease'
      }}
    >
      {PHASE_STATUSES.map(status => (
        <option key={status} value={status} style={{ background: '#ffffff', color: '#0F172A' }}>
          {status}
        </option>
      ))}
      {customStatuses.map(status => (
        <option key={status} value={status} style={{ background: '#ffffff', color: '#0F172A' }}>
          {status}
        </option>
      ))}
      {!isStandard && !isCustomOption && value && (
        <option value={value} style={{ background: '#ffffff', color: '#0F172A' }}>
          {value}
        </option>
      )}
      <option value="__custom__" style={{ background: '#ffffff', color: '#004B87', fontWeight: 'bold' }}>
        ➕ Otro...
      </option>
    </select>

  );
};

export default function EquipmentTrackerPage() {
  const recintos = useEquipmentStore(state => state.recintos);
  const equipments = useEquipmentStore(state => state.equipments);
  const addEquipment = useEquipmentStore(state => state.addEquipment);
  const updateEquipment = useEquipmentStore(state => state.updateEquipment);
  const deleteEquipment = useEquipmentStore(state => state.deleteEquipment);
  const fetchEquipmentData = useEquipmentStore(state => state.fetchEquipmentData);

  const projects = useProjectStore(state => state.projects);
  const fetchProjects = useProjectStore(state => state.fetchProjects);
  const router = useRouter();

  const users = useUserStore(state => state.users);
  const fetchUsers = useUserStore(state => state.fetchUsers);
  
  // Auto-save Feedback State
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Estado local para modal de comentarios históricos
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [selectedEqForComments, setSelectedEqForComments] = useState<ClinicalEquipment | null>(null);

  const handleUpdateEquipment = async (eqId: string, updates: any) => {
    setSaveStatus('saving');
    try {
      await updateEquipment(eqId, updates);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (e) {
      console.error(e);
      setSaveStatus('idle');
    }
  };

  useEffect(() => {
    fetchEquipmentData();
    fetchProjects();
    fetchUsers();

    // Sincronización proactiva multidispositivo (Sondeo activo cada 15 segundos si la pestaña está activa)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchEquipmentData();
        fetchProjects();
        fetchUsers();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'clinical' | 'non-clinical'>('all');

  // Estado para columnas dinámicas
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [newColName, setNewColName] = useState('');
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [editingColIndex, setEditingColIndex] = useState<number | null>(null);
  const [editingColName, setEditingColName] = useState('');

  // Estado de acordeones colapsables para los recintos
  const [collapsedRecintos, setCollapsedRecintos] = useState<Record<string, boolean>>({});
  const [isReportOpen, setIsReportOpen] = useState(false);


  const toggleRecintoCollapse = (recintoId: string) => {
    setCollapsedRecintos(prev => ({
      ...prev,
      [recintoId]: !prev[recintoId]
    }));
  };

  // Estados para personalización de columnas predeterminadas del sistema
  const [defaultColNames, setDefaultColNames] = useState<Record<string, string>>({
    name: 'Equipo Biomédico',
    section: 'Sección',
    levantamiento: 'Levantamiento',
    parametrizacion: 'Parametrización',
    pruebas: 'Pruebas',
    capacitacion: 'Capacitación',
    validacion: 'Validación',
    golive: 'Go-live',
    responsable: 'Responsable',
    compromisoDate: 'F. Compromiso',
    observaciones: 'Observaciones / Historial',
    pendienteDe: 'Pendiente de'
  });
  const [hiddenDefaultCols, setHiddenDefaultCols] = useState<string[]>([]);
  const [editingDefaultColKey, setEditingDefaultColKey] = useState<string | null>(null);
  const [editingDefaultColName, setEditingDefaultColName] = useState('');

  // Cargar columnas dinámicas y predeterminadas desde localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('custom_cols_equipments');
    if (saved) {
      try {
        setCustomColumns(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading custom columns', e);
      }
    }
    const savedDefaultNames = localStorage.getItem('default_cols_names_equipments');
    if (savedDefaultNames) {
      try {
        setDefaultColNames(prev => ({ ...prev, ...JSON.parse(savedDefaultNames) }));
      } catch (e) {
        console.error('Error loading default column names', e);
      }
    }
    const savedHiddenCols = localStorage.getItem('hidden_cols_equipments');
    if (savedHiddenCols) {
      try {
        setHiddenDefaultCols(JSON.parse(savedHiddenCols));
      } catch (e) {
        console.error('Error loading hidden columns', e);
      }
    }
  }, []);

  const saveDefaultColNames = (names: Record<string, string>) => {
    setDefaultColNames(names);
    localStorage.setItem('default_cols_names_equipments', JSON.stringify(names));
  };

  const saveHiddenDefaultCols = (cols: string[]) => {
    setHiddenDefaultCols(cols);
    localStorage.setItem('hidden_cols_equipments', JSON.stringify(cols));
  };

  // Auto-descubrimiento y sincronización de columnas desde la base de datos
  React.useEffect(() => {
    if (equipments && equipments.length > 0) {
      const dbKeys = new Set<string>();
      equipments.forEach(eq => {
        if (eq.customFields) {
          try {
            const parsed = JSON.parse(eq.customFields);
            Object.keys(parsed).forEach(k => {
              if (k.trim()) dbKeys.add(k.trim());
            });
          } catch (e) {
            console.error('Error parsing customFields for equipment ' + eq.id, e);
          }
        }
      });

      // Combinar las columnas descubiertas con las existentes
      let updated = [...customColumns];
      let changed = false;
      dbKeys.forEach(key => {
        if (!updated.includes(key)) {
          updated.push(key);
          changed = true;
        }
      });

      if (changed) {
        setCustomColumns(updated);
        localStorage.setItem('custom_cols_equipments', JSON.stringify(updated));
      }
    }
  }, [equipments]);

  // Guardar columnas dinámicas en localStorage
  const saveCustomColumns = (cols: string[]) => {
    setCustomColumns(cols);
    localStorage.setItem('custom_cols_equipments', JSON.stringify(cols));
  };

  // Agregar nueva columna dinámica
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newColName.trim();
    if (!cleanName) return;
    if (customColumns.includes(cleanName)) {
      alert('Ya existe una columna con ese nombre.');
      return;
    }
    const updated = [...customColumns, cleanName];
    saveCustomColumns(updated);
    setNewColName('');
  };

  // Eliminar columna dinámica
  const handleDeleteColumn = (colName: string) => {
    if (confirm(`¿Está seguro de eliminar la columna "${colName}"? Se borrarán sus datos asociados.`)) {
      const updated = customColumns.filter(c => c !== colName);
      saveCustomColumns(updated);
      
      // Limpiar los datos de los equipos asociados a esa columna
      equipments.forEach(eq => {
        const customFields = eq.customFields ? JSON.parse(eq.customFields) : {};
        if (customFields[colName] !== undefined) {
          delete customFields[colName];
          updateEquipment(eq.id, { customFields: JSON.stringify(customFields) });
        }
      });
      if (editingColIndex !== null) setEditingColIndex(null);
    }
  };

  // Renombrar columna dinámica (CRUD)
  const handleRenameColumnDirect = (oldName: string, newName: string) => {
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const cleanName = newName.trim();
    if (customColumns.includes(cleanName) && cleanName !== oldName) {
      alert('Ya existe una columna con ese nombre.');
      return;
    }
    
    // 1. Renombrar en el array customColumns
    const updated = customColumns.map(c => c === oldName ? cleanName : c);
    saveCustomColumns(updated);
    
    // 2. Renombrar la llave en el JSON customFields de cada equipo
    equipments.forEach(eq => {
      if (eq.customFields) {
        try {
          const fields = JSON.parse(eq.customFields);
          if (fields[oldName] !== undefined) {
            fields[cleanName] = fields[oldName];
            delete fields[oldName];
            handleUpdateEquipment(eq.id, { customFields: JSON.stringify(fields) });
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const filteredEquipments = useMemo(() => {
    return equipments.filter(eq => {
      const matchSearch = eq.name.toLowerCase().includes(search.toLowerCase()) || 
                          eq.section.toLowerCase().includes(search.toLowerCase()) ||
                          eq.responsable.toLowerCase().includes(search.toLowerCase());
      
      const matchProject = 
        filterProject === 'all' || 
        (filterProject === 'none' && !eq.projectId) || 
        eq.projectId === filterProject;

      return matchSearch && matchProject;
    });
  }, [equipments, search, filterProject]);

  // Obtener opciones dinámicas personalizadas ingresadas
  const uniquePhaseStatuses = useMemo(() => {
    const defaults = ['No iniciado', 'En progreso', 'Completado', 'Descartado', 'Desestimado'];
    const uniques = new Set<string>();
    equipments.forEach(eq => {
      const phases = [eq.levantamiento, eq.parametrizacion, eq.pruebas, eq.capacitacion, eq.validacion, eq.golive];
      phases.forEach(p => {
        if (p && !defaults.includes(p)) {
          uniques.add(p);
        }
      });
    });
    return Array.from(uniques);
  }, [equipments]);

  // Calcula estadísticas generales del portafolio clínico
  const stats = useMemo(() => {
    const total = equipments.length;
    if (total === 0) return { completion: 0, completedCount: 0, progressCount: 0 };
    
    let totalActivePhases = 0;
    let weightedCompletionSum = 0;
    let progressCount = 0;
    let completedCount = 0;
    
    equipments.forEach(eq => {
      const phasesList = [
        { key: 'levantamiento', val: eq.levantamiento },
        { key: 'parametrizacion', val: eq.parametrizacion },
        { key: 'pruebas', val: eq.pruebas },
        { key: 'capacitacion', val: eq.capacitacion },
        { key: 'validacion', val: eq.validacion },
        { key: 'golive', val: eq.golive }
      ];

      phasesList.forEach(ph => {
        // Ignorar si la fase está marcada como "no aplica" (oculta)
        if (hiddenDefaultCols.includes(ph.key)) {
          return;
        }

        const p = ph.val;
        if (p === 'Descartado' || p === 'Desestimado') {
          return; // Excluir de la sumatoria y del denominador
        }
        totalActivePhases++;
        if (p === 'Completado') {
          weightedCompletionSum += 1.0;
          completedCount++;
        } else if (p === 'En progreso') {
          weightedCompletionSum += 0.5;
          progressCount++;
        }
      });
    });
    
    const completion = totalActivePhases === 0 ? 100 : Math.round((weightedCompletionSum / totalActivePhases) * 100);
    
    return {
      completion,
      completedCount,
      progressCount
    };
  }, [equipments, hiddenDefaultCols]);

  const handleAddEquipment = (recintoId: string) => {
    const newEq: ClinicalEquipment = {
      id: `eq-${Date.now()}`,
      recintoId,
      name: 'Nuevo Equipo Médico',
      section: 'General',
      levantamiento: 'No iniciado',
      parametrizacion: 'No iniciado',
      pruebas: 'No iniciado',
      capacitacion: 'No iniciado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      compromisoDate: '',
      observaciones: 'Ingresar historial...',
      pendienteDe: '',
      customFields: '{}'
    };
    addEquipment(newEq);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Seguimiento de Equipamiento Clínico</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>Gestión de parametrización, pruebas, calibración y puesta en marcha por recinto</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary shadow-sm"
            onClick={() => router.push('/import?type=equipment')}
            style={{ 
              background: 'transparent', 
              color: '#10b981', 
              border: '1px dashed #10b981', 
              padding: '10px 18px', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer'
            }}
          >
            <UploadCloud size={16} />
            Importar Equipos
          </button>
          <button 
            className="btn btn-secondary shadow-sm"
            onClick={() => setIsReportOpen(true)}
            style={{ 
              background: 'transparent', 
              color: '#004B87', 
              border: '1px solid #004B87', 
              padding: '10px 18px', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={16} />
            Generar Informe
          </button>
          <button 
            className="btn btn-secondary shadow-sm"
            onClick={() => {
              setIsAddingCol(true);
              setEditingColIndex(null);
            }}
            style={{ 
              background: '#004B87', 
              color: '#FFFFFF', 
              border: 'none', 
              padding: '10px 18px', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer'
            }}
          >
            <Sliders size={16} strokeWidth={2} />
            Administrar Columnas
          </button>
        </div>
      </div>

      {/* Modal de Administración de Columnas */}
      {isAddingCol && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card" style={{ width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#003B64', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} />
                Administrar Columnas
              </h3>
              <button onClick={() => setIsAddingCol(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* 1. SECCIÓN COLUMNAS PREDETERMINADAS DEL SISTEMA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#004B87', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', display: 'block' }}>
                Columnas del Sistema (Predeterminadas)
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {Object.entries(defaultColNames).map(([key, name]) => {
                  const isHidden = hiddenDefaultCols.includes(key);
                  const isEditing = editingDefaultColKey === key;
                  
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isHidden ? 'var(--bg-tertiary)' : 'var(--bg-primary)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', opacity: isHidden ? 0.6 : 1 }}>
                      {isEditing ? (
                        <>
                          <input 
                            type="text" 
                            value={editingDefaultColName}
                            onChange={e => setEditingDefaultColName(e.target.value)}
                            className="cell-input"
                            style={{ flex: 1, padding: '4px 8px', fontSize: '0.82rem', border: '1px solid var(--accent-primary)', borderRadius: '4px', background: 'white', outline: 'none' }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (editingDefaultColName.trim()) {
                                  const updated = { ...defaultColNames, [key]: editingDefaultColName.trim() };
                                  saveDefaultColNames(updated);
                                }
                                setEditingDefaultColKey(null);
                              }
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              if (editingDefaultColName.trim()) {
                                const updated = { ...defaultColNames, [key]: editingDefaultColName.trim() };
                                saveDefaultColNames(updated);
                              }
                              setEditingDefaultColKey(null);
                            }}
                            style={{ border: 'none', background: 'transparent', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingDefaultColKey(null)}
                            style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textDecoration: isHidden ? 'line-through' : 'none' }}>
                            {name} {isHidden && <span style={{ fontSize: '0.7rem', color: 'red', fontWeight: 'normal' }}>(Oculta / No aplica)</span>}
                          </span>
                          {!isHidden && (
                            <button 
                              type="button"
                              onClick={() => {
                                setEditingDefaultColKey(key);
                                setEditingDefaultColName(name);
                              }}
                              style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                              title="Renombrar columna del sistema"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                          {isHidden ? (
                            <button 
                              type="button"
                              onClick={() => {
                                const updated = hiddenDefaultCols.filter(c => c !== key);
                                saveHiddenDefaultCols(updated);
                              }}
                              className="btn"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                              title="Restaurar columna y sumarla al avance"
                            >
                              Restaurar
                            </button>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => {
                                if (confirm(`¿Marcar "${name}" como 'No aplica'? Se ocultará de la tabla y se excluirá del porcentaje de avance.`)) {
                                  const updated = [...hiddenDefaultCols, key];
                                  saveHiddenDefaultCols(updated);
                                }
                              }}
                              className="btn"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                              title="Ocultar y excluir del porcentaje de avance"
                            >
                              Ocultar
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. SECCIÓN COLUMNAS PERSONALIZADAS DEL USUARIO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#004B87', textTransform: 'uppercase', paddingBottom: '6px', display: 'block' }}>
                Columnas Personalizadas (Creadas por el Usuario)
              </span>

              {/* Formulario Agregar Columna */}
              <form onSubmit={handleAddColumn} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '8px', marginBottom: '12px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>+ Crear Columna Nueva</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Ej. IP del Equipo, Licencia, Proveedor..." 
                    value={newColName} 
                    onChange={e => setNewColName(e.target.value)}
                    className="cell-input"
                    style={{ flex: 1, padding: '8px', border: '1px solid var(--border-light)', borderRadius: '6px', outline: 'none', background: 'white', fontSize: '0.85rem' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', background: '#004B87', color: 'white', border: 'none', fontSize: '0.82rem' }}>Crear</button>
                </div>
              </form>

              {/* Listado de Columnas Existentes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>Columnas Activas ({customColumns.length})</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                  {customColumns.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No hay columnas personalizadas activas.</div>
                  ) : (
                    customColumns.map((col, idx) => (
                      <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        {editingColIndex === idx ? (
                          <>
                            <input 
                              type="text" 
                              value={editingColName}
                              onChange={e => setEditingColName(e.target.value)}
                              className="cell-input"
                              style={{ flex: 1, padding: '4px 8px', fontSize: '0.82rem', border: '1px solid var(--accent-primary)', borderRadius: '4px', background: 'white', outline: 'none' }}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameColumnDirect(col, editingColName);
                                  setEditingColIndex(null);
                                }
                              }}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                handleRenameColumnDirect(col, editingColName);
                                setEditingColIndex(null);
                              }}
                              style={{ border: 'none', background: 'transparent', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                              title="Guardar nombre"
                            >
                              <Check size={16} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => setEditingColIndex(null)}
                              style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                              title="Cancelar"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{col}</span>
                            <button 
                              type="button"
                              onClick={() => {
                                setEditingColIndex(idx);
                                setEditingColName(col);
                              }}
                              style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                              title="Renombrar columna"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteColumn(col)}
                              style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                              title="Eliminar columna"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button type="button" onClick={() => setIsAddingCol(false)} className="btn btn-secondary" style={{ padding: '8px 16px', background: '#004B87', color: 'white', border: 'none' }}>Listo</button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,121,193,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{equipments.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Equipos Biomédicos Totales</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.completion}%</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Implementación Global (Avance Promedio)</div>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0 }}>
            <RefreshCw size={22} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stats.progressCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Hitos Biomédicos en Curso</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar por equipo, sección o responsable de calibración..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 42px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} 
          />
        </div>

        {/* Auto-save indicator */}
        {saveStatus !== 'idle' && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: saveStatus === 'saving' ? 'rgba(0, 75, 135, 0.08)' : 'rgba(13, 148, 136, 0.08)',
              color: saveStatus === 'saving' ? '#004B87' : '#0d9488',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: `1px solid ${saveStatus === 'saving' ? 'rgba(0, 75, 135, 0.15)' : 'rgba(13, 148, 136, 0.15)'}`,
              whiteSpace: 'nowrap',
              height: '38px',
              alignSelf: 'center'
            }}
          >
            {saveStatus === 'saving' ? (
              <>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <Check size={12} />
                <span>Cambios guardados</span>
              </>
            )}
          </div>
        )}
        
        {/* Filtro Proyecto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>Proyecto:</span>
          <select 
            value={filterProject} 
            onChange={e => setFilterProject(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <option value="all" style={{ background: '#ffffff', color: '#0F172A' }}>Todos los Proyectos</option>
            <option value="none" style={{ background: '#ffffff', color: '#0F172A' }}>Sin Proyecto Asociado</option>
            {projects.map(p => (
              <option key={p.id} value={p.id} style={{ background: '#ffffff', color: '#0F172A' }}>{p.name}</option>
            ))}
          </select>
        </div>

        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mapeando {recintos.length} sedes prestadoras de servicios</span>
      </div>

      {/* Recintos Loop (Excel block panels style) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {recintos.map((recinto) => {
          const recintoEquips = filteredEquipments.filter(e => e.recintoId === recinto.id);
          const isCollapsed = collapsedRecintos[recinto.id] || false;

          // Calcular avance del recinto con la fórmula aprobada
          const recintoStats = (() => {
            const total = recintoEquips.length;
            if (total === 0) return { completion: 0, completedCount: 0 };
            
            let totalActivePhases = 0;
            let weightedCompletionSum = 0;
            let completedCount = 0;
            
            recintoEquips.forEach(eq => {
              const phasesList = [
                { key: 'levantamiento', val: eq.levantamiento },
                { key: 'parametrizacion', val: eq.parametrizacion },
                { key: 'pruebas', val: eq.pruebas },
                { key: 'capacitacion', val: eq.capacitacion },
                { key: 'validacion', val: eq.validacion },
                { key: 'golive', val: eq.golive }
              ];

              phasesList.forEach(ph => {
                // Ignorar si está oculta por el usuario (no aplica)
                if (hiddenDefaultCols.includes(ph.key)) {
                  return;
                }

                const p = ph.val;
                if (p === 'Descartado' || p === 'Desestimado') return;
                totalActivePhases++;
                if (p === 'Completado') {
                  weightedCompletionSum += 1.0;
                  completedCount++;
                } else if (p === 'En progreso') {
                  weightedCompletionSum += 0.5;
                }
              });
            });
            
            const completion = totalActivePhases === 0 ? 100 : Math.round((weightedCompletionSum / totalActivePhases) * 100);
            return {
              completion,
              completedCount
            };
          })();
          
          return (
            <div key={recinto.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}>
              {/* Header Excel Bupa CLA style banner (Clickable to collapse) */}
              <div 
                style={{ 
                  background: '#004B87', 
                  color: 'white', 
                  padding: '14px 20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background 0.2s ease'
                }}
                onClick={() => toggleRecintoCollapse(recinto.id)}
                className="recinto-header-banner"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ChevronDown 
                    size={18} 
                    style={{ 
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', 
                      transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      flexShrink: 0
                    }} 
                  />
                  <Building2 size={18} />
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.5px' }}>{recinto.name}</span>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '4px' }}>{recinto.code}</span>
                </div>

                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
                  onClick={(e) => e.stopPropagation()} // Detener propagación para evitar colapso al interactuar con el botón
                >
                  {recintoEquips.length > 0 && (
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        background: 'rgba(255,255,255,0.12)', 
                        padding: '6px 14px', 
                        borderRadius: '20px', 
                        fontSize: '0.78rem',
                        border: '1px solid rgba(255,255,255,0.15)'
                      }}
                      title="Porcentaje de Avance Específico de este Recinto"
                    >
                      <span style={{ fontWeight: 800 }}>Avance Sede: {recintoStats.completion}%</span>
                      <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ width: `${recintoStats.completion}%`, height: '100%', background: '#10b981', borderRadius: '3px' }} />
                      </div>
                      <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>({recintoEquips.length} Equipos)</span>
                    </div>
                  )}

                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleAddEquipment(recinto.id)}
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '6px 12px', fontSize: '0.78rem', gap: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <Plus size={14} /> Registrar Equipo
                  </button>
                </div>
              </div>
 
              {/* Data Table Grid (Collapsible) */}
              <div 
                style={{ 
                  maxHeight: isCollapsed ? '0px' : '3000px', 
                  opacity: isCollapsed ? 0 : 1,
                  overflow: 'hidden',
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: '100%'
                }}
              >
                <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', minWidth: '1900px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      <th style={{ padding: '12px 16px', width: '40px' }}>#</th>
                      {!hiddenDefaultCols.includes('name') && <th style={{ padding: '12px 12px', width: '180px' }}>{defaultColNames.name}</th>}
                      {!hiddenDefaultCols.includes('section') && <th style={{ padding: '12px 12px', width: '145px' }}>{defaultColNames.section}</th>}
                      <th style={{ padding: '12px 12px', width: '195px' }}>Proyecto Asociado</th>
                      {!hiddenDefaultCols.includes('levantamiento') && <th style={{ padding: '12px 8px', width: '125px', minWidth: '140px', textAlign: 'center' }}>{defaultColNames.levantamiento}</th>}
                      {!hiddenDefaultCols.includes('parametrizacion') && <th style={{ padding: '12px 8px', width: '125px', minWidth: '140px', textAlign: 'center' }}>{defaultColNames.parametrizacion}</th>}
                      {!hiddenDefaultCols.includes('pruebas') && <th style={{ padding: '12px 8px', width: '125px', minWidth: '140px', textAlign: 'center' }}>{defaultColNames.pruebas}</th>}
                      {!hiddenDefaultCols.includes('capacitacion') && <th style={{ padding: '12px 8px', width: '125px', minWidth: '140px', textAlign: 'center' }}>{defaultColNames.capacitacion}</th>}
                      {!hiddenDefaultCols.includes('validacion') && <th style={{ padding: '12px 8px', width: '125px', minWidth: '140px', textAlign: 'center' }}>{defaultColNames.validacion}</th>}
                      {!hiddenDefaultCols.includes('golive') && <th style={{ padding: '12px 8px', width: '125px', minWidth: '140px', textAlign: 'center' }}>{defaultColNames.golive}</th>}
                      {!hiddenDefaultCols.includes('responsable') && <th style={{ padding: '12px 12px', width: '150px' }}>{defaultColNames.responsable}</th>}
                      {!hiddenDefaultCols.includes('compromisoDate') && <th style={{ padding: '12px 12px', width: '130px' }}>{defaultColNames.compromisoDate}</th>}
                      {!hiddenDefaultCols.includes('observaciones') && <th style={{ padding: '12px 12px', width: '220px' }}>{defaultColNames.observaciones}</th>}
                      {!hiddenDefaultCols.includes('pendienteDe') && <th style={{ padding: '12px 12px', width: '140px' }}>{defaultColNames.pendienteDe}</th>}
                      
                      {/* Cabeceras de Columnas Dinámicas */}
                      {customColumns.map((col, idx) => (
                        <th key={col} style={{ padding: '12px 12px', minWidth: '150px', position: 'relative' }} className="custom-th">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span 
                              style={{ cursor: 'pointer' }} 
                              onClick={() => {
                                setIsAddingCol(true);
                                setEditingColIndex(idx);
                                setEditingColName(col);
                              }} 
                              title="Administrar columna"
                            >
                              {col}
                            </span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button 
                                onClick={() => {
                                  setIsAddingCol(true);
                                  setEditingColIndex(idx);
                                  setEditingColName(col);
                                }} 
                                style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                                title={`Renombrar columna "${col}"`}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button 
                                onClick={() => handleDeleteColumn(col)} 
                                style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', padding: '2px' }}
                                title={`Eliminar columna "${col}"`}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}

                      <th style={{ padding: '12px 16px', width: '50px', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recintoEquips.length === 0 ? (
                      <tr>
                        <td colSpan={15 - hiddenDefaultCols.length + customColumns.length} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No hay equipos registrados en esta sede clínica. Registra uno usando el botón superior.
                        </td>
                      </tr>
                    ) : (
                      recintoEquips.map((eq, index) => {
                        const customFieldsData = eq.customFields ? JSON.parse(eq.customFields) : {};
                        
                        return (
                          <tr key={eq.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }} className="table-row-hover">
                            <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{index + 1}</td>
                            
                            {/* Nombre Equipo */}
                            {!hiddenDefaultCols.includes('name') && (
                              <td style={{ padding: '8px 12px' }}>
                                <InlineInput
                                  value={eq.name}
                                  onSave={(val) => handleUpdateEquipment(eq.id, { name: val })}
                                  style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px solid transparent', borderRadius: '4px', outline: 'none', fontWeight: 600, color: 'var(--text-primary)' }}
                                  className="cell-input"
                                />
                              </td>
                            )}

                            {/* Sección */}
                            {!hiddenDefaultCols.includes('section') && (
                              <td style={{ padding: '8px 12px' }}>
                                <InlineInput
                                  value={eq.section}
                                  onSave={(val) => handleUpdateEquipment(eq.id, { section: val })}
                                  style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px solid transparent', borderRadius: '4px', outline: 'none', color: 'var(--text-primary)' }}
                                  className="cell-input"
                                />
                              </td>
                            )}

                            {/* Proyecto Asociado */}
                            <td style={{ padding: '8px 12px' }}>
                              <select
                                value={eq.projectId || ''}
                                onChange={(e) => handleUpdateEquipment(eq.id, { projectId: e.target.value || null })}
                                style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px solid transparent', borderRadius: '4px', outline: 'none', color: eq.projectId ? '#0079C1' : 'var(--text-muted)', fontWeight: eq.projectId ? 700 : 500, fontSize: '0.8rem', cursor: 'pointer' }}
                                className="cell-input"
                              >
                                <option value="" style={{ background: '#ffffff', color: '#94A3B8' }}>-- Sin Proyecto --</option>
                                {projects.map(p => (
                                  <option key={p.id} value={p.id} style={{ background: '#ffffff', color: '#0F172A' }}>{p.name}</option>
                                ))}
                              </select>
                            </td>

                            {/* Las 6 Fases Select */}
                            {!hiddenDefaultCols.includes('levantamiento') && (
                              <td style={{ padding: '8px 8px', minWidth: '140px' }}>
                                <CustomSelect value={eq.levantamiento} onChange={(val) => handleUpdateEquipment(eq.id, { levantamiento: val })} customStatuses={uniquePhaseStatuses} />
                              </td>
                            )}
                            {!hiddenDefaultCols.includes('parametrizacion') && (
                              <td style={{ padding: '8px 8px', minWidth: '140px' }}>
                                <CustomSelect value={eq.parametrizacion} onChange={(val) => handleUpdateEquipment(eq.id, { parametrizacion: val })} customStatuses={uniquePhaseStatuses} />
                              </td>
                            )}
                            {!hiddenDefaultCols.includes('pruebas') && (
                              <td style={{ padding: '8px 8px', minWidth: '140px' }}>
                                <CustomSelect value={eq.pruebas} onChange={(val) => handleUpdateEquipment(eq.id, { pruebas: val })} customStatuses={uniquePhaseStatuses} />
                              </td>
                            )}
                            {!hiddenDefaultCols.includes('capacitacion') && (
                              <td style={{ padding: '8px 8px', minWidth: '140px' }}>
                                <CustomSelect value={eq.capacitacion} onChange={(val) => handleUpdateEquipment(eq.id, { capacitacion: val })} customStatuses={uniquePhaseStatuses} />
                              </td>
                            )}
                            {!hiddenDefaultCols.includes('validacion') && (
                              <td style={{ padding: '8px 8px', minWidth: '140px' }}>
                                <CustomSelect value={eq.validacion} onChange={(val) => handleUpdateEquipment(eq.id, { validacion: val })} customStatuses={uniquePhaseStatuses} />
                              </td>
                            )}
                            {!hiddenDefaultCols.includes('golive') && (
                              <td style={{ padding: '8px 8px', minWidth: '140px' }}>
                                <CustomSelect value={eq.golive} onChange={(val) => handleUpdateEquipment(eq.id, { golive: val })} customStatuses={uniquePhaseStatuses} />
                              </td>
                            )}

                            {/* Responsable */}
                            {!hiddenDefaultCols.includes('responsable') && (
                              <td style={{ padding: '8px 12px' }}>
                                <InlineInput
                                  value={eq.responsable}
                                  onSave={(val) => handleUpdateEquipment(eq.id, { responsable: val })}
                                  style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px solid transparent', borderRadius: '4px', outline: 'none', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                                  className="cell-input"
                                />
                              </td>
                            )}

                            {/* F. Compromiso */}
                            {!hiddenDefaultCols.includes('compromisoDate') && (
                              <td style={{ padding: '8px 12px' }}>
                                <input 
                                  type="date" 
                                  value={eq.compromisoDate || ''} 
                                  onChange={(e) => handleUpdateEquipment(eq.id, { compromisoDate: e.target.value })}
                                  style={{ width: '100%', padding: '4px 6px', background: 'transparent', border: '1px solid transparent', borderRadius: '4px', outline: 'none', color: 'var(--text-primary)', fontSize: '0.75rem', cursor: 'pointer' }}
                                  className="cell-input"
                                />
                              </td>
                            )}

                            {/* Observaciones con Historial Completo */}
                            {!hiddenDefaultCols.includes('observaciones') && (
                              <td style={{ padding: '8px 12px' }}>
                                <button
                                  onClick={() => {
                                    setSelectedEqForComments(eq);
                                    setIsCommentsOpen(true);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'rgba(0, 75, 135, 0.03)',
                                    border: '1px dashed rgba(0, 75, 135, 0.18)',
                                    borderRadius: '6px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                  }}
                                  className="comments-history-btn"
                                  title="Haga clic para ver o editar el historial completo de comentarios de este equipo"
                                >
                                  <MessageSquare size={13} style={{ color: '#004B87', flexShrink: 0 }} />
                                  <span style={{ 
                                    fontSize: '0.75rem', 
                                    color: 'var(--text-secondary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1
                                  }}>
                                    {(() => {
                                      const list = parseComments(eq.observaciones);
                                      if (list.length === 0) return 'Agregar comentario...';
                                      const latest = list[list.length - 1];
                                      // Si es legacy o primer comentario sin fecha, mostrar texto limpio
                                      return latest.id === 'legacy' ? latest.text : `${latest.author}: ${latest.text}`;
                                    })()}
                                  </span>
                                  <span style={{
                                    fontSize: '0.65rem',
                                    background: '#004B87',
                                    color: 'white',
                                    padding: '1px 5px',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    flexShrink: 0
                                  }}>
                                    {parseComments(eq.observaciones).length}
                                  </span>
                                </button>
                              </td>
                            )}

                            {/* Pendiente de */}
                            {!hiddenDefaultCols.includes('pendienteDe') && (
                              <td style={{ padding: '8px 12px' }}>
                                <InlineInput
                                  value={eq.pendienteDe}
                                  onSave={(val) => handleUpdateEquipment(eq.id, { pendienteDe: val })}
                                  style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px solid transparent', borderRadius: '4px', outline: 'none', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.78rem' }}
                                  className="cell-input"
                                  placeholder="Ej: Proveedor"
                                />
                              </td>
                            )}

                            {/* Celdas de Columnas Dinámicas */}
                            {customColumns.map(col => {
                              const cellValue = customFieldsData[col] || '';
                              return (
                                <td key={col} style={{ padding: '8px 12px' }}>
                                  <InlineInput
                                    value={cellValue}
                                    onSave={(val) => {
                                      const updatedFields = { ...customFieldsData, [col]: val };
                                      handleUpdateEquipment(eq.id, { customFields: JSON.stringify(updatedFields) });
                                    }}
                                    placeholder={`Ingresar ${col.toLowerCase()}...`}
                                    style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px solid transparent', borderRadius: '4px', outline: 'none', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                                    className="cell-input"
                                  />
                                </td>
                              );
                            })}

                            {/* Eliminar fila */}
                            <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                              <button 
                                onClick={() => {
                                  if (confirm(`¿Está seguro de eliminar el equipo "${eq.name}"?`)) {
                                    deleteEquipment(eq.id);
                                  }
                                }} 
                                style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.7 }}
                                title="Eliminar Equipo"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visor de Informes Corporativo */}
      <ReportViewer 
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        filterProjectId={filterProject}
      />

      {/* Modal de Comentarios de Historial de Equipamiento */}
      {isCommentsOpen && selectedEqForComments && (
        <EquipmentCommentsModal
          isOpen={isCommentsOpen}
          onClose={() => {
            setIsCommentsOpen(false);
            setSelectedEqForComments(null);
          }}
          equipmentName={selectedEqForComments.name}
          observaciones={selectedEqForComments.observaciones}
          onSaveComments={async (updatedJson) => {
            await handleUpdateEquipment(selectedEqForComments.id, { observaciones: updatedJson });
            setSelectedEqForComments(prev => prev ? { ...prev, observaciones: updatedJson } : null);
          }}
          availableUsers={users}
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .table-row-hover:hover { background: var(--bg-tertiary) !important; }
        .cell-input:focus { border: 1px solid var(--accent-primary) !important; background: var(--bg-primary) !important; box-shadow: 0 0 0 2px rgba(0,121,193,0.1); }

        /* Modal Custom Bupa */
        .custom-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 59, 100, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          animation: fadeIn 0.2s ease-out;
        }

        .custom-modal-card {
          background: white;
          border-radius: var(--radius-lg);
          padding: 24px;
          width: 400px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
          animation: scaleUp 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
}
