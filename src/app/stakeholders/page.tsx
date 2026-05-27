"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useStakeholderStore, Stakeholder } from '@/store/stakeholderStore';
import { useEquipmentStore } from '@/store/equipmentStore';
import { useProjectStore } from '@/store/projectStore';
import { 
  Plus, 
  Trash2, 
  Search, 
  Users, 
  Filter, 
  Sliders, 
  FileSpreadsheet, 
  X, 
  Award,
  AlertOctagon,
  Briefcase,
  Layers,
  ChevronDown,
  Loader2,
  Check,
  Edit2
} from 'lucide-react';
import { InlineInput, InlineTextarea } from '@/components/InlineInput';

// Estilos de Pill de Influencia e Impacto
const STATS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  'Alto': { bg: 'rgba(225, 29, 72, 0.1)', color: '#e11d48', border: 'rgba(225, 29, 72, 0.2)' },
  'Medio': { bg: 'rgba(245, 158, 11, 0.1)', color: '#b45309', border: 'rgba(245, 158, 11, 0.2)' },
  'Bajo': { bg: 'rgba(3, 105, 161, 0.1)', color: '#0369a1', border: 'rgba(3, 105, 161, 0.2)' }
};

export default function StakeholdersPage() {
  const stakeholders = useStakeholderStore(state => state.stakeholders);
  const addStakeholder = useStakeholderStore(state => state.addStakeholder);
  const updateStakeholder = useStakeholderStore(state => state.updateStakeholder);
  const deleteStakeholder = useStakeholderStore(state => state.deleteStakeholder);
  const fetchStakeholders = useStakeholderStore(state => state.fetchStakeholders);

  const recintos = useEquipmentStore(state => state.recintos);
  const fetchEquipmentData = useEquipmentStore(state => state.fetchEquipmentData);

  const projects = useProjectStore(state => state.projects);
  const fetchProjects = useProjectStore(state => state.fetchProjects);

  // Auto-save Feedback State
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleUpdateStakeholder = async (stId: string, updates: any) => {
    setSaveStatus('saving');
    try {
      await updateStakeholder(stId, updates);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (e) {
      console.error(e);
      setSaveStatus('idle');
    }
  };

  useEffect(() => {
    fetchStakeholders();
    fetchEquipmentData();
    fetchProjects();
  }, []);

  // Estados de filtrado y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSede, setFilterSede] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');

  // Estado para columnas dinámicas
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [newColName, setNewColName] = useState('');
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [editingColIndex, setEditingColIndex] = useState<number | null>(null);
  const [editingColName, setEditingColName] = useState('');

  // Cargar columnas dinámicas desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('custom_cols_stakeholders');
    if (saved) {
      try {
        setCustomColumns(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading custom columns', e);
      }
    }
  }, []);

  // Auto-descubrimiento y sincronización de columnas desde la base de datos
  useEffect(() => {
    if (stakeholders && stakeholders.length > 0) {
      const dbKeys = new Set<string>();
      stakeholders.forEach(st => {
        if (st.customFields) {
          try {
            const parsed = JSON.parse(st.customFields);
            Object.keys(parsed).forEach(k => {
              if (k.trim()) dbKeys.add(k.trim());
            });
          } catch (e) {
            console.error('Error parsing customFields for stakeholder ' + st.id, e);
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
        localStorage.setItem('custom_cols_stakeholders', JSON.stringify(updated));
      }
    }
  }, [stakeholders]);

  // Guardar columnas dinámicas en localStorage
  const saveCustomColumns = (cols: string[]) => {
    setCustomColumns(cols);
    localStorage.setItem('custom_cols_stakeholders', JSON.stringify(cols));
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
      
      // Limpiar los datos de los stakeholders asociados a esa columna
      stakeholders.forEach(st => {
        const customFields = st.customFields ? JSON.parse(st.customFields) : {};
        if (customFields[colName] !== undefined) {
          delete customFields[colName];
          updateStakeholder(st.id, { customFields: JSON.stringify(customFields) });
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
    
    // 2. Renombrar la llave en el JSON customFields de cada stakeholder
    stakeholders.forEach(st => {
      if (st.customFields) {
        try {
          const fields = JSON.parse(st.customFields);
          if (fields[oldName] !== undefined) {
            fields[cleanName] = fields[oldName];
            delete fields[oldName];
            handleUpdateStakeholder(st.id, { customFields: JSON.stringify(fields) });
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  // Cálculos estadísticos para KPIs reales sincronizados
  const stats = useMemo(() => {
    const total = stakeholders.length;
    const altoImpacto = stakeholders.filter(s => s.impact === 'Alto').length;
    const altaInfluencia = stakeholders.filter(s => s.influence === 'Alto').length;
    
    // Contar proyectos únicos asociados
    const proyectosUnicos = new Set(stakeholders.map(s => s.projectId).filter(Boolean));
    const proyectosAsociados = proyectosUnicos.size;

    return { total, altoImpacto, altaInfluencia, proyectosAsociados };
  }, [stakeholders]);

  // Filtrado reactivo de Stakeholders
  const filteredStakeholders = useMemo(() => {
    return stakeholders.filter(st => {
      const matchesSearch = 
        st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.orgSede.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.notes.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSede = filterSede === 'all' || st.orgSede === filterSede;
      const matchesProject = filterProject === 'all' || st.projectId === filterProject;

      return matchesSearch && matchesSede && matchesProject;
    });
  }, [stakeholders, searchTerm, filterSede, filterProject]);

  // Obtener lista única de recintos que ya tienen stakeholders para rellenar filtros
  const uniqueSedesInStakeholders = useMemo(() => {
    const list = new Set(stakeholders.map(s => s.orgSede));
    return Array.from(list).filter(Boolean);
  }, [stakeholders]);

  // Obtener opciones dinámicas personalizadas ingresadas
  const uniqueInfluence = useMemo(() => {
    const defaults = ['Alto', 'Medio', 'Bajo'];
    const uniques = new Set<string>();
    stakeholders.forEach(s => {
      if (s.influence && !defaults.includes(s.influence)) {
        uniques.add(s.influence);
      }
    });
    return Array.from(uniques);
  }, [stakeholders]);

  const uniqueImpact = useMemo(() => {
    const defaults = ['Alto', 'Medio', 'Bajo'];
    const uniques = new Set<string>();
    stakeholders.forEach(s => {
      if (s.impact && !defaults.includes(s.impact)) {
        uniques.add(s.impact);
      }
    });
    return Array.from(uniques);
  }, [stakeholders]);

  // Handler para agregar un stakeholder vacío
  const handleCreateStakeholder = () => {
    const nextIndexId = stakeholders.reduce((max, s) => Math.max(max, s.indexId), 0) + 1;

    // Valores por defecto
    const defaultSede = recintos.length > 0 ? recintos[0].name : 'BUPA Santiago';
    const defaultProject = projects.length > 0 ? projects[0].id : null;
    const defaultProjectName = projects.length > 0 ? projects[0].name : '';

    const newStakeholder: Stakeholder = {
      id: `st-${Date.now()}`,
      indexId: nextIndexId,
      name: '',
      role: '',
      orgSede: defaultSede,
      area: '',
      contact: '',
      influence: 'Medio',
      impact: 'Medio',
      notes: '',
      projectId: defaultProject,
      customFields: '{}'
    };

    addStakeholder(newStakeholder);
  };

  // Limpiar filtros
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterSede('all');
    setFilterProject('all');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
      
      {/* 1. Header Banner - Bupa Dark Corporate Theme */}
      <div className="stakeholder-header-banner">
        <div className="stakeholder-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={32} color="#FFFFFF" className="pulse-icon" />
            <h1 style={{ fontSize: '2rem', color: '#FFFFFF', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Registro de Stakeholders - Partes Interesadas
            </h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.98rem', margin: '8px 0 0', fontWeight: 400, maxWidth: '850px' }}>
            Identifique todos los actores clave, su rol en la organización, área y nivel de influencia e impacto en el proyecto. 
            Vincule directamente a cada interesado con clínicas y proyectos específicos de su portafolio.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary shadow-sm"
            onClick={() => {
              setIsAddingCol(true);
              setEditingColIndex(null);
            }}
            style={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              color: '#FFFFFF', 
              border: '1px solid rgba(255, 255, 255, 0.3)', 
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
          <button 
            className="btn btn-secondary shadow-sm"
            onClick={handleCreateStakeholder}
            style={{ 
              background: '#FFFFFF', 
              color: '#004B87', 
              border: 'none', 
              padding: '10px 18px', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderRadius: 'var(--radius-md)',
              transition: 'transform var(--transition-fast)'
            }}
          >
            <Plus size={16} strokeWidth={3} />
            Nuevo Interesado
          </button>
        </div>
      </div>

      {/* Modal de Administración de Columnas */}
      {isAddingCol && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card" style={{ width: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#003B64', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} />
                Administrar Columnas
              </h3>
              <button onClick={() => setIsAddingCol(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Formulario Agregar Columna */}
            <form onSubmit={handleAddColumn} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>+ Crear Columna Nueva</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Ej. Departamento, Compañía, Cargo..." 
                  value={newColName} 
                  onChange={e => setNewColName(e.target.value)}
                  className="control-input"
                  style={{ flex: 1, padding: '8px', border: '1px solid var(--border-light)', borderRadius: '6px', outline: 'none', background: 'white', fontSize: '0.85rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', background: '#004B87', color: 'white', border: 'none', fontSize: '0.82rem' }}>Crear</button>
              </div>
            </form>

            {/* Listado de Columnas Existentes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>Columnas Activas ({customColumns.length})</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
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
                            className="control-input"
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button type="button" onClick={() => setIsAddingCol(false)} className="btn btn-secondary" style={{ padding: '8px 16px', background: '#004B87', color: 'white', border: 'none' }}>Listo</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Faja de KPIs Estilo Premium Excel */}
      <div className="kpi-grid">
        {/* KPI Total */}
        <div className="kpi-card total-stakeholders">
          <div className="kpi-card-inner">
            <div>
              <div className="kpi-label">TOTAL STAKEHOLDERS</div>
              <div className="kpi-value">{stats.total}</div>
            </div>
            <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(3, 105, 161, 0.12)', color: '#0369a1' }}>
              <FileSpreadsheet size={20} />
            </div>
          </div>
        </div>

        {/* KPI Alto Impacto */}
        <div className="kpi-card high-impact">
          <div className="kpi-card-inner">
            <div>
              <div className="kpi-label">ALTO IMPACTO</div>
              <div className="kpi-value">{stats.altoImpacto}</div>
            </div>
            <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(225, 29, 72, 0.12)', color: '#e11d48' }}>
              <AlertOctagon size={20} />
            </div>
          </div>
        </div>

        {/* KPI Alta Influencia */}
        <div className="kpi-card high-influence">
          <div className="kpi-card-inner">
            <div>
              <div className="kpi-label">ALTA INFLUENCIA</div>
              <div className="kpi-value">{stats.altaInfluencia}</div>
            </div>
            <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#b45309' }}>
              <Award size={20} />
            </div>
          </div>
        </div>

        {/* KPI Proyectos Asociados */}
        <div className="kpi-card associated-projects">
          <div className="kpi-card-inner">
            <div>
              <div className="kpi-label">PROYECTOS ASOCIADOS</div>
              <div className="kpi-value">{stats.proyectosAsociados}</div>
            </div>
            <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(79, 70, 229, 0.12)', color: '#4f46e5' }}>
              <Briefcase size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Controles & Filtros */}
      <div className="controls-panel">
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', width: '100%' }}>
          
          {/* Búsqueda */}
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, cargo, sede, área, contacto o expectativas..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="control-input"
              style={{ paddingLeft: '40px' }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            )}
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

          {/* Filtro Recinto / Sede */}
          <div className="filter-wrapper">
            <span className="filter-label"><Filter size={12} /> Sede</span>
            <select 
              value={filterSede} 
              onChange={e => setFilterSede(e.target.value)}
              className="control-select"
            >
              <option value="all">Todas las Sedes</option>
              {recintos.map(r => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
              {uniqueSedesInStakeholders.map(name => {
                if (recintos.some(r => r.name === name)) return null;
                return <option key={name} value={name}>{name}</option>;
              })}
            </select>
          </div>

          {/* Filtro Proyecto */}
          <div className="filter-wrapper">
            <span className="filter-label"><Briefcase size={12} /> Proyecto</span>
            <select 
              value={filterProject} 
              onChange={e => setFilterProject(e.target.value)}
              className="control-select"
            >
              <option value="all">Todos los Proyectos</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Limpiar Filtros */}
          {(searchTerm || filterSede !== 'all' || filterProject !== 'all') && (
            <button 
              onClick={handleResetFilters}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.82rem', height: '38px', borderRadius: 'var(--radius-sm)' }}
            >
              Limpiar Filtros
            </button>
          )}

        </div>
      </div>

      {/* 4. Tabla de Datos Excel-Like */}
      <div className="table-container shadow-sm">
        <div style={{ overflowX: 'auto', width: '100%', height: '100%' }}>
          <table className="stakeholders-table">
            <thead>
              <tr>
                <th style={{ width: '55px', textAlign: 'center' }}>ID</th>
                <th style={{ minWidth: '180px' }}>Nombre</th>
                <th style={{ minWidth: '180px' }}>Cargo / Rol en el Proyecto</th>
                <th style={{ width: '160px' }}>Organización / Sede</th>
                <th style={{ minWidth: '140px' }}>Área</th>
                <th style={{ minWidth: '180px' }}>Contacto (email/fono)</th>
                <th style={{ width: '125px', textAlign: 'center' }}>Nivel de Influencia</th>
                <th style={{ width: '125px', textAlign: 'center' }}>Nivel de Impacto</th>
                <th style={{ minWidth: '240px' }}>Notas / Expectativas</th>
                <th style={{ width: '160px' }}>Proyecto Asociado</th>
                
                {/* Cabeceras de Columnas Dinámicas */}
                {customColumns.map((col, idx) => (
                  <th key={col} style={{ minWidth: '150px', position: 'relative' }} className="custom-th">
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
                
                <th style={{ width: '55px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredStakeholders.length === 0 ? (
                <tr>
                  <td colSpan={10 + customColumns.length + 1} className="no-data-cell">
                    <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Users size={36} color="var(--text-muted)" />
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No se encontraron stakeholders registrados</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {stakeholders.length === 0 
                          ? 'Comience registrando una sesión con el botón superior.' 
                          : 'Pruebe a limpiar los filtros activos.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStakeholders.map((st) => {
                  const influenceColor = STATS_STYLE[st.influence] || STATS_STYLE['Medio'];
                  const impactColor = STATS_STYLE[st.impact] || STATS_STYLE['Medio'];
                  
                  // Obtener datos custom
                  const customFieldsData = st.customFields ? JSON.parse(st.customFields) : {};

                  return (
                    <tr key={st.id} className="stakeholder-row">
                      
                      {/* ID correlativo */}
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#004B87', backgroundColor: '#F8FAFC' }}>
                        #{st.indexId}
                      </td>

                      {/* Nombre */}
                      <td>
                        <InlineInput
                          value={st.name}
                          onSave={(val) => handleUpdateStakeholder(st.id, { name: val })}
                          placeholder="Nombre del interesado..."
                          className="table-cell-input"
                          style={{ fontWeight: 600, color: 'var(--text-primary)' }}
                        />
                      </td>

                      {/* Cargo / Rol */}
                      <td>
                        <InlineInput
                          value={st.role}
                          onSave={(val) => handleUpdateStakeholder(st.id, { role: val })}
                          placeholder="Ej: Coordinador, Jefe de Lab..."
                          className="table-cell-input"
                        />
                      </td>

                      {/* Organización / Sede */}
                      <td>
                        <select
                          value={st.orgSede}
                          onChange={(e) => handleUpdateStakeholder(st.id, { orgSede: e.target.value })}
                          className="table-cell-select"
                          style={{ fontWeight: 600 }}
                        >
                          {recintos.map(r => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                          {uniqueSedesInStakeholders.map(name => {
                            if (recintos.some(r => r.name === name)) return null;
                            return <option key={name} value={name}>{name}</option>;
                          })}
                          <option value="BUPA/TI">BUPA/TI</option>
                          <option value="BUPA">BUPA</option>
                          <option value="Proveedor">Proveedor</option>
                          <option value="BUPA / sede">BUPA / sede</option>
                        </select>
                      </td>

                      {/* Área */}
                      <td>
                        <InlineInput
                          value={st.area}
                          onSave={(val) => handleUpdateStakeholder(st.id, { area: val })}
                          placeholder="Ej: Laboratorio, TI, Calidad..."
                          className="table-cell-input"
                        />
                      </td>

                      {/* Contacto */}
                      <td>
                        <InlineInput
                          value={st.contact}
                          onSave={(val) => handleUpdateStakeholder(st.id, { contact: val })}
                          placeholder="Ej: correo@bupa.cl / +569..."
                          className="table-cell-input"
                        />
                      </td>

                      {/* Influencia */}
                      <td style={{ textAlign: 'center' }}>
                        <select
                          value={st.influence}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__custom__') {
                              const customVal = prompt("Ingrese nivel de influencia personalizado:");
                              if (customVal && customVal.trim()) {
                                handleUpdateStakeholder(st.id, { influence: customVal.trim() });
                              }
                            } else {
                              handleUpdateStakeholder(st.id, { influence: val });
                            }
                          }}
                          style={{
                            background: influenceColor.bg,
                            color: influenceColor.color,
                            border: `1px solid ${influenceColor.border}`,
                            borderRadius: '20px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            outline: 'none',
                            cursor: 'pointer',
                            textAlign: 'center',
                            width: '100px',
                            textAlignLast: 'center'
                          }}
                          className="table-cell-select-badge"
                        >
                          <option value="Alto">Alto</option>
                          <option value="Medio">Medio</option>
                          <option value="Bajo">Bajo</option>
                          {uniqueInfluence.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          <option value="__custom__">➕ Otro...</option>
                        </select>
                      </td>

                      {/* Impacto */}
                      <td style={{ textAlign: 'center' }}>
                        <select
                          value={st.impact}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__custom__') {
                              const customVal = prompt("Ingrese nivel de impacto personalizado:");
                              if (customVal && customVal.trim()) {
                                handleUpdateStakeholder(st.id, { impact: customVal.trim() });
                              }
                            } else {
                              handleUpdateStakeholder(st.id, { impact: val });
                            }
                          }}
                          style={{
                            background: impactColor.bg,
                            color: impactColor.color,
                            border: `1px solid ${impactColor.border}`,
                            borderRadius: '20px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            outline: 'none',
                            cursor: 'pointer',
                            textAlign: 'center',
                            width: '100px',
                            textAlignLast: 'center'
                          }}
                          className="table-cell-select-badge"
                        >
                          <option value="Alto">Alto</option>
                          <option value="Medio">Medio</option>
                          <option value="Bajo">Bajo</option>
                          {uniqueImpact.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          <option value="__custom__">➕ Otro...</option>
                        </select>
                      </td>

                      {/* Notas */}
                      <td>
                        <InlineTextarea
                          value={st.notes}
                          onSave={(val) => handleUpdateStakeholder(st.id, { notes: val })}
                          placeholder="Expectativas, preocupaciones, planes de alineación..."
                          className="table-cell-textarea"
                        />
                      </td>

                      {/* Proyecto Asociado */}
                      <td>
                        <select
                          value={st.projectId || ''}
                          onChange={(e) => handleUpdateStakeholder(st.id, { projectId: e.target.value || null })}
                          className="table-cell-select"
                        >
                          <option value="">Sin Proyecto</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Celdas de Columnas Dinámicas */}
                      {customColumns.map(col => {
                        const cellValue = customFieldsData[col] || '';
                        return (
                          <td key={col}>
                            <InlineInput
                              value={cellValue}
                              onSave={(val) => {
                                const updatedFields = { ...customFieldsData, [col]: val };
                                handleUpdateStakeholder(st.id, { customFields: JSON.stringify(updatedFields) });
                              }}
                              placeholder={`Ingresar ${col.toLowerCase()}...`}
                              className="table-cell-input"
                            />
                          </td>
                        );
                      })}

                      {/* Acciones */}
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => {
                            if (confirm(`¿Está seguro de eliminar al interesado ${st.name || 'este participante'}?`)) {
                              deleteStakeholder(st.id);
                            }
                          }}
                          className="delete-row-btn"
                          title="Eliminar Interesado"
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

      {/* Estilos Scoped exactos Bupa */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Banner Principal */
        .stakeholder-header-banner {
          background: linear-gradient(135deg, #003B64 0%, #005E96 100%);
          border-radius: var(--radius-lg);
          padding: 24px 32px;
          color: #FFFFFF;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 10px 25px -5px rgba(0, 59, 100, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          position: relative;
          overflow: hidden;
          animation: slideIn 0.5s ease-out;
        }

        .stakeholder-header-banner::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        /* KPIs Estilo Premium Excel */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .kpi-card {
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          padding: 20px 24px;
          border: 1px solid var(--border-subtle);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--panel-shadow);
        }

        /* Colores KPIs */
        .total-stakeholders {
          background: #E0F2FE; /* Celeste */
          border-color: #BAE6FD;
        }
        .total-stakeholders .kpi-label { color: #0369A1; }
        .total-stakeholders .kpi-value { color: #0C4A6E; }

        .high-impact {
          background: #FFE4E6; /* Rosa / Rojo */
          border-color: #FECDD3;
        }
        .high-impact .kpi-label { color: #BE123C; }
        .high-impact .kpi-value { color: #881337; }

        .high-influence {
          background: #FEF3C7; /* Amarillo Claro */
          border-color: #FDE68A;
        }
        .high-influence .kpi-label { color: #B45309; }
        .high-influence .kpi-value { color: #78350F; }

        .associated-projects {
          background: #EEF2FF; /* Indigo Claro */
          border-color: #E0E7FF;
        }
        .associated-projects .kpi-label { color: #4F46E5; }
        .associated-projects .kpi-value { color: #312E81; }

        .kpi-card-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .kpi-label {
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .kpi-value {
          font-size: 2.2rem;
          font-weight: 900;
          line-height: 1;
          margin-top: 6px;
        }

        .kpi-icon-container {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Panel de Controles */
        .controls-panel {
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          padding: 16px 20px;
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .control-input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          outline: none;
          font-family: inherit;
          font-size: 0.85rem;
          transition: border-color var(--transition-fast), background-color var(--transition-fast);
        }

        .control-input:focus {
          border-color: var(--accent-primary);
          background: var(--bg-secondary);
        }

        .filter-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          padding: 0 10px;
          height: 38px;
        }

        .filter-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }

        .control-select {
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          padding: 4px;
        }

        /* Contenedor y Tabla */
        .table-container {
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          overflow: hidden;
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .stakeholders-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.82rem;
          text-align: left;
          min-width: 1850px;
        }

        .stakeholders-table th {
          background: #F1F5F9;
          color: var(--text-secondary);
          font-weight: 700;
          padding: 14px 12px;
          border-bottom: 2px solid var(--border-light);
          position: sticky;
          top: 0;
          z-index: 10;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stakeholder-row {
          border-bottom: 1px solid var(--border-subtle);
          transition: background-color var(--transition-fast);
        }

        .stakeholder-row:hover {
          background-color: #F8FAFC !important;
        }

        .stakeholder-row td {
          padding: 8px 10px;
          vertical-align: middle;
          border-bottom: 1px solid #E2E8F0;
        }

        .table-cell-input {
          width: 100%;
          padding: 8px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          outline: none;
          color: var(--text-primary);
          font-family: inherit;
          font-weight: inherit;
          transition: all 0.15s ease;
        }

        .table-cell-input:focus {
          border: 1px solid var(--accent-primary);
          background: var(--bg-secondary);
          box-shadow: 0 0 0 2px rgba(0, 121, 193, 0.1);
        }

        .table-cell-select {
          width: 100%;
          padding: 8px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          outline: none;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .table-cell-select:focus {
          border: 1px solid var(--accent-primary);
          background: var(--bg-secondary);
        }

        .table-cell-textarea {
          width: 100%;
          padding: 8px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          outline: none;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.82rem;
          resize: vertical;
          transition: all 0.15s ease;
        }

        .table-cell-textarea:focus {
          border: 1px solid var(--accent-primary);
          background: var(--bg-secondary);
          box-shadow: 0 0 0 2px rgba(0, 121, 193, 0.1);
        }

        .table-cell-select-badge {
          font-family: inherit;
          transition: all 0.15s ease;
        }

        .table-cell-select-badge:focus {
          box-shadow: 0 0 0 2px var(--accent-primary);
        }

        .delete-row-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }

        .delete-row-btn:hover {
          color: var(--accent-danger);
          background: rgba(225, 29, 72, 0.08);
        }

        .no-data-cell {
          text-align: center;
          background: var(--bg-secondary);
        }

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

        /* Animaciones */
        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .pulse-icon {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}} />

    </div>
  );
}
