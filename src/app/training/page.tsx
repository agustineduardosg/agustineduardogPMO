"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useTrainingStore, Training, TrainingResult } from '@/store/trainingStore';
import { useEquipmentStore } from '@/store/equipmentStore';
import { 
  Plus, 
  Trash2, 
  Search, 
  GraduationCap, 
  BookOpen, 
  CheckCircle, 
  Hourglass,
  Sliders,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Award,
  Loader2,
  Check,
  Edit2
} from 'lucide-react';
import { InlineInput, InlineTextarea } from '@/components/InlineInput';

// Estilos de Resultado (Badge Píldora interactivo)
const RESULT_STYLE: Record<TrainingResult, { bg: string; color: string; border: string }> = {
  'Aprobado': { bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: 'rgba(13, 148, 136, 0.2)' },
  'Pendiente': { bg: 'rgba(245, 158, 11, 0.1)', color: '#b45309', border: 'rgba(245, 158, 11, 0.2)' },
  'Reprobado': { bg: 'rgba(225, 29, 72, 0.1)', color: '#e11d48', border: 'rgba(225, 29, 72, 0.2)' }
};

export default function TrainingsPage() {
  const trainings = useTrainingStore(state => state.trainings);
  const addTraining = useTrainingStore(state => state.addTraining);
  const updateTraining = useTrainingStore(state => state.updateTraining);
  const deleteTraining = useTrainingStore(state => state.deleteTraining);
  const fetchTrainings = useTrainingStore(state => state.fetchTrainings);

  const recintos = useEquipmentStore(state => state.recintos);
  const equipments = useEquipmentStore(state => state.equipments);
  const fetchEquipmentData = useEquipmentStore(state => state.fetchEquipmentData);

  // Auto-save Feedback State
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleUpdateTraining = async (tId: string, updates: any) => {
    setSaveStatus('saving');
    try {
      await updateTraining(tId, updates);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (e) {
      console.error(e);
      setSaveStatus('idle');
    }
  };

  useEffect(() => {
    fetchTrainings();
    fetchEquipmentData();
  }, []);

  // Estados de filtrado y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [filterRecinto, setFilterRecinto] = useState<string>('all');

  // Estado para columnas dinámicas
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [newColName, setNewColName] = useState('');
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [editingColIndex, setEditingColIndex] = useState<number | null>(null);
  const [editingColName, setEditingColName] = useState('');

  // Cargar columnas dinámicas desde localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('custom_cols_trainings');
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
    if (trainings && trainings.length > 0) {
      const dbKeys = new Set<string>();
      trainings.forEach(tr => {
        if (tr.customFields) {
          try {
            const parsed = JSON.parse(tr.customFields);
            Object.keys(parsed).forEach(k => {
              if (k.trim()) dbKeys.add(k.trim());
            });
          } catch (e) {
            console.error('Error parsing customFields for training ' + tr.id, e);
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
        localStorage.setItem('custom_cols_trainings', JSON.stringify(updated));
      }
    }
  }, [trainings]);

  // Guardar columnas dinámicas en localStorage
  const saveCustomColumns = (cols: string[]) => {
    setCustomColumns(cols);
    localStorage.setItem('custom_cols_trainings', JSON.stringify(cols));
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
      
      // Limpiar los datos de las capacitaciones asociados a esa columna
      trainings.forEach(t => {
        const customFields = t.customFields ? JSON.parse(t.customFields) : {};
        if (customFields[colName] !== undefined) {
          delete customFields[colName];
          updateTraining(t.id, { customFields: JSON.stringify(customFields) });
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
    
    // 2. Renombrar la llave en el JSON customFields de cada capacitación
    trainings.forEach(t => {
      if (t.customFields) {
        try {
          const fields = JSON.parse(t.customFields);
          if (fields[oldName] !== undefined) {
            fields[cleanName] = fields[oldName];
            delete fields[oldName];
            handleUpdateTraining(t.id, { customFields: JSON.stringify(fields) });
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  // Cálculos estadísticos para KPIs reales sincronizados
  const stats = useMemo(() => {
    const total = trainings.length;
    const aprobados = trainings.filter(t => t.result === 'Aprobado').length;
    const pendientes = trainings.filter(t => t.result === 'Pendiente').length;
    
    // Contar sedes únicas con al menos una capacitación
    const sedesUnicas = new Set(trainings.map(t => t.recintoName).filter(Boolean));
    const sedesCubiertas = sedesUnicas.size;

    return { total, aprobados, pendientes, sedesCubiertas };
  }, [trainings]);

  // Filtrado reactivo de capacitaciones
  const filteredTrainings = useMemo(() => {
    return trainings.filter(training => {
      const matchesSearch = 
        training.participant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        training.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        training.moduleTheme.toLowerCase().includes(searchTerm.toLowerCase()) ||
        training.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        training.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        training.observaciones.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesResult = filterResult === 'all' || training.result === filterResult;
      const matchesRecinto = filterRecinto === 'all' || training.recintoName === filterRecinto;

      return matchesSearch && matchesResult && matchesRecinto;
    });
  }, [trainings, searchTerm, filterResult, filterRecinto]);

  // Obtener lista única de recintos que ya tienen capacitaciones para rellenar filtros
  const uniqueRecintosInTrainings = useMemo(() => {
    const list = new Set(trainings.map(t => t.recintoName));
    return Array.from(list).filter(Boolean);
  }, [trainings]);

  // Obtener opciones dinámicas personalizadas ingresadas
  const uniqueResults = useMemo(() => {
    const defaults = ['Aprobado', 'Pendiente', 'Reprobado'];
    const uniques = new Set<string>();
    trainings.forEach(t => {
      if (t.result && !defaults.includes(t.result)) {
        uniques.add(t.result);
      }
    });
    return Array.from(uniques);
  }, [trainings]);

  // Handler para agregar una capacitación en blanco
  const handleCreateTraining = () => {
    const nextIndexId = trainings.reduce((max, t) => Math.max(max, t.indexId), 0) + 1;
    const todayStr = new Date().toISOString().split('T')[0];

    // Valores por defecto
    const defaultRecinto = recintos.length > 0 ? recintos[0].name : 'BUPA CLA';
    const defaultEquipment = equipments.length > 0 ? equipments[0].name : 'Atellica Solution';

    const newTraining: Training = {
      id: `train-${Date.now()}`,
      indexId: nextIndexId,
      participant: '',
      role: '',
      recintoName: defaultRecinto,
      moduleTheme: '',
      equipmentName: defaultEquipment,
      fecha: todayStr,
      instructor: '',
      duration: 1.0,
      result: 'Pendiente',
      observaciones: '',
      customFields: '{}'
    };

    addTraining(newTraining);
  };

  // Limpiar filtros
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterResult('all');
    setFilterRecinto('all');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
      
      {/* 1. Header Banner - Bupa Dark Corporate Theme */}
      <div className="training-header-banner">
        <div className="training-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <GraduationCap size={32} color="#FFFFFF" className="pulse-icon" />
            <h1 style={{ fontSize: '2rem', color: '#FFFFFF', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Registro de Capacitaciones a Usuarios
            </h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.98rem', margin: '8px 0 0', fontWeight: 400, maxWidth: '850px' }}>
            Gestione las sesiones de capacitación dirigidas al personal clínico y técnico. 
            Realice seguimiento de participantes, temas abordados, equipos relacionados, duraciones y resultados evaluativos.
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
            onClick={handleCreateTraining}
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
            Nueva Capacitación
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
                  placeholder="Ej. Departamento, Compañía, Horas..." 
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
        {/* KPI Total Capacitaciones */}
        <div className="kpi-card total-trainings">
          <div className="kpi-card-inner">
            <div>
              <div className="kpi-label">TOTAL CAPACITACIONES</div>
              <div className="kpi-value">{stats.total}</div>
            </div>
            <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(3, 105, 161, 0.12)', color: '#0369a1' }}>
              <FileSpreadsheet size={20} />
            </div>
          </div>
        </div>

        {/* KPI Aprobados */}
        <div className="kpi-card approved-trainings">
          <div className="kpi-card-inner">
            <div>
              <div className="kpi-label">USUARIOS APROBADOS</div>
              <div className="kpi-value">{stats.aprobados}</div>
            </div>
            <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(13, 148, 136, 0.12)', color: '#0d9488' }}>
              <Award size={20} />
            </div>
          </div>
        </div>

        {/* KPI Pendientes */}
        <div className="kpi-card pending-trainings">
          <div className="kpi-card-inner">
            <div>
              <div className="kpi-label">PENDIENTES</div>
              <div className="kpi-value">{stats.pendientes}</div>
            </div>
            <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(180, 83, 9, 0.12)', color: '#b45309' }}>
              <Hourglass size={20} className="spin-slow" />
            </div>
          </div>
        </div>

        {/* KPI Sedes Cubiertas */}
        <div className="kpi-card covered-recintos">
          <div className="kpi-card-inner">
            <div>
              <div className="kpi-label">SEDES CUBIERTAS</div>
              <div className="kpi-value">{stats.sedesCubiertas}</div>
            </div>
            <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(79, 70, 229, 0.12)', color: '#4f46e5' }}>
              <Filter size={20} />
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
              placeholder="Buscar participante, cargo, tema, relator u observaciones..." 
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
              value={filterRecinto} 
              onChange={e => setFilterRecinto(e.target.value)}
              className="control-select"
            >
              <option value="all">Todas las Sedes</option>
              {recintos.map(r => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
              {uniqueRecintosInTrainings.map(name => {
                if (recintos.some(r => r.name === name)) return null;
                return <option key={name} value={name}>{name}</option>;
              })}
            </select>
          </div>

          {/* Filtro Resultado */}
          <div className="filter-wrapper">
            <span className="filter-label"><Sliders size={12} /> Resultado</span>
            <select 
              value={filterResult} 
              onChange={e => setFilterResult(e.target.value)}
              className="control-select"
            >
              <option value="all">Todos los Resultados</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Reprobado">Reprobado</option>
            </select>
          </div>

          {/* Limpiar Filtros */}
          {(searchTerm || filterResult !== 'all' || filterRecinto !== 'all') && (
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
          <table className="trainings-table">
            <thead>
              <tr>
                <th style={{ width: '55px', textAlign: 'center' }}>ID</th>
                <th style={{ minWidth: '180px' }}>Nombre del Participante</th>
                <th style={{ minWidth: '160px' }}>Cargo / Rol</th>
                <th style={{ width: '160px' }}>Sede / Clínica</th>
                <th style={{ minWidth: '220px' }}>Módulo / Tema Capacitado</th>
                <th style={{ minWidth: '180px' }}>Equipo(s) Relacionado(s)</th>
                <th style={{ width: '120px' }}>Fecha</th>
                <th style={{ minWidth: '180px' }}>Instructor / Relator</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Duración (hrs)</th>
                <th style={{ width: '125px', textAlign: 'center' }}>Resultado</th>
                <th style={{ minWidth: '240px' }}>Observaciones</th>
                
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
              {filteredTrainings.length === 0 ? (
                <tr>
                  <td colSpan={12 + customColumns.length} className="no-data-cell">
                    <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <GraduationCap size={36} color="var(--text-muted)" />
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No se encontraron capacitaciones registradas</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {trainings.length === 0 
                          ? 'Comience registrando una sesión con el botón superior.' 
                          : 'Pruebe a limpiar los filtros activos.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrainings.map((train) => {
                  const resultColor = RESULT_STYLE[train.result] || { bg: 'rgba(0, 121, 193, 0.08)', color: '#0079C1', border: 'rgba(0, 121, 193, 0.15)' };
                  const customFieldsData = train.customFields ? JSON.parse(train.customFields) : {};

                  return (
                    <tr key={train.id} className="training-row">
                      
                      {/* ID correlativo */}
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#004B87', backgroundColor: '#F8FAFC' }}>
                        #{train.indexId}
                      </td>

                      {/* Nombre Participante */}
                      <td>
                        <InlineInput
                          value={train.participant}
                          onSave={(val) => handleUpdateTraining(train.id, { participant: val })}
                          placeholder="Nombre del funcionario..."
                          className="table-cell-input"
                          style={{ fontWeight: 600, color: 'var(--text-primary)' }}
                        />
                      </td>

                      {/* Cargo / Rol */}
                      <td>
                        <InlineInput
                          value={train.role}
                          onSave={(val) => handleUpdateTraining(train.id, { role: val })}
                          placeholder="Ej: Enfermero, Técnico Laboratorio..."
                          className="table-cell-input"
                        />
                      </td>

                      {/* Sede / Clínica */}
                      <td>
                        <select
                           value={train.recintoName}
                           onChange={(e) => handleUpdateTraining(train.id, { recintoName: e.target.value })}
                           className="table-cell-select"
                           style={{ fontWeight: 600 }}
                        >
                          {recintos.map(r => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                          {uniqueRecintosInTrainings.map(name => {
                            if (recintos.some(r => r.name === name)) return null;
                            return <option key={name} value={name}>{name}</option>;
                          })}
                        </select>
                      </td>

                      {/* Módulo / Tema Capacitado */}
                      <td>
                        <InlineInput
                          value={train.moduleTheme}
                          onSave={(val) => handleUpdateTraining(train.id, { moduleTheme: val })}
                          placeholder="Ej: Inducción general, Calibración Avanzada..."
                          className="table-cell-input"
                        />
                      </td>

                      {/* Equipo Relacionado */}
                      <td>
                        <select
                          value={train.equipmentName}
                          onChange={(e) => handleUpdateTraining(train.id, { equipmentName: e.target.value })}
                          className="table-cell-select"
                        >
                          {equipments.map(eq => (
                            <option key={eq.id} value={eq.name}>{eq.name} ({eq.section})</option>
                          ))}
                          {/* Agregar fallback si no hay equipos pre-cargados */}
                          {!equipments.some(e => e.name === train.equipmentName) && train.equipmentName && (
                            <option value={train.equipmentName}>{train.equipmentName}</option>
                          )}
                        </select>
                      </td>

                      {/* Fecha */}
                      <td>
                        <input 
                          type="date" 
                          value={train.fecha} 
                          onChange={(e) => handleUpdateTraining(train.id, { fecha: e.target.value })}
                          className="table-cell-input"
                          style={{ fontSize: '0.78rem', cursor: 'pointer' }}
                        />
                      </td>

                      {/* Instructor / Relator */}
                      <td>
                        <InlineInput
                          value={train.instructor}
                          onSave={(val) => handleUpdateTraining(train.id, { instructor: val })}
                          placeholder="Nombre del relator o especialista..."
                          className="table-cell-input"
                        />
                      </td>

                      {/* Duración (hrs) */}
                      <td>
                        <InlineInput
                          value={String(train.duration)}
                          onSave={(val) => handleUpdateTraining(train.id, { duration: Number(val) || 0 })}
                          placeholder="hrs"
                          className="table-cell-input"
                          style={{ textAlign: 'center', fontWeight: 600 }}
                        />
                      </td>

                      {/* Resultado */}
                      <td style={{ textAlign: 'center' }}>
                        <select
                          value={train.result}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__custom__') {
                              const customVal = prompt("Ingrese resultado de capacitación personalizado:");
                              if (customVal && customVal.trim()) {
                                handleUpdateTraining(train.id, { result: customVal.trim() });
                              }
                            } else {
                              handleUpdateTraining(train.id, { result: val });
                            }
                          }}
                          style={{
                            background: resultColor.bg,
                            color: resultColor.color,
                            border: `1px solid ${resultColor.border}`,
                            borderRadius: '20px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            outline: 'none',
                            cursor: 'pointer',
                            textAlign: 'center',
                            width: '105px',
                            textAlignLast: 'center'
                          }}
                          className="table-cell-select-badge"
                        >
                          <option value="Aprobado">Aprobado</option>
                          <option value="Pendiente">Pendiente</option>
                          <option value="Reprobado">Reprobado</option>
                          {uniqueResults.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          <option value="__custom__">➕ Otro...</option>
                        </select>
                      </td>

                      {/* Observaciones */}
                      <td>
                        <InlineTextarea
                          value={train.observaciones}
                          onSave={(val) => handleUpdateTraining(train.id, { observaciones: val })}
                          placeholder="Anotar detalles de la evaluación, incidencias o material entregado..."
                          className="table-cell-textarea"
                        />
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
                                handleUpdateTraining(train.id, { customFields: JSON.stringify(updatedFields) });
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
                            if (confirm(`¿Está seguro de eliminar el registro de capacitación de ${train.participant || 'este participante'}?`)) {
                              deleteTraining(train.id);
                            }
                          }}
                          className="delete-row-btn"
                          title="Eliminar Capacitación"
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
        .training-header-banner {
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

        .training-header-banner::before {
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

        /* Colores Específicos para KPIs alineados con el Excel */
        .total-trainings {
          background: #E0F2FE; /* Celeste */
          border-color: #BAE6FD;
        }
        .total-trainings .kpi-label { color: #0369A1; }
        .total-trainings .kpi-value { color: #0C4A6E; }

        .approved-trainings {
          background: #D1FAE5; /* Menta/Verde */
          border-color: #A7F3D0;
        }
        .approved-trainings .kpi-label { color: #0F766E; }
        .approved-trainings .kpi-value { color: #115E59; }

        .pending-trainings {
          background: #FEF3C7; /* Amarillo Claro */
          border-color: #FDE68A;
        }
        .pending-trainings .kpi-label { color: #B45309; }
        .pending-trainings .kpi-value { color: #78350F; }

        .covered-recintos {
          background: #EEF2FF; /* Indigo Claro */
          border-color: #E0E7FF;
        }
        .covered-recintos .kpi-label { color: #4F46E5; }
        .covered-recintos .kpi-value { color: #312E81; }

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

        .trainings-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.82rem;
          text-align: left;
          min-width: 1800px;
        }

        .trainings-table th {
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

        .training-row {
          border-bottom: 1px solid var(--border-subtle);
          transition: background-color var(--transition-fast);
        }

        .training-row:hover {
          background-color: #F8FAFC !important;
        }

        .training-row td {
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

        /* Animaciones */
        @keyframes slideIn {
          from {
            transform: translateY(-10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .pulse-icon {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .spin-slow {
          animation: spin 8s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
