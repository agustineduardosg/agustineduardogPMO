"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useEquipmentStore, ClinicalEquipment, Recinto, EquipmentPhaseStatus, Analyte } from '@/store/equipmentStore';
import { useProjectStore } from '@/store/projectStore';
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';
import { Plus, Search, Trash2, Calendar, FileSpreadsheet, Building2, ShieldAlert, CheckCircle2, RefreshCw, Layers, X, UploadCloud, Loader2, Check, Edit2, Sliders, ChevronDown, MessageSquare, Database, Info, Save } from 'lucide-react';
import { format } from 'date-fns';
import { InlineInput, InlineTextarea } from '@/components/InlineInput';
import ReportViewer from '@/components/ReportViewer';
import { EquipmentCommentsModal } from '@/components/EquipmentCommentsModal';
import { parseComments } from '@/utils/commentUtils';
import * as XLSX from 'xlsx';


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

const ANALYTE_STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  'transmitiendo': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  'en pausa': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
  'No iniciado': { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: 'var(--border-light)' },
  'no aplica': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' }
};

const normalizeAnalyteState = (state: string | undefined | null): string => {
  if (!state) return 'No iniciado';
  const trimmed = state.trim();
  const lower = trimmed.toLowerCase();
  
  if (lower.includes('aplica') || lower === 'na' || lower === 'n-a' || lower === 'n/a' || lower.includes('desestimado') || lower.includes('descartado') || lower.includes('excluido')) {
    return 'no aplica';
  }
  if (lower.includes('no transmite') || lower.includes('no transmitiendo') || lower.includes('no iniciado')) {
    return 'No iniciado';
  }
  if (lower.includes('transmitiendo') || lower.includes('transmite') || lower === 'si') {
    return 'transmitiendo';
  }
  if (lower.includes('pausa') || lower.includes('pausado')) {
    return 'en pausa';
  }
  
  return trimmed;
};

const getAnalyteStatusStyle = (value: string) => {
  const normalizedValue = normalizeAnalyteState(value);
  if (ANALYTE_STATUS_STYLE[normalizedValue]) {
    return ANALYTE_STATUS_STYLE[normalizedValue];
  }
  
  // Custom states dynamic style
  const lower = normalizedValue.toLowerCase();
  if (lower.includes('aplica') || lower === 'na' || lower === 'n-a' || lower === 'n/a' || lower.includes('desestimado') || lower.includes('descartado') || lower.includes('excluido')) {
    return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' }; // Excluded custom state (red/pink)
  }
  return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' }; // Active custom state (light blue)
};

const isAnalyteExcluded = (a: any) => {
  if (!a) return false;
  const state = normalizeAnalyteState(a.state);
  return state === 'no aplica';
};

const CustomAnalyteSelect = ({ 
  value, 
  onChange,
  customStatuses = []
}: { 
  value: string; 
  onChange: (val: string) => void;
  customStatuses?: string[];
}) => {
  const normalizedValue = normalizeAnalyteState(value);
  const style = getAnalyteStatusStyle(normalizedValue);

  const defaults = ['No iniciado', 'transmitiendo', 'en pausa', 'no aplica'];
  const isCustom = !defaults.includes(normalizedValue);

  return (
    <select
      value={normalizedValue}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        padding: '6px 10px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        outline: 'none',
        cursor: 'pointer',
        width: '100%',
        maxWidth: '140px',
        textAlign: 'center',
        transition: 'all 0.15s ease'
      }}
    >
      <option value="No iniciado" style={{ background: '#ffffff', color: '#6b7280' }}>⚫ No iniciado</option>
      <option value="transmitiendo" style={{ background: '#ffffff', color: '#10b981' }}>🟢 transmitiendo</option>
      <option value="en pausa" style={{ background: '#ffffff', color: '#f59e0b' }}>🟡 en pausa</option>
      <option value="no aplica" style={{ background: '#ffffff', color: '#ef4444' }}>🔴 no aplica</option>
      {isCustom && (
        <option value={normalizedValue} style={{ background: '#ffffff', color: '#3b82f6' }}>
          🔷 {normalizedValue}
        </option>
      )}
      {customStatuses.map(status => {
        const normStatus = normalizeAnalyteState(status);
        if (defaults.includes(normStatus) || normStatus === normalizedValue) return null;
        return (
          <option key={status} value={status} style={{ background: '#ffffff', color: '#3b82f6' }}>
            🔷 {status}
          </option>
        );
      })}
    </select>
  );
};

const AnalyteModal = ({
  isOpen,
  onClose,
  editingAnalyte,
  recintos,
  analytes,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  editingAnalyte: Analyte | null;
  recintos: Recinto[];
  analytes: Analyte[];
  onSave: (data: any) => Promise<void>;
}) => {
  const [name, setName] = useState(editingAnalyte?.name || '');
  const [instrumentName, setInstrumentName] = useState(editingAnalyte?.instrumentName || '');
  const [transmissionCode, setTransmissionCode] = useState(editingAnalyte?.transmissionCode || '');
  const [testCode, setTestCode] = useState(editingAnalyte?.testCode || '');
  const [section, setSection] = useState(editingAnalyte?.section || '');
  const [description, setDescription] = useState(editingAnalyte?.description || '');
  const [state, setState] = useState(normalizeAnalyteState(editingAnalyte?.state));
  const [recintoId, setRecintoId] = useState(editingAnalyte?.recintoId || '');

  // Buscar instrumentos únicos para autocompletar
  const uniqueInstruments = useMemo(() => {
    const list = new Set<string>();
    analytes.forEach(a => {
      if (a.instrumentName) list.add(a.instrumentName);
    });
    return Array.from(list);
  }, [analytes]);

  // Buscar estados personalizados dinámicos para el dropdown
  const uniqueAnalyteStatuses = useMemo(() => {
    const defaults = ['No iniciado', 'transmitiendo', 'en pausa', 'no aplica'];
    const uniques = new Set<string>();
    analytes.forEach(a => {
      const norm = normalizeAnalyteState(a.state);
      if (norm && !defaults.includes(norm)) {
        uniques.add(norm);
      }
    });
    return Array.from(uniques);
  }, [analytes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("El nombre del analito es obligatorio.");
    if (!transmissionCode.trim()) return alert("El código de transmisión es obligatorio.");
    if (!instrumentName.trim()) return alert("El nombre del instrumento es obligatorio.");

    onSave({
      name: name.trim(),
      instrumentName: instrumentName.trim(),
      transmissionCode: transmissionCode.trim(),
      testCode: testCode.trim(),
      section: section.trim() || 'General',
      description: description.trim(),
      state,
      recintoId: recintoId || null
    });
  };

  return (
    <div className="custom-modal-backdrop">
      <div className="custom-modal-card" style={{ width: '500px', maxWidth: '95vw', animation: 'scaleUp 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{editingAnalyte ? '📝 Editar Analito' : '🔬 Agregar Analito de Laboratorio'}</span>
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%', transition: 'background 0.15s' }} className="btn-light-hover">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Sede Prestadora (Recinto)</label>
              <select
                value={recintoId}
                onChange={e => setRecintoId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="">-- Sin sede (Pendiente) --</option>
                {recintos.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Estado Transmisión</label>
              <select
                value={uniqueAnalyteStatuses.includes(state) ? state : normalizeAnalyteState(state)}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '__custom__') {
                    const customVal = prompt("Ingrese el estado de transmisión personalizado:");
                    if (customVal && customVal.trim()) {
                      setState(customVal.trim());
                    }
                  } else {
                    setState(val);
                  }
                }}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="No iniciado">⚫ No iniciado</option>
                <option value="transmitiendo">🟢 transmitiendo</option>
                <option value="en pausa">🟡 en pausa</option>
                <option value="no aplica">🔴 no aplica</option>
                {uniqueAnalyteStatuses.map(status => (
                  <option key={status} value={status}>
                    {isAnalyteExcluded({ state: status }) ? '🔴' : '🔵'} {status}
                  </option>
                ))}
                <option value="__custom__" style={{ fontWeight: 'bold', color: '#004B87' }}>➕ Otro...</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Nombre Instrumento / Equipo Biomédico *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={instrumentName}
                onChange={e => setInstrumentName(e.target.value)}
                placeholder="Ej. Cobas c501 CLBS"
                list="autocomplete-instruments"
                required
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none' }}
              />
              <datalist id="autocomplete-instruments">
                {uniqueInstruments.map(inst => (
                  <option key={inst} value={inst} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Nombre del Analito *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Colesterol Total"
              required
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Cód. Transmisión LIS *</label>
              <input
                type="text"
                value={transmissionCode}
                onChange={e => setTransmissionCode(e.target.value)}
                placeholder="Ej. CHOL2"
                required
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none', fontFamily: 'monospace', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Cód. Test / Código Analito</label>
              <input
                type="text"
                value={testCode}
                onChange={e => setTestCode(e.target.value)}
                placeholder="Ej. 102030"
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Sección / Lab</label>
              <input
                type="text"
                value={section}
                onChange={e => setSection(e.target.value)}
                placeholder="Ej. Química Clínica"
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Descripción Extensa</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Notas u observaciones de este analito..."
              rows={3}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '14px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'white', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer' }}
              className="btn-light-hover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: 'white', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(124,58,237,0.15)' }}
              className="btn-primary-hover"
            >
              {editingAnalyte ? 'Guardar Cambios' : 'Crear Analito'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default function EquipmentTrackerPage() {
  const recintos = useEquipmentStore(state => state.recintos);
  const equipments = useEquipmentStore(state => state.equipments);
  const addEquipment = useEquipmentStore(state => state.addEquipment);
  const updateEquipment = useEquipmentStore(state => state.updateEquipment);
  const deleteEquipment = useEquipmentStore(state => state.deleteEquipment);
  const restoreEquipment = useEquipmentStore(state => state.restoreEquipment);
  const fetchEquipmentData = useEquipmentStore(state => state.fetchEquipmentData);
  const rawAnalytes = useEquipmentStore(state => state.analytes);
  const fetchAnalytes = useEquipmentStore(state => state.fetchAnalytes);
  const addAnalyte = useEquipmentStore(state => state.addAnalyte);
  const updateAnalyte = useEquipmentStore(state => state.updateAnalyte);
  const deleteAnalyte = useEquipmentStore(state => state.deleteAnalyte);

  // Dynamic scope store integrations
  const releasePhases = useEquipmentStore(state => state.releasePhases);
  const fetchReleasePhases = useEquipmentStore(state => state.fetchReleasePhases);
  const changeScope = useEquipmentStore(state => state.changeScope);
  const fetchScopeLogs = useEquipmentStore(state => state.fetchScopeLogs);
  const createReleasePhase = useEquipmentStore(state => state.createReleasePhase);

  const analytes = useMemo(() => {
    return rawAnalytes.map(a => ({
      ...a,
      state: normalizeAnalyteState(a.state)
    }));
  }, [rawAnalytes]);

  // Dynamic Scope States
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseDesc, setNewPhaseDesc] = useState('');
  const [isJustifyModalOpen, setIsJustifyModalOpen] = useState(false);
  const [scopeChangeParams, setScopeChangeParams] = useState<{
    itemId: string;
    itemType: 'EQUIPMENT' | 'ANALYTE';
    newScope: string | null;
    newScopeStatus: string;
    itemName: string;
    previousScopeName: string;
  } | null>(null);
  const [reasonCode, setReasonCode] = useState('PMO_DECISION');
  const [justification, setJustification] = useState('');
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineItemId, setTimelineItemId] = useState('');
  const [timelineItemName, setTimelineItemName] = useState('');
  const [timelineLogs, setTimelineLogs] = useState<any[]>([]);

  const projects = useProjectStore(state => state.projects);
  const fetchProjects = useProjectStore(state => state.fetchProjects);
  const router = useRouter();

  const users = useUserStore(state => state.users);
  const fetchUsers = useUserStore(state => state.fetchUsers);

  // Soft Delete & Trash Bin State
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [lastDeletedEq, setLastDeletedEq] = useState<ClinicalEquipment | null>(null);
  const undoTimeoutRef = React.useRef<any>(null);

  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [deletedEquipments, setDeletedEquipments] = useState<ClinicalEquipment[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);

  const fetchDeletedEquipments = async () => {
    setLoadingTrash(true);
    try {
      const resp = await fetch('/api/equipments?deleted=true');
      if (resp.ok) {
        const data = await resp.json();
        setDeletedEquipments(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTrash(false);
    }
  };

  const fetchDeletedCount = async () => {
    try {
      const resp = await fetch('/api/equipments?deleted=true');
      if (resp.ok) {
        const data = await resp.json();
        setDeletedCount(data.length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDeletedCount();
  }, [equipments]);

  const handleDeleteClick = async (eq: ClinicalEquipment) => {
    if (confirm(`¿Está seguro de eliminar el equipo "${eq.name}"?`)) {
      setLastDeletedEq(eq);
      setShowUndoToast(true);
      await deleteEquipment(eq.id);

      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndoToast(false);
        setLastDeletedEq(null);
      }, 6000);
    }
  };

  const handleUndo = async () => {
    if (lastDeletedEq) {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      await restoreEquipment(lastDeletedEq.id);
      setShowUndoToast(false);
      setLastDeletedEq(null);
    }
  };

  
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
    fetchAnalytes();
    fetchReleasePhases();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'analytes') {
        setCurrentTab('analytes');
      }
    }

    // Sincronización proactiva multidispositivo (Sondeo activo cada 15 segundos si la pestaña está activa)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchEquipmentData();
        fetchProjects();
        fetchUsers();
        fetchAnalytes();
        fetchReleasePhases();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'clinical' | 'non-clinical'>('all');
  
  // Estados para Matriz de Analitos
  const [currentTab, setCurrentTab] = useState<'tracking' | 'analytes'>('tracking');
  const [hiddenAnalyteCols, setHiddenAnalyteCols] = useState<string[]>([]);
  const [analyteSearch, setAnalyteSearch] = useState('');
  const [collapsedRecintoAnalytes, setCollapsedRecintoAnalytes] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedInstruments, setExpandedInstruments] = useState<Record<string, boolean>>({});
  const [collapsedInstruments, setCollapsedInstruments] = useState<Record<string, boolean>>({});
  const [isAnalyteModalOpen, setIsAnalyteModalOpen] = useState(false);
  const [editingAnalyte, setEditingAnalyte] = useState<Analyte | null>(null);

  // Backup & Integrity Management States
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState<{
    current: { recintos: number; equipments: number; analytes: number };
    backups: { filename: string; name: string; sizeBytes: number; createdAt: string }[];
  } | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const fetchDatabaseStatus = async () => {
    try {
      const response = await fetch('/api/admin/database');
      if (response.ok) {
        const data = await response.json();
        setDatabaseStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const response = await fetch('/api/admin/database', { method: 'POST' });
      if (response.ok) {
        alert("¡Copia de seguridad creada correctamente!");
        fetchDatabaseStatus();
      } else {
        alert("Error al crear la copia de seguridad.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!confirm("⚠️ ¡ADVERTENCIA CRÍTICA! Restaurar una copia de seguridad reemplazará por completo la base de datos actual con la del archivo seleccionado. Todos los cambios realizados desde entonces se perderán.\n\n¿Estás seguro de que deseas proceder?")) {
      return;
    }
    if (!confirm("Confirmación final: ¿Realmente deseas restaurar? Se recargarán todos los datos del sistema.")) {
      return;
    }

    try {
      const response = await fetch('/api/admin/database', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      if (response.ok) {
        alert("¡Base de datos restaurada correctamente! Recargando aplicación...");
        window.location.reload();
      } else {
        alert("Error al restaurar la copia de seguridad.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión.");
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta copia de seguridad? Esta acción no se puede deshacer.")) return;
    try {
      const response = await fetch(`/api/admin/database?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchDatabaseStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Buscar estados personalizados dinámicos para el dropdown y filtros
  const uniqueAnalyteStatuses = useMemo(() => {
    const defaults = ['No iniciado', 'transmitiendo', 'en pausa', 'no aplica'];
    const uniques = new Set<string>();
    analytes.forEach(a => {
      const norm = normalizeAnalyteState(a.state);
      if (norm && !defaults.includes(norm)) {
        uniques.add(norm);
      }
    });
    return Array.from(uniques);
  }, [analytes]);



  // Estado para columnas dinámicas
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [newColName, setNewColName] = useState('');
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [editingColIndex, setEditingColIndex] = useState<number | null>(null);
  const [editingColName, setEditingColName] = useState('');

  // Estado para columnas dinámicas de Analitos
  const [customColumnsAnalytes, setCustomColumnsAnalytes] = useState<string[]>([]);
  const [newColNameAnalyte, setNewColNameAnalyte] = useState('');
  const [editingColIndexAnalyte, setEditingColIndexAnalyte] = useState<number | null>(null);
  const [editingColNameAnalyte, setEditingColNameAnalyte] = useState('');

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
    const savedHiddenAnalytes = localStorage.getItem('hidden_cols_analytes');
    if (savedHiddenAnalytes) {
      try {
        setHiddenAnalyteCols(JSON.parse(savedHiddenAnalytes));
      } catch (e) {
        console.error('Error loading hidden analyte columns', e);
      }
    }
    const savedAnalytes = localStorage.getItem('custom_cols_analytes');
    if (savedAnalytes) {
      try {
        setCustomColumnsAnalytes(JSON.parse(savedAnalytes));
      } catch (e) {
        console.error('Error loading custom analyte columns', e);
      }
    }
  }, []);

  const saveCustomColumnsAnalytes = (cols: string[]) => {
    setCustomColumnsAnalytes(cols);
    localStorage.setItem('custom_cols_analytes', JSON.stringify(cols));
  };

  const saveHiddenAnalyteCols = (cols: string[]) => {
    setHiddenAnalyteCols(cols);
    localStorage.setItem('hidden_cols_analytes', JSON.stringify(cols));
  };

  const saveDefaultColNames = (names: Record<string, string>) => {
    setDefaultColNames(names);
    localStorage.setItem('default_cols_names_equipments', JSON.stringify(names));
  };

  const saveHiddenDefaultCols = (cols: string[]) => {
    setHiddenDefaultCols(cols);
    localStorage.setItem('hidden_cols_equipments', JSON.stringify(cols));
  };

  // Auto-descubrimiento y sincronización de columnas desde la base de datos para analitos
  React.useEffect(() => {
    if (analytes && analytes.length > 0) {
      const dbKeys = new Set<string>();
      analytes.forEach(a => {
        if (a.customFields) {
          try {
            const parsed = JSON.parse(a.customFields);
            Object.keys(parsed).forEach(k => {
              if (k.trim()) dbKeys.add(k.trim());
            });
          } catch (e) {
            console.error('Error parsing customFields for analyte ' + a.id, e);
          }
        }
      });

      // Combinar las columnas descubiertas con las existentes
      let updated = [...customColumnsAnalytes];
      let changed = false;
      dbKeys.forEach(key => {
        if (!updated.includes(key)) {
          updated.push(key);
          changed = true;
        }
      });

      if (changed) {
        setCustomColumnsAnalytes(updated);
        localStorage.setItem('custom_cols_analytes', JSON.stringify(updated));
      }
    }
  }, [analytes]);

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

  const handleAddColumnAnalyte = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newColNameAnalyte.trim();
    if (!cleanName) return;
    if (customColumnsAnalytes.includes(cleanName)) {
      alert('Ya existe una columna con ese nombre.');
      return;
    }
    const updated = [...customColumnsAnalytes, cleanName];
    saveCustomColumnsAnalytes(updated);
    setNewColNameAnalyte('');
  };

  const handleDeleteColumnAnalyte = (colName: string) => {
    if (confirm(`¿Está seguro de eliminar la columna "${colName}"? Se borrarán sus datos asociados.`)) {
      const updated = customColumnsAnalytes.filter(c => c !== colName);
      saveCustomColumnsAnalytes(updated);
      
      // Limpiar los datos de los analitos asociados a esa columna
      analytes.forEach(a => {
        const customFields = a.customFields ? JSON.parse(a.customFields) : {};
        if (customFields[colName] !== undefined) {
          delete customFields[colName];
          useEquipmentStore.getState().updateAnalyte(a.id, { customFields: JSON.stringify(customFields) });
        }
      });
      if (editingColIndexAnalyte !== null) setEditingColIndexAnalyte(null);
    }
  };

  const handleRenameColumnDirectAnalyte = (oldName: string, newName: string) => {
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const cleanName = newName.trim();
    if (customColumnsAnalytes.includes(cleanName) && cleanName !== oldName) {
      alert('Ya existe una columna con ese nombre.');
      return;
    }
    
    // 1. Renombrar en el array customColumnsAnalytes
    const updated = customColumnsAnalytes.map(c => c === oldName ? cleanName : c);
    saveCustomColumnsAnalytes(updated);
    
    // 2. Renombrar la llave en el JSON customFields de cada analito
    analytes.forEach(a => {
      if (a.customFields) {
        try {
          const fields = JSON.parse(a.customFields);
          if (fields[oldName] !== undefined) {
            fields[cleanName] = fields[oldName];
            delete fields[oldName];
            useEquipmentStore.getState().updateAnalyte(a.id, { customFields: JSON.stringify(fields) });
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
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

      let matchScope = true;
      if (scopeFilter === 'OUT_OF_SCOPE') {
        matchScope = eq.scopeStatus === 'OUT_OF_SCOPE';
      } else if (scopeFilter !== 'all') {
        matchScope = eq.releasePhaseId === scopeFilter && eq.scopeStatus !== 'OUT_OF_SCOPE';
      }

      return matchSearch && matchProject && matchScope;
    });
  }, [equipments, search, filterProject, scopeFilter]);

  const filteredAnalytes = useMemo(() => {
    return analytes.filter(a => {
      const recintoName = recintos.find(r => r.id === a.recintoId)?.name || 'Sede sin Asignar';
      
      const matchSearch = 
        a.name.toLowerCase().includes(analyteSearch.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(analyteSearch.toLowerCase()) ||
        a.transmissionCode.toLowerCase().includes(analyteSearch.toLowerCase()) ||
        a.testCode.toLowerCase().includes(analyteSearch.toLowerCase()) ||
        a.section.toLowerCase().includes(analyteSearch.toLowerCase()) ||
        a.instrumentName.toLowerCase().includes(analyteSearch.toLowerCase()) ||
        recintoName.toLowerCase().includes(analyteSearch.toLowerCase());
      
      const normState = normalizeAnalyteState(a.state);
      const matchStatus = 
        statusFilter === 'all' ||
        normState.toLowerCase() === statusFilter.toLowerCase();

      // Resolve parent equipment scope status and phase
      const parentEq = equipments.find(eq => eq.id === a.equipmentId);
      const effectiveStatus = a.scopeStatus === 'INHERITED'
        ? (parentEq ? parentEq.scopeStatus : 'ACTIVE')
        : a.scopeStatus;
      
      const effectivePhaseId = a.scopeStatus === 'INHERITED'
        ? (parentEq ? parentEq.releasePhaseId : null)
        : a.releasePhaseId;

      let matchScope = true;
      if (scopeFilter === 'OUT_OF_SCOPE') {
        matchScope = effectiveStatus === 'OUT_OF_SCOPE';
      } else if (scopeFilter !== 'all') {
        matchScope = effectivePhaseId === scopeFilter && effectiveStatus !== 'OUT_OF_SCOPE';
      }
      
      return matchSearch && matchStatus && matchScope;
    });
  }, [analytes, analyteSearch, recintos, statusFilter, scopeFilter, equipments]);

  const scopeFilteredEquipments = useMemo(() => {
    return equipments.filter(eq => {
      if (scopeFilter === 'all') return true;
      if (scopeFilter === 'OUT_OF_SCOPE') return eq.scopeStatus === 'OUT_OF_SCOPE';
      return eq.releasePhaseId === scopeFilter && eq.scopeStatus !== 'OUT_OF_SCOPE';
    });
  }, [equipments, scopeFilter]);

  const scopeFilteredAnalytes = useMemo(() => {
    return analytes.filter(a => {
      const parentEq = equipments.find(eq => eq.id === a.equipmentId);
      const effectiveStatus = a.scopeStatus === 'INHERITED'
        ? (parentEq ? parentEq.scopeStatus : 'ACTIVE')
        : a.scopeStatus;
      
      const effectivePhaseId = a.scopeStatus === 'INHERITED'
        ? (parentEq ? parentEq.releasePhaseId : null)
        : a.releasePhaseId;

      if (scopeFilter === 'all') return true;
      if (scopeFilter === 'OUT_OF_SCOPE') return effectiveStatus === 'OUT_OF_SCOPE';
      return effectivePhaseId === scopeFilter && effectiveStatus !== 'OUT_OF_SCOPE';
    });
  }, [analytes, equipments, scopeFilter]);

  const exportAnalytesToExcel = () => {
    if (filteredAnalytes.length === 0) {
      alert("No hay analitos en la lista para exportar.");
      return;
    }

    const wb = XLSX.utils.book_new();

    // Headers base
    const headers = [
      "Sede Clínica",
      "Código Sede",
      "Nombre Instrumento / Equipo",
      "Nombre del Analito",
      "Código de Transmisión LIS",
      "Código de Test / Código Analito",
      "Sección / Laboratorio",
      "Estado de Transmisión",
      "Descripción / Observaciones"
    ];

    // Añadir columnas dinámicas registradas en la matriz de analitos
    customColumnsAnalytes.forEach(col => {
      headers.push(col);
    });

    const rows = [headers];

    filteredAnalytes.forEach(a => {
      const recinto = recintos.find(r => r.id === a.recintoId);
      
      // Parsear campos personalizados dinámicos
      let customFieldsData: Record<string, string> = {};
      if (a.customFields) {
        try {
          customFieldsData = JSON.parse(a.customFields);
        } catch (e) {
          console.error('Error parsing custom fields for analyte:', e);
        }
      }

      // Fila base
      const rowData = [
        recinto?.name || "Sin Sede (Pendiente)",
        recinto?.code || "N/A",
        a.instrumentName || "Sin Instrumento",
        a.name,
        a.transmissionCode,
        a.testCode || "",
        a.section || "General",
        a.state || "No Iniciado",
        a.description || ""
      ];

      // Rellenar valores de columnas dinámicas
      customColumnsAnalytes.forEach(col => {
        rowData.push(customFieldsData[col] || "");
      });

      rows.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Ajustar el ancho de las columnas de forma automática y prolija
    const wscols = headers.map(h => ({ wch: Math.max(h.length + 4, 15) }));
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Matriz de Analitos");

    // Guardar archivo
    XLSX.writeFile(wb, `Matriz_Analitos_Laboratorio_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

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
    const total = filteredEquipments.length;
    if (total === 0) return { completion: 0, completedCount: 0, progressCount: 0 };
    
    let totalActivePhases = 0;
    let weightedCompletionSum = 0;
    let progressCount = 0;
    let completedCount = 0;
    
    filteredEquipments.forEach(eq => {
      const phasesList = [
        { key: 'levantamiento', val: eq.levantamiento },
        { key: 'parametrizacion', val: eq.parametrizacion },
        { key: 'pruebas', val: eq.pruebas },
        { key: 'capacitacion', val: eq.capacitacion },
        { key: 'validacion', val: eq.validacion },
        { key: 'golive', val: eq.golive }
      ];

      phasesList.forEach(ph => {
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
  }, [filteredEquipments]);

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
      scopeStatus: 'ACTIVE',
      releasePhaseId: null,
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
              fetchDeletedEquipments();
              setIsTrashOpen(true);
            }}
            style={{ 
              background: 'transparent', 
              color: '#ef4444', 
              border: '1px solid #ef4444', 
              padding: '10px 18px', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <Trash2 size={16} />
            Papelera
            {deletedCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: '#ef4444',
                color: 'white',
                fontSize: '0.72rem',
                fontWeight: 'bold',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {deletedCount}
              </span>
            )}
          </button>
          <button 
            className="btn btn-secondary shadow-sm"
            onClick={() => {
              setIsAddingCol(true);
              if (currentTab === 'analytes') {
                setEditingColIndexAnalyte(null);
              } else {
                setEditingColIndex(null);
              }
            }}
            style={{ 
              background: currentTab === 'analytes' ? '#7c3aed' : '#004B87', 
              color: '#FFFFFF', 
              border: 'none', 
              padding: '10px 18px', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
          >
            <Sliders size={16} strokeWidth={2} />
            {currentTab === 'analytes' ? 'Administrar Columnas de Analitos' : 'Administrar Columnas'}
          </button>
        </div>
      </div>

      {/* Dynamic Tab Switcher */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '6px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        alignSelf: 'flex-start',
        marginBottom: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        <button
          onClick={() => setCurrentTab('tracking')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: currentTab === 'tracking' ? '#004B87' : 'transparent',
            color: currentTab === 'tracking' ? '#FFFFFF' : 'var(--text-secondary)',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Layers size={16} />
          <span>Seguimiento Clínico (Fases)</span>
          <span style={{
            fontSize: '0.72rem',
            background: currentTab === 'tracking' ? 'rgba(255,255,255,0.22)' : 'rgba(0, 75, 135, 0.08)',
            color: currentTab === 'tracking' ? '#FFFFFF' : '#004B87',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 'bold',
            marginLeft: '4px',
            transition: 'all 0.2s ease'
          }}>
            {filteredEquipments.length}
          </span>
        </button>
        <button
          onClick={() => setCurrentTab('analytes')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: currentTab === 'analytes' ? '#7c3aed' : 'transparent',
            color: currentTab === 'analytes' ? '#FFFFFF' : 'var(--text-secondary)',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Building2 size={16} />
          <span>Matriz de Analitos de Laboratorio</span>
          <span style={{
            fontSize: '0.72rem',
            background: currentTab === 'analytes' ? 'rgba(255,255,255,0.22)' : 'rgba(124, 58, 237, 0.08)',
            color: currentTab === 'analytes' ? '#FFFFFF' : '#7c3aed',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 'bold',
            marginLeft: '4px',
            transition: 'all 0.2s ease'
          }}>
            {filteredAnalytes.length}
          </span>
        </button>
      </div>

      {/* Selector de Foco Ejecutivo de Alcance */}
      <div className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        marginBottom: '20px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-light)',
        borderRadius: '12px',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={16} style={{ color: currentTab === 'analytes' ? '#7c3aed' : '#004B87' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Foco Ejecutivo (Alcance):
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setScopeFilter('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: scopeFilter === 'all' ? (currentTab === 'analytes' ? '#7c3aed' : '#004B87') : 'var(--bg-primary)',
              color: scopeFilter === 'all' ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${scopeFilter === 'all' ? (currentTab === 'analytes' ? '#7c3aed' : '#004B87') : 'var(--border-light)'}`
            }}
          >
            🌐 Todo (Consolidado)
          </button>
          
          {releasePhases.map(phase => {
            const isActive = scopeFilter === phase.id;
            return (
              <button
                key={phase.id}
                onClick={() => setScopeFilter(phase.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: isActive ? '#2563eb' : 'var(--bg-primary)',
                  color: isActive ? 'white' : '#2563eb',
                  border: `1px solid ${isActive ? '#2563eb' : 'rgba(59, 130, 246, 0.2)'}`
                }}
              >
                📅 {phase.name}
              </button>
            );
          })}
          
          <button
            onClick={() => setScopeFilter('OUT_OF_SCOPE')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: scopeFilter === 'OUT_OF_SCOPE' ? '#4b5563' : 'var(--bg-primary)',
              color: scopeFilter === 'OUT_OF_SCOPE' ? 'white' : '#4b5563',
              border: `1px solid ${scopeFilter === 'OUT_OF_SCOPE' ? '#4b5563' : 'rgba(107, 114, 128, 0.2)'}`
            }}
          >
            ⚙️ Fuera de Alcance
          </button>
        </div>

        {/* Botón para Configurar Fases PMO */}
        <button
          onClick={() => setIsPhaseModalOpen(true)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'var(--bg-primary)',
            border: '1px dashed var(--border-light)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          className="btn-light-hover"
        >
          ➕ Configurar Fases
        </button>
      </div>

      {/* Modal de Administración de Columnas */}
      {isAddingCol && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card" style={{ width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: currentTab === 'analytes' ? '#7c3aed' : '#003B64', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} />
                {currentTab === 'analytes' ? 'Administrar Columnas de Analitos' : 'Administrar Columnas'}
              </h3>
              <button onClick={() => setIsAddingCol(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {currentTab === 'analytes' ? (
              /* SECCIÓN COLUMNAS DE ANALITOS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', display: 'block' }}>
                    Columnas de la Matriz de Analitos (Predeterminadas)
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {[
                      { key: 'transmissionCode', name: 'Código de Transmisión' },
                      { key: 'testCode', name: 'Código de Test / Código Analito' },
                      { key: 'description', name: 'Descripción Extensa' },
                      { key: 'section', name: 'Sección / Laboratorio' },
                      { key: 'state', name: 'Estado de Transmisión' }
                    ].map(({ key, name }) => {
                      const isHidden = hiddenAnalyteCols.includes(key);
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isHidden ? 'var(--bg-tertiary)' : 'var(--bg-primary)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)', opacity: isHidden ? 0.6 : 1 }}>
                          <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textDecoration: isHidden ? 'line-through' : 'none' }}>
                            {name} {isHidden && <span style={{ fontSize: '0.7rem', color: 'red', fontWeight: 'normal' }}>(Oculta)</span>}
                          </span>
                          {isHidden ? (
                            <button 
                              type="button"
                              onClick={() => {
                                const updated = hiddenAnalyteCols.filter(c => c !== key);
                                saveHiddenAnalyteCols(updated);
                              }}
                              className="btn"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Mostrar
                            </button>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => {
                                const updated = [...hiddenAnalyteCols, key];
                                saveHiddenAnalyteCols(updated);
                              }}
                              className="btn"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Ocultar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* COLUMNAS PERSONALIZADAS DE ANALITOS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', paddingBottom: '6px', display: 'block' }}>
                    Columnas Personalizadas de Analitos (Creadas por el Usuario)
                  </span>

                  {/* Formulario Agregar Columna */}
                  <form onSubmit={handleAddColumnAnalyte} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '8px', marginBottom: '12px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>+ Crear Columna Nueva</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        placeholder="Ej. Código de Barras, Reactivo..." 
                        value={newColNameAnalyte} 
                        onChange={e => setNewColNameAnalyte(e.target.value)}
                        className="cell-input"
                        style={{ flex: 1, padding: '8px', border: '1px solid var(--border-light)', borderRadius: '6px', outline: 'none', background: 'white', fontSize: '0.85rem' }}
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', background: '#7c3aed', color: 'white', border: 'none', fontSize: '0.82rem' }}>Crear</button>
                    </div>
                  </form>

                  {/* Listado de Columnas Existentes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>Columnas Activas ({customColumnsAnalytes.length})</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                      {customColumnsAnalytes.length === 0 ? (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No hay columnas personalizadas activas.</div>
                      ) : (
                        customColumnsAnalytes.map((col, idx) => (
                          <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                            {editingColIndexAnalyte === idx ? (
                              <>
                                <input 
                                  type="text" 
                                  value={editingColNameAnalyte}
                                  onChange={e => setEditingColNameAnalyte(e.target.value)}
                                  className="cell-input"
                                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.82rem', border: '1px solid var(--accent-primary)', borderRadius: '4px', background: 'white', outline: 'none' }}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleRenameColumnDirectAnalyte(col, editingColNameAnalyte);
                                      setEditingColIndexAnalyte(null);
                                    }
                                  }}
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    handleRenameColumnDirectAnalyte(col, editingColNameAnalyte);
                                    setEditingColIndexAnalyte(null);
                                  }}
                                  style={{ border: 'none', background: 'transparent', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                  title="Guardar nombre"
                                >
                                  <Check size={16} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setEditingColIndexAnalyte(null)}
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
                                    setEditingColIndexAnalyte(idx);
                                    setEditingColNameAnalyte(col);
                                  }}
                                  style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                  title="Renombrar columna"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteColumnAnalyte(col)}
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
              </div>
            ) : (
              <>
              /* 1. SECCIÓN COLUMNAS PREDETERMINADAS DEL SISTEMA */
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
            </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button type="button" onClick={() => setIsAddingCol(false)} className="btn btn-secondary" style={{ padding: '8px 16px', background: currentTab === 'analytes' ? '#7c3aed' : '#004B87', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Listo</button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SEGUIMIENTO CLINICO (FASES) */}
      <div style={{ 
        display: currentTab === 'tracking' ? 'flex' : 'none', 
        flexDirection: 'column', 
        gap: '24px', 
        animation: currentTab === 'tracking' ? 'fadeIn 0.28s cubic-bezier(0.4, 0, 0.2, 1)' : 'none' 
      }}>
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
                  <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.22)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', marginLeft: '4px' }}>
                    {recintoEquips.length} {recintoEquips.length === 1 ? 'Equipo' : 'Equipos'}
                  </span>
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
                  maxHeight: isCollapsed ? '0px' : 'none', 
                  opacity: isCollapsed ? 0 : 1,
                  overflow: isCollapsed ? 'hidden' : 'visible',
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
                      <th style={{ padding: '12px 12px', width: '180px' }}>Fase de Lanzamiento</th>
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
                        <td colSpan={16 - hiddenDefaultCols.length + customColumns.length} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
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

                             {/* Fase de Lanzamiento */}
                             <td style={{ padding: '8px 12px' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                 <select
                                   value={eq.scopeStatus === 'OUT_OF_SCOPE' ? 'OUT_OF_SCOPE' : (eq.releasePhaseId || '')}
                                   onChange={(e) => {
                                     const val = e.target.value;
                                     let newScopeStatus = 'ACTIVE';
                                     let newScopeId: string | null = null;
                                     
                                     if (val === 'OUT_OF_SCOPE') {
                                       newScopeStatus = 'OUT_OF_SCOPE';
                                     } else if (val) {
                                       newScopeStatus = 'ACTIVE';
                                       newScopeId = val;
                                     } else {
                                       newScopeStatus = 'ACTIVE';
                                     }
                                     
                                     (globalThis as any).initiateScopeChange(
                                       eq.id, 
                                       'EQUIPMENT', 
                                       newScopeId, 
                                       newScopeStatus, 
                                       eq.name, 
                                       eq.releasePhaseId
                                     );
                                   }}
                                   style={{
                                     width: '100%',
                                     padding: '6px',
                                     background: 'transparent',
                                     border: '1px solid transparent',
                                     borderRadius: '4px',
                                     outline: 'none',
                                     color: eq.scopeStatus === 'OUT_OF_SCOPE' ? '#6b7280' : '#2563eb',
                                     fontWeight: 'bold',
                                     fontSize: '0.8rem',
                                     cursor: 'pointer'
                                   }}
                                   className="cell-input"
                                 >
                                   <option value="">-- Sin Asignar --</option>
                                   {releasePhases.map(phase => (
                                     <option key={phase.id} value={phase.id}>📅 {phase.name}</option>
                                   ))}
                                   <option value="OUT_OF_SCOPE">⚙️ Fuera de Alcance</option>
                                 </select>
                                 
                                 <button
                                   onClick={() => (globalThis as any).showItemTimeline(eq.id, eq.name)}
                                   style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: '2px', display: 'flex', alignItems: 'center' }}
                                   title="Ver historial de cambios de alcance"
                                 >
                                   <Database size={13} />
                                 </button>
                               </div>
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
                            {/* Eliminar fila */}
                            <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                              <button 
                                onClick={() => handleDeleteClick(eq)} 
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
      </div>

{/* TAB CONTENT: MATRIZ DE ANALITOS DE LABORATORIO */}
      <div style={{ 
        display: currentTab === 'analytes' ? 'flex' : 'none', 
        flexDirection: 'column', 
        gap: '20px', 
        animation: currentTab === 'analytes' ? 'fadeIn 0.28s cubic-bezier(0.4, 0, 0.2, 1)' : 'none' 
      }}>
          
          {/* Analyte Tab Specific KPI Panel */}
          {(() => {
            const totalUniverseCount = scopeFilteredAnalytes.length;
            const noAplicaAllCount = scopeFilteredAnalytes.filter(a => normalizeAnalyteState(a.state) === 'no aplica').length;
            const trueApplicableCount = totalUniverseCount - noAplicaAllCount;
            
            const activeAllCount = scopeFilteredAnalytes.filter(a => normalizeAnalyteState(a.state) === 'transmitiendo').length;
            const pausedAllCount = scopeFilteredAnalytes.filter(a => normalizeAnalyteState(a.state) === 'en pausa').length;
            const pendingAllCount = scopeFilteredAnalytes.filter(a => {
              const state = normalizeAnalyteState(a.state);
              return state === 'No iniciado' || !state;
            }).length;
            
            const hasApplicable = trueApplicableCount > 0;
            const globalPct = hasApplicable ? (activeAllCount / trueApplicableCount) * 100 : 0;
            const globalPctFormatted = hasApplicable ? `${globalPct.toFixed(1)}%` : 'N/A';

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', flexShrink: 0 }}>
                    <Database size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{totalUniverseCount}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Universo de Analitos</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Aplicables: {trueApplicableCount} | No Aplica: {noAplicaAllCount}
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      {globalPctFormatted}
                      {hasApplicable && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                          ({activeAllCount}/{trueApplicableCount})
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Avance Consolidado</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Cálculo sobre analitos aplicables
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0 }}>
                    <RefreshCw size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{pausedAllCount}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Transmisión en Pausa</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(107, 114, 128, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', flexShrink: 0 }}>
                    <Layers size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{pendingAllCount}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Pendientes de Iniciar</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Dashboard de Fases LIS */}
          <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 Desglose de Avance Real por Fase de Lanzamiento
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {releasePhases.map(phase => {
                const phaseAnalytes = analytes.filter(a => {
                  const parentEq = equipments.find(eq => eq.id === a.equipmentId);
                  const effectiveStatus = a.scopeStatus === 'INHERITED'
                    ? (parentEq ? parentEq.scopeStatus : 'ACTIVE')
                    : a.scopeStatus;
                  if (effectiveStatus === 'OUT_OF_SCOPE') return false;
                  
                  const effectivePhaseId = a.scopeStatus === 'INHERITED'
                    ? (parentEq ? parentEq.releasePhaseId : null)
                    : a.releasePhaseId;
                  
                  return effectivePhaseId === phase.id;
                });

                const total = phaseAnalytes.length;
                const noAplica = phaseAnalytes.filter(a => normalizeAnalyteState(a.state) === 'no aplica').length;
                const applicable = total - noAplica;
                const active = phaseAnalytes.filter(a => normalizeAnalyteState(a.state) === 'transmitiendo').length;
                
                const hasApplicable = applicable > 0;
                const pct = hasApplicable ? (active / applicable) * 100 : 0;
                
                return (
                  <div key={phase.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        📅 {phase.name}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: hasApplicable ? '#10b981' : 'var(--text-muted)' }}>
                        {hasApplicable ? `${pct.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    
                    <div style={{ height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${hasApplicable ? pct : 0}%`, height: '100%', background: hasApplicable ? '#10b981' : '#6b7280', borderRadius: '3px' }} />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      <span>Transmitiendo: <strong>{active}</strong></span>
                      <span>Aplicables: <strong>{applicable}</strong> <span style={{ opacity: 0.6 }}>(Total: {total})</span></span>
                    </div>
                  </div>
                );
              })}

              {/* Sin Asignar */}
              {(() => {
                const unassignedAnalytes = analytes.filter(a => {
                  const parentEq = equipments.find(eq => eq.id === a.equipmentId);
                  const effectiveStatus = a.scopeStatus === 'INHERITED'
                    ? (parentEq ? parentEq.scopeStatus : 'ACTIVE')
                    : a.scopeStatus;
                  if (effectiveStatus === 'OUT_OF_SCOPE') return false;
                  
                  const effectivePhaseId = a.scopeStatus === 'INHERITED'
                    ? (parentEq ? parentEq.releasePhaseId : null)
                    : a.releasePhaseId;
                  
                  return !effectivePhaseId;
                });

                const total = unassignedAnalytes.length;
                const noAplica = unassignedAnalytes.filter(a => normalizeAnalyteState(a.state) === 'no aplica').length;
                const applicable = total - noAplica;
                const active = unassignedAnalytes.filter(a => normalizeAnalyteState(a.state) === 'transmitiendo').length;
                const hasApplicable = applicable > 0;
                const pct = hasApplicable ? (active / applicable) * 100 : 0;

                return (
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        ❓ Sin Asignar a Fase
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: hasApplicable ? '#10b981' : 'var(--text-muted)' }}>
                        {hasApplicable ? `${pct.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    
                    <div style={{ height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${hasApplicable ? pct : 0}%`, height: '100%', background: hasApplicable ? '#3b82f6' : '#6b7280', borderRadius: '3px' }} />
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      <span>Transmitiendo: <strong>{active}</strong></span>
                      <span>Aplicables: <strong>{applicable}</strong> <span style={{ opacity: 0.6 }}>(Total: {total})</span></span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Controles y Filtros de la Matriz de Analitos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            
            {/* Fila 1: Píldoras de estado & Acordeones colectivos */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              
              {/* Píldoras de Estado */}
              {(() => {
                const totalCount = scopeFilteredAnalytes.length;
                const activeCount = scopeFilteredAnalytes.filter(a => normalizeAnalyteState(a.state) === 'transmitiendo').length;
                const pausedCount = scopeFilteredAnalytes.filter(a => normalizeAnalyteState(a.state) === 'en pausa').length;
                const pendingCount = scopeFilteredAnalytes.filter(a => normalizeAnalyteState(a.state) === 'No iniciado').length;
                const noAplicaCount = scopeFilteredAnalytes.filter(a => normalizeAnalyteState(a.state) === 'no aplica').length;

                return (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: statusFilter === 'all' ? '#7c3aed' : 'var(--bg-primary)',
                        color: statusFilter === 'all' ? 'white' : 'var(--text-secondary)',
                        border: `1px solid ${statusFilter === 'all' ? '#7c3aed' : 'var(--border-light)'}`,
                        boxShadow: statusFilter === 'all' ? '0 2px 8px rgba(124, 58, 237, 0.2)' : 'none'
                      }}
                    >
                      🌐 Todos ({totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('transmitiendo')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: statusFilter === 'transmitiendo' ? '#10b981' : 'rgba(16, 185, 129, 0.05)',
                        color: statusFilter === 'transmitiendo' ? 'white' : '#10b981',
                        border: `1px solid ${statusFilter === 'transmitiendo' ? '#10b981' : 'rgba(16, 185, 129, 0.2)'}`,
                        boxShadow: statusFilter === 'transmitiendo' ? '0 2px 8px rgba(16, 185, 129, 0.2)' : 'none'
                      }}
                    >
                      🟢 transmitiendo ({activeCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('en pausa')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: statusFilter === 'en pausa' ? '#f59e0b' : 'rgba(245, 158, 11, 0.05)',
                        color: statusFilter === 'en pausa' ? 'white' : '#f59e0b',
                        border: `1px solid ${statusFilter === 'en pausa' ? '#f59e0b' : 'rgba(245, 158, 11, 0.2)'}`,
                        boxShadow: statusFilter === 'en pausa' ? '0 2px 8px rgba(245, 158, 11, 0.2)' : 'none'
                      }}
                    >
                      🟡 en pausa ({pausedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('No iniciado')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: statusFilter === 'No iniciado' ? '#6b7280' : 'var(--bg-primary)',
                        color: statusFilter === 'No iniciado' ? 'white' : 'var(--text-secondary)',
                        border: `1px solid ${statusFilter === 'No iniciado' ? '#6b7280' : 'var(--border-light)'}`,
                        boxShadow: statusFilter === 'No iniciado' ? '0 2px 8px rgba(107, 114, 128, 0.2)' : 'none'
                      }}
                    >
                      ⚫ No iniciado ({pendingCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('no aplica')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: statusFilter === 'no aplica' ? '#ef4444' : 'rgba(239, 68, 68, 0.05)',
                        color: statusFilter === 'no aplica' ? 'white' : '#ef4444',
                        border: `1px solid ${statusFilter === 'no aplica' ? '#ef4444' : 'rgba(239, 68, 68, 0.2)'}`,
                        boxShadow: statusFilter === 'no aplica' ? '0 2px 8px rgba(239, 68, 68, 0.2)' : 'none'
                      }}
                    >
                      🔴 no aplica ({noAplicaCount})
                    </button>
                    {uniqueAnalyteStatuses.map(status => {
                      const count = analytes.filter(a => normalizeAnalyteState(a.state) === status).length;
                      const style = getAnalyteStatusStyle(status);
                      const isActive = statusFilter === status;
                      const icon = isAnalyteExcluded({ state: status }) ? '🔴' : '🔵';
                      
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStatusFilter(status)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: isActive ? style.color : style.bg,
                            color: isActive ? 'white' : style.color,
                            border: `1px solid ${isActive ? style.color : style.border}`,
                            boxShadow: isActive ? `0 2px 8px ${style.color}33` : 'none'
                          }}
                        >
                          {icon} {status} ({count})
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Botones de Acordeón Colectivo */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const obj: Record<string, boolean> = { unassigned: false };
                    recintos.forEach(r => { obj[r.id] = false; });
                    setCollapsedRecintoAnalytes(obj);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  className="btn-light-hover"
                >
                  📂 Expandir Sedes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const obj: Record<string, boolean> = { unassigned: true };
                    recintos.forEach(r => { obj[r.id] = true; });
                    setCollapsedRecintoAnalytes(obj);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  className="btn-light-hover"
                >
                  📁 Colapsar Sedes
                </button>
              </div>
            </div>

            {/* Fila 2: Buscador & CTA Manual & Auto-save */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '280px' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Buscar analito, cod. transmisión, cod. test, sección, instrumento o sede prestadora..." 
                  value={analyteSearch} 
                  onChange={e => setAnalyteSearch(e.target.value)} 
                  style={{ width: '100%', padding: '10px 10px 10px 42px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} 
                />
              </div>

              {/* Botón para Crear Analito Manualmente */}
              <button
                type="button"
                onClick={() => {
                  setEditingAnalyte(null);
                  setIsAnalyteModalOpen(true);
                }}
                style={{
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 'bold',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.15)',
                  transition: 'all 0.2s ease',
                  height: '40px'
                }}
                className="btn-primary-hover"
              >
                <span>➕ Nuevo Analito</span>
              </button>

              {/* Botón para Exportar Matriz a Excel */}
              <button
                type="button"
                onClick={exportAnalytesToExcel}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  color: '#7c3aed',
                  border: '1px solid #7c3aed',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 'bold',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  height: '40px'
                }}
                className="btn-light-hover"
              >
                <FileSpreadsheet size={16} />
                <span>Exportar Matriz LIS</span>
              </button>

              {/* Botón de Respaldos e Integridad */}
              <button
                type="button"
                onClick={() => {
                  setIsBackupModalOpen(true);
                  fetchDatabaseStatus();
                }}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  color: '#10b981',
                  border: '1px solid #10b981',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 'bold',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  height: '40px'
                }}
                className="btn-light-hover"
              >
                <Save size={16} />
                <span>Respaldos & Integridad</span>
              </button>
              
              {/* Auto-save indicator */}
              {saveStatus !== 'idle' && (
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: saveStatus === 'saving' ? 'rgba(124, 58, 237, 0.08)' : 'rgba(13, 148, 136, 0.08)',
                    color: saveStatus === 'saving' ? '#7c3aed' : '#0d9488',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: `1px solid ${saveStatus === 'saving' ? 'rgba(124, 58, 237, 0.15)' : 'rgba(13, 148, 136, 0.15)'}`,
                    whiteSpace: 'nowrap',
                    height: '40px',
                    alignSelf: 'center'
                  }}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={12} />
                      <span>Cambios guardados</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Grouped Accordion / Grid list of Analytes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 🔬 SECCIÓN DE ANALITOS PENDIENTES DE ASIGNACIÓN DE SEDE */}
            {(() => {
              const unassignedAnalytes = filteredAnalytes.filter(a => !a.recintoId);
              if (unassignedAnalytes.length === 0) return null;

              const isCollapsed = collapsedRecintoAnalytes['unassigned'] || false;
              const totalCount = unassignedAnalytes.length;
              
              // Agrupar por instrumento
              const groupedByEquip: Record<string, any> = {};
              unassignedAnalytes.forEach(a => {
                const eqName = a.instrumentName || 'Instrumento Sin Nombre';
                if (!groupedByEquip[eqName]) groupedByEquip[eqName] = [];
                groupedByEquip[eqName].push(a);
              });

              return (
                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-primary)', border: '1.5px solid var(--accent-warning)', boxShadow: '0 4px 20px rgba(245, 158, 11, 0.05)' }}>
                  {/* Header Banner - Warning Orange themed */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      padding: '14px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onClick={() => {
                      setCollapsedRecintoAnalytes(prev => ({
                        ...prev,
                        unassigned: !prev.unassigned
                      }));
                    }}
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
                      <ShieldAlert size={18} />
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.5px' }}>
                        Analitos Sin Sede Asignada (Pendientes de Configuración)
                      </span>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {totalCount} Analitos
                      </span>
                    </div>
                  </div>

                  {/* Body grid list */}
                  <div 
                    style={{ 
                      maxHeight: isCollapsed ? '0px' : 'none', 
                      opacity: isCollapsed ? 0 : 1,
                      overflow: isCollapsed ? 'hidden' : 'visible',
                      transition: 'max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-out',
                      width: '100%',
                      padding: isCollapsed ? '0px' : '20px',
                      background: '#FFFBEB'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(245, 158, 11, 0.08)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.15)', color: '#b45309', fontSize: '0.82rem' }}>
                        <Info size={16} />
                        <span>Asigna cada equipo/instrumento a su Sede Clínica correspondiente. Todos los analitos asociados a ese instrumento se trasladarán automáticamente en cascada en la base de datos.</span>
                      </div>

                      {Object.entries(groupedByEquip).map(([equipName, list]) => {
                        const isEqCollapsed = collapsedInstruments['unassigned_' + equipName] || false;
                        return (
                          <div key={equipName} style={{ background: '#ffffff', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.01)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                              <div 
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => {
                                  setCollapsedInstruments(prev => ({
                                    ...prev,
                                    ['unassigned_' + equipName]: !isEqCollapsed
                                  }));
                                }}
                              >
                                <ChevronDown 
                                  size={16} 
                                  style={{ 
                                    transform: isEqCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', 
                                    transition: 'transform 0.2s ease',
                                    color: '#b45309'
                                  }} 
                                />
                                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#b45309' }}>
                                  🔬 {equipName}
                                </span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '99px', background: 'rgba(245,158,11,0.1)', color: '#b45309' }}>
                                  {list.length} {list.length === 1 ? 'Analito' : 'Analitos'}
                                </span>
                              </div>

                              {/* Dropdown de asignación interactiva */}
                              {!isEqCollapsed && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#b45309' }}>📍 Asignar Sede:</span>
                                    <select
                                      value=""
                                      onChange={async (e) => {
                                        const recId = e.target.value;
                                        if (!recId) return;
                                        const targetRecinto = recintos.find(r => r.id === recId);
                                        if (!targetRecinto) return;

                                        if (confirm(`⚠️ ¿Deseas asignar el instrumento "${equipName}" y trasladar sus ${list.length} analitos en cascada al recinto "${targetRecinto.name}"?`)) {
                                          setSaveStatus('saving');
                                          const res = await useEquipmentStore.getState().assignRecintoToInstrument(equipName, recId);
                                          if (res.success) {
                                            setSaveStatus('saved');
                                            setTimeout(() => setSaveStatus('idle'), 1500);
                                          } else {
                                            alert(`Error: ${res.message}`);
                                            setSaveStatus('idle');
                                          }
                                        }
                                      }} 
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #f59e0b',
                                        background: 'white',
                                        color: '#b45309',
                                        fontWeight: 'bold',
                                        fontSize: '0.78rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="">-- Seleccionar Sede --</option>
                                      {recintos.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#b45309' }}>⚡ Estado masivo:</span>
                                    <select
                                      value=""
                                      onChange={async (e) => {
                                        const targetState = e.target.value;
                                        if (!targetState) return;
                                        if (confirm(`¿Deseas cambiar el estado de los ${list.length} analitos de este instrumento a "${targetState}"?`)) {
                                          setSaveStatus('saving');
                                          try {
                                            await Promise.all(list.map((a: any) => updateAnalyte(a.id, { state: targetState })));
                                            setSaveStatus('saved');
                                          } catch (error) {
                                            console.error(error);
                                            setSaveStatus('idle');
                                          } finally {
                                            setTimeout(() => setSaveStatus('idle'), 1500);
                                          }
                                        }
                                      }} 
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #f59e0b',
                                        background: 'white',
                                        color: '#b45309',
                                        fontWeight: 'bold',
                                        fontSize: '0.78rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <option value="">-- Cambiar todos a --</option>
                                      <option value="No iniciado">⚫ No iniciado</option>
                                      <option value="transmitiendo">🟢 transmitiendo</option>
                                      <option value="en pausa">🟡 en pausa</option>
                                      <option value="no aplica">🔴 no aplica</option>
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Subtabla de Analitos Pendientes */}
                            {!isEqCollapsed && (
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                                  <thead>
                                    <tr style={{ background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                                      <th style={{ padding: '10px 16px' }}>#</th>
                                      {!hiddenAnalyteCols.includes('transmissionCode') && <th style={{ padding: '10px 16px' }}>Cód. Transmisión</th>}
                                      {!hiddenAnalyteCols.includes('testCode') && <th style={{ padding: '10px 12px' }}>Cód. Test / Código Analito</th>}
                                      <th style={{ padding: '10px 12px' }}>Nombre del Analito</th>
                                      {!hiddenAnalyteCols.includes('description') && <th style={{ padding: '10px 12px' }}>Descripción Extensa</th>}
                                      {!hiddenAnalyteCols.includes('section') && <th style={{ padding: '10px 12px' }}>Sección / Lab</th>}
                                      {customColumnsAnalytes.map(col => (
                                        <th key={col} style={{ padding: '10px 12px', minWidth: '150px' }}>{col}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {list.map((analyte: any, idx: number) => {
                                      const customFieldsData = analyte.customFields ? JSON.parse(analyte.customFields) : {};
                                      return (
                                        <tr key={analyte.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', background: 'var(--bg-primary)' }}>
                                          <td style={{ padding: '10px 16px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                          {!hiddenAnalyteCols.includes('transmissionCode') && (
                                            <td style={{ padding: '10px 16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                              {analyte.transmissionCode}
                                            </td>
                                          )}
                                          {!hiddenAnalyteCols.includes('testCode') && (
                                            <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                              {analyte.testCode}
                                            </td>
                                          )}
                                          <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--accent-warning)' }}>
                                            {analyte.name}
                                          </td>
                                          {!hiddenAnalyteCols.includes('description') && (
                                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={analyte.description}>
                                              {analyte.description || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Sin descripción</span>}
                                            </td>
                                          )}
                                          {!hiddenAnalyteCols.includes('section') && (
                                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                              {analyte.section}
                                            </td>
                                          )}
                                          {/* Celdas de Columnas Dinámicas para Analitos No Asignados */}
                                          {customColumnsAnalytes.map(col => {
                                            const cellValue = customFieldsData[col] || '';
                                            return (
                                              <td key={col} style={{ padding: '8px 12px' }}>
                                                <InlineInput
                                                  value={cellValue}
                                                  onSave={(val) => {
                                                    const updatedFields = { ...customFieldsData, [col]: val };
                                                    updateAnalyte(analyte.id, { customFields: JSON.stringify(updatedFields) });
                                                  }}
                                                  placeholder={`Ingresar ${col.toLowerCase()}...`}
                                                  style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px solid transparent', borderRadius: '4px', outline: 'none', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                                                  className="cell-input"
                                                />
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ACCORDEONES DE SEDES Y CLINICAS PRINCIPALES */}
            {recintos.map((rec) => {
              const recAnalytes = filteredAnalytes.filter(a => a.recintoId === rec.id);
              const isCollapsed = collapsedRecintoAnalytes[rec.id] || false;
              const recEquips = scopeFilteredEquipments.filter(e => e.recintoId === rec.id);

              // Avance de sede calculado sobre analitos aplicables (excluye 'no aplica' del denominador)
              const allRecAnalytes = scopeFilteredAnalytes.filter(a => a.recintoId === rec.id);
              const total = allRecAnalytes.length;
              const recNoAplica = allRecAnalytes.filter(a => normalizeAnalyteState(a.state) === 'no aplica').length;
              const recApplicable = total - recNoAplica;
              
              const activeCount = allRecAnalytes.filter(a => {
                const state = normalizeAnalyteState(a.state);
                return state === 'transmitiendo';
              }).length;
              
              const hasApplicable = recApplicable > 0;
              const pct = hasApplicable ? (activeCount / recApplicable) * 100 : 0;
              const pctFormatted = hasApplicable ? `${pct.toFixed(1)}%` : 'N/A';

              // Agrupar por instrumento
              const groupedByEquip: Record<string, any> = {};
              recAnalytes.forEach(a => {
                const eqName = a.instrumentName || 'Instrumento Sin Nombre';
                if (!groupedByEquip[eqName]) groupedByEquip[eqName] = [];
                groupedByEquip[eqName].push(a);
              });

              return (
                <div key={rec.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}>
                  {/* Header Banner - Purple analytes themed */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      color: 'white',
                      padding: '14px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onClick={() => {
                      setCollapsedRecintoAnalytes(prev => ({
                        ...prev,
                        [rec.id]: !prev[rec.id]
                      }));
                    }}
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
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.5px' }}>{rec.name}</span>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '4px' }}>{rec.code}</span>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.22)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', marginLeft: '4px' }} title="Instrumentos de laboratorio configurados en esta sede">
                        {Object.keys(groupedByEquip).length} {Object.keys(groupedByEquip).length === 1 ? 'Instrumento LIS' : 'Instrumentos LIS'}
                      </span>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.11)', border: '1px dashed rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', marginLeft: '4px', opacity: 0.85 }} title="Equipos Clínicos registrados en Seguimiento General">
                        {recEquips.length} {recEquips.length === 1 ? 'Eq. Físico' : 'Eq. Físicos'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Reasignación Masiva de Sede */}
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.85)' }}>
                          Foco Sede:
                        </span>
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            
                            let newScopeStatus = 'ACTIVE';
                            let newScopeId: string | null = null;
                            
                            if (val === 'OUT_OF_SCOPE') {
                              newScopeStatus = 'OUT_OF_SCOPE';
                            } else {
                              newScopeStatus = 'ACTIVE';
                              newScopeId = val;
                            }
                            
                            (globalThis as any).initiateScopeChange(
                              rec.id, 
                              'RECINTO', 
                              newScopeId, 
                              newScopeStatus, 
                              rec.name, 
                              null
                            );
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.25)',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '0.72rem',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="" style={{ background: '#7c3aed', color: 'white' }}>-- Mover Sede Completa --</option>
                          {releasePhases.map(phase => (
                            <option key={phase.id} value={phase.id} style={{ background: '#ffffff', color: '#000000' }}>
                              📅 Mover a {phase.name}
                            </option>
                          ))}
                          <option value="OUT_OF_SCOPE" style={{ background: '#ffffff', color: '#dc2626' }}>
                            ⚙️ Fuera de Alcance
                          </option>
                        </select>
                      </div>

                      {total > 0 && ( 
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
                          title="Porcentaje de Analitos Transmitiendo sobre Aplicables en este Recinto"
                        >
                          <span style={{ fontWeight: 800 }}>Transmisión: {pctFormatted}</span>
                          <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${hasApplicable ? pct : 0}%`, height: '100%', background: hasApplicable ? '#10b981' : '#6b7280', borderRadius: '3px' }} />
                          </div>
                          <span style={{ opacity: 0.85, fontSize: '0.72rem' }}>
                            ({activeCount} de {recApplicable} aplicables)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div 
                    style={{ 
                      maxHeight: isCollapsed ? '0px' : 'none', 
                      opacity: isCollapsed ? 0 : 1,
                      overflow: isCollapsed ? 'hidden' : 'visible',
                      transition: 'max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-out',
                      width: '100%',
                      padding: isCollapsed ? '0px' : '20px'
                    }}
                  >
                    {total === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No hay analitos registrados en esta sede clínica. Puedes importarlos usando el botón superior "Importar Equipos".
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {Object.entries(groupedByEquip).map(([equipName, list]) => {
                          const eqTotal = list.length;
                          const isEqCollapsed = collapsedInstruments[rec.id + '_' + equipName] || false;
                          return (
                            <div key={equipName} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.005)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div 
                                  style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}
                                  onClick={() => {
                                    setCollapsedInstruments(prev => ({
                                      ...prev,
                                      [rec.id + '_' + equipName]: !isEqCollapsed
                                    }));
                                  }}
                                >
                                  <ChevronDown 
                                    size={16} 
                                    style={{ 
                                      transform: isEqCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', 
                                      transition: 'transform 0.2s ease',
                                      color: 'var(--text-secondary)'
                                    }} 
                                  />
                                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    🔬 {equipName}
                                  </span>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '99px',
                                    background: 'rgba(124, 58, 237, 0.08)',
                                    color: '#7c3aed'
                                  }}>
                                    {eqTotal} {eqTotal === 1 ? 'Analito' : 'Analitos'}
                                  </span>
                                </div>

                                {!isEqCollapsed && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                    {/* Cambiar Sede Selector (Rectificación en caliente) */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>SEDE:</span>
                                      <select
                                        value={rec.id}
                                        onChange={async (e) => {
                                          const newRecId = e.target.value;
                                          if (!newRecId || newRecId === rec.id) return;
                                          const targetRec = recintos.find(r => r.id === newRecId);
                                          if (!targetRec) return;
                                          
                                          if (confirm(`⚠️ ¿Deseas rectificar la ubicación de "${equipName}" y trasladar sus ${eqTotal} analitos en cascada al recinto "${targetRec.name}"?`)) {
                                            setSaveStatus('saving');
                                            const res = await useEquipmentStore.getState().assignRecintoToInstrument(equipName, newRecId, rec.id);
                                            if (res.success) {
                                              setSaveStatus('saved');
                                              setTimeout(() => setSaveStatus('idle'), 1500);
                                            } else {
                                              alert(`Error: ${res.message}`);
                                              setSaveStatus('idle');
                                            }
                                          }
                                        }} 
                                        style={{
                                          padding: '3px 8px',
                                          background: 'var(--bg-primary)',
                                          border: '1px solid rgba(124, 58, 237, 0.25)',
                                          borderRadius: '6px',
                                          color: '#7c3aed',
                                          fontSize: '0.72rem',
                                          fontWeight: 'bold',
                                          outline: 'none',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {recintos.map(r => (
                                          <option key={r.id} value={r.id}>
                                            {r.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Cambiar Estado Masivo Selector */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ESTADO:</span>
                                      <select
                                        value=""
                                        onChange={async (e) => {
                                          const targetState = e.target.value;
                                          if (!targetState) return;
                                          if (confirm(`¿Deseas cambiar el estado de los ${list.length} analitos de este instrumento a "${targetState}"?`)) {
                                            setSaveStatus('saving');
                                            try {
                                              await Promise.all(list.map((a: any) => updateAnalyte(a.id, { state: targetState })));
                                              setSaveStatus('saved');
                                            } catch (error) {
                                              console.error(error);
                                              setSaveStatus('idle');
                                            } finally {
                                              setTimeout(() => setSaveStatus('idle'), 1500);
                                            }
                                          }
                                        }} 
                                        style={{
                                          padding: '3px 8px',
                                          background: 'var(--bg-primary)',
                                          border: '1px solid rgba(124, 58, 237, 0.25)',
                                          borderRadius: '6px',
                                          color: '#7c3aed',
                                          fontSize: '0.72rem',
                                          fontWeight: 'bold',
                                          outline: 'none',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <option value="">-- Cambiar todos a --</option>
                                        <option value="No iniciado">⚫ No iniciado</option>
                                        <option value="transmitiendo">🟢 transmitiendo</option>
                                        <option value="en pausa">🟡 en pausa</option>
                                        <option value="no aplica">🔴 no aplica</option>
                                      </select>
                                    </div>

                                    {/* Cambiar Fase del Equipo Padre (Afecta en cascada a todos los heredados) */}
                                    {(() => {
                                      const parentEq = equipments.find(e => e.name === equipName && e.recintoId === rec.id);
                                      if (!parentEq) return null;
                                      
                                      return (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>FASE:</span>
                                          <select
                                            value={parentEq.releasePhaseId || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              let newScopeStatus = 'ACTIVE';
                                              let newScopeId: string | null = null;
                                              
                                              if (val === 'OUT_OF_SCOPE') {
                                                newScopeStatus = 'OUT_OF_SCOPE';
                                              } else if (val) {
                                                newScopeStatus = 'ACTIVE';
                                                newScopeId = val;
                                              } else {
                                                newScopeStatus = 'ACTIVE';
                                              }
                                              
                                              (globalThis as any).initiateScopeChange(
                                                parentEq.id, 
                                                'EQUIPMENT', 
                                                newScopeId, 
                                                newScopeStatus, 
                                                parentEq.name, 
                                                parentEq.releasePhaseId
                                              );
                                            }} 
                                            style={{
                                              padding: '3px 8px',
                                              background: 'var(--bg-primary)',
                                              border: '1px solid rgba(124, 58, 237, 0.25)',
                                              borderRadius: '6px',
                                              color: parentEq.scopeStatus === 'OUT_OF_SCOPE' ? '#6b7280' : '#2563eb',
                                              fontSize: '0.72rem',
                                              fontWeight: 'bold',
                                              outline: 'none',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            <option value="">-- Sin Asignar --</option>
                                            {releasePhases.map(phase => (
                                              <option key={phase.id} value={phase.id}>
                                                📅 {phase.name}
                                              </option>
                                            ))}
                                            <option value="OUT_OF_SCOPE">⚙️ Fuera de Alcance</option>
                                          </select>
                                          
                                          <button
                                            onClick={() => (globalThis as any).showItemTimeline(parentEq.id, parentEq.name)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: '2px', display: 'flex', alignItems: 'center' }}
                                            title="Ver historial de cambios de alcance de este equipo"
                                          >
                                            <Database size={13} />
                                          </button>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>

                              {/* Subtabla de Analitos */}
                              {!isEqCollapsed && (
                                <>
                                  <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                                      <thead>
                                        <tr style={{ background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                                          <th style={{ padding: '10px 16px' }}>#</th>
                                          {!hiddenAnalyteCols.includes('transmissionCode') && <th style={{ padding: '10px 16px' }}>Cód. Transmisión</th>}
                                          {!hiddenAnalyteCols.includes('testCode') && <th style={{ padding: '10px 12px' }}>Cód. Test / Código Analito</th>}
                                          <th style={{ padding: '10px 12px' }}>Nombre del Analito</th>
                                          {!hiddenAnalyteCols.includes('description') && <th style={{ padding: '10px 12px' }}>Descripción</th>}
                                          {!hiddenAnalyteCols.includes('section') && <th style={{ padding: '10px 12px' }}>Sección / Lab</th>}
                                          {!hiddenAnalyteCols.includes('state') && <th style={{ padding: '10px 16px', width: '150px', textAlign: 'center' }}>Estado Transmisión</th>}
                                          <th style={{ padding: '10px 12px', width: '170px' }}>Fase / Alcance</th>
                                          
                                          {/* Cabeceras de Columnas Dinámicas de Analitos */}
                                          {customColumnsAnalytes.map((col, cIdx) => (
                                            <th key={col} style={{ padding: '10px 12px', minWidth: '150px', position: 'relative' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                <span 
                                                  style={{ cursor: 'pointer' }}
                                                  onClick={() => {
                                                    setIsAddingCol(true);
                                                    setEditingColIndexAnalyte(cIdx);
                                                    setEditingColNameAnalyte(col);
                                                  }}
                                                  title="Administrar columna"
                                                >
                                                  {col}
                                                </span>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                  <button 
                                                    onClick={() => {
                                                      setIsAddingCol(true);
                                                      setEditingColIndexAnalyte(cIdx);
                                                      setEditingColNameAnalyte(col);
                                                    }} 
                                                    style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                                                    title={`Renombrar columna "${col}"`}
                                                  >
                                                    <Edit2 size={12} />
                                                  </button>
                                                  <button 
                                                    onClick={() => handleDeleteColumnAnalyte(col)} 
                                                    style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', padding: '2px' }}
                                                    title={`Eliminar columna "${col}"`}
                                                  >
                                                    <X size={12} />
                                                  </button>
                                                </div>
                                              </div>
                                            </th>
                                          ))}

                                          <th style={{ padding: '10px 16px', width: '50px', textAlign: 'center' }}>Acción</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(() => {
                                          const equipKey = rec.id + '_' + equipName;
                                          const isExpanded = expandedInstruments[equipKey] || false;
                                          const visibleAnalytes = isExpanded ? list : list.slice(0, 12);
                                          return visibleAnalytes.map((analyte: any, idx: number) => {
                                            const customFieldsData = analyte.customFields ? JSON.parse(analyte.customFields) : {};
                                            return (
                                              <tr key={analyte.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', background: 'var(--bg-primary)' }} className="table-row-hover">
                                                <td style={{ padding: '10px 16px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                                
                                                {!hiddenAnalyteCols.includes('transmissionCode') && (
                                                  <td style={{ padding: '10px 16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                                    {analyte.transmissionCode}
                                                  </td>
                                                )}
                                                
                                                {!hiddenAnalyteCols.includes('testCode') && (
                                                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                    {analyte.testCode}
                                                  </td>
                                                )}
                                                
                                                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#7c3aed' }}>
                                                  {analyte.name}
                                                </td>
                                                
                                                {!hiddenAnalyteCols.includes('description') && (
                                                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={analyte.description}>
                                                    {analyte.description || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Sin descripción</span>}
                                                  </td>
                                                )}
                                                
                                                {!hiddenAnalyteCols.includes('section') && (
                                                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                                    {analyte.section}
                                                  </td>
                                                )}
                                                
                                                {!hiddenAnalyteCols.includes('state') && (
                                                  <td style={{ padding: '6px 16px', textAlign: 'center' }}>
                                                    <CustomAnalyteSelect 
                                                      value={analyte.state} 
                                                      onChange={(val) => {
                                                        updateAnalyte(analyte.id, { state: val });
                                                      }} 
                                                      customStatuses={uniqueAnalyteStatuses}
                                                    />
                                                  </td>
                                                )}

                                                <td style={{ padding: '6px 12px' }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <select
                                                      value={analyte.scopeStatus === 'INHERITED' ? 'INHERITED' : (analyte.scopeStatus === 'OUT_OF_SCOPE' ? 'OUT_OF_SCOPE' : (analyte.releasePhaseId || ''))}
                                                      onChange={(e) => {
                                                        const val = e.target.value;
                                                        let newScopeStatus = 'ACTIVE';
                                                        let newScopeId: string | null = null;
                                                        
                                                        if (val === 'INHERITED') {
                                                          newScopeStatus = 'INHERITED';
                                                          const parentEq = equipments.find(eq => eq.id === analyte.equipmentId);
                                                          newScopeId = parentEq ? parentEq.releasePhaseId || null : null;
                                                        } else if (val === 'OUT_OF_SCOPE') {
                                                          newScopeStatus = 'OUT_OF_SCOPE';
                                                        } else if (val) {
                                                          newScopeStatus = 'ACTIVE';
                                                          newScopeId = val;
                                                        } else {
                                                          newScopeStatus = 'ACTIVE';
                                                        }
                                                        
                                                        (globalThis as any).initiateScopeChange(
                                                          analyte.id, 
                                                          'ANALYTE', 
                                                          newScopeId, 
                                                          newScopeStatus, 
                                                          analyte.name, 
                                                          analyte.releasePhaseId
                                                        );
                                                      }}
                                                      style={{
                                                        width: '100%',
                                                        padding: '4px',
                                                        background: 'transparent',
                                                        border: '1px solid transparent',
                                                        borderRadius: '4px',
                                                        outline: 'none',
                                                        color: analyte.scopeStatus === 'INHERITED' ? 'var(--text-secondary)' : (analyte.scopeStatus === 'OUT_OF_SCOPE' ? '#6b7280' : '#2563eb'),
                                                        fontWeight: 'bold',
                                                        fontSize: '0.78rem',
                                                        cursor: 'pointer'
                                                      }}
                                                      className="cell-input"
                                                    >
                                                      <option value="INHERITED">👪 Heredado (Padre)</option>
                                                      {releasePhases.map(phase => (
                                                        <option key={phase.id} value={phase.id}>📅 {phase.name}</option>
                                                      ))}
                                                      <option value="OUT_OF_SCOPE">⚙️ Fuera de Alcance</option>
                                                    </select>

                                                    <button
                                                      onClick={() => (globalThis as any).showItemTimeline(analyte.id, analyte.name)}
                                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                      title="Ver historial de alcance del analito"
                                                    >
                                                      <Database size={12} />
                                                    </button>
                                                  </div>
                                                </td>

                                                {/* Celdas de Columnas Dinámicas para Analitos */}
                                                {customColumnsAnalytes.map(col => {
                                                  const cellValue = customFieldsData[col] || '';
                                                  return (
                                                    <td key={col} style={{ padding: '8px 12px' }}>
                                                      <InlineInput
                                                        value={cellValue}
                                                        onSave={(val) => {
                                                          const updatedFields = { ...customFieldsData, [col]: val };
                                                          updateAnalyte(analyte.id, { customFields: JSON.stringify(updatedFields) });
                                                        }}
                                                        placeholder={`Ingresar ${col.toLowerCase()}...`}
                                                        style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px solid transparent', borderRadius: '4px', outline: 'none', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                                                        className="cell-input"
                                                      />
                                                    </td>
                                                  );
                                                })}

                                                <td style={{ padding: '6px 16px', textAlign: 'center' }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setEditingAnalyte(analyte);
                                                        setIsAnalyteModalOpen(true);
                                                      }} 
                                                      style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', opacity: 0.8 }}
                                                      title="Editar analito"
                                                    >
                                                      <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={async () => {
                                                        if (confirm(`¿Estás seguro de eliminar el analito "${analyte.name}"?`)) {
                                                          setSaveStatus('saving');
                                                          await deleteAnalyte(analyte.id);
                                                          setSaveStatus('saved');
                                                          setTimeout(() => setSaveStatus('idle'), 1500);
                                                        }
                                                      }} 
                                                      style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.8 }}
                                                      title="Eliminar analito"
                                                    >
                                                      <Trash2 size={13} />
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          });
                                        })()}
                                      </tbody>
                                    </table>
                                  </div>
                                  {/* Mostrar más/menos de assigned */}
                                  {(() => {
                                    const equipKey = rec.id + '_' + equipName;
                                    const isExpanded = expandedInstruments[equipKey] || false;
                                    if (list.length <= 12) return null;
                                    return (
                                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setExpandedInstruments(prev => ({
                                              ...prev,
                                              [equipKey]: !isExpanded
                                            }));
                                          }}
                                          style={{
                                            padding: '6px 16px',
                                            background: 'rgba(124, 58, 237, 0.08)',
                                            border: '1px solid rgba(124, 58, 237, 0.2)',
                                            borderRadius: '20px',
                                            color: '#7c3aed',
                                            fontWeight: 'bold',
                                            fontSize: '0.74rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.15s ease'
                                          }}
                                          className="btn-light-hover"
                                        >
                                          {isExpanded ? '⬆️ Mostrar menos' : `⬇️ Ver ${list.length - 12} analitos más...`}
                                        </button>
                                      </div>
                                    );
                                  })()}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
      {/* MODAL DE GESTIÓN DE ANALITOS (CREACIÓN / EDICIÓN EN CALIENTE) */}
      {isAnalyteModalOpen && (
        <AnalyteModal
          isOpen={isAnalyteModalOpen}
          onClose={() => {
            setIsAnalyteModalOpen(false);
            setEditingAnalyte(null);
          }}
          editingAnalyte={editingAnalyte}
          recintos={recintos}
          analytes={analytes}
          onSave={async (analyteData) => {
            setSaveStatus('saving');
            try {
              if (editingAnalyte) {
                // Modo Edición
                await updateAnalyte(editingAnalyte.id, analyteData);
              } else {
                // Modo Creación
                await addAnalyte(analyteData);
              }
              setSaveStatus('saved');
            } catch (e) {
              console.error("Error saving analyte:", e);
              alert("Error al guardar el analito. Por favor, intente de nuevo.");
            } finally {
              setTimeout(() => setSaveStatus('idle'), 1500);
              setIsAnalyteModalOpen(false);
              setEditingAnalyte(null);
            }
          }}
        />
      )}
      {/* MODAL DE GESTIÓN DE COPIAS DE SEGURIDAD E INTEGRIDAD */}
      {isBackupModalOpen && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card" style={{ width: '600px', maxWidth: '95vw', animation: 'scaleUp 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={20} />
                <span>💾 Copias de Seguridad y Auditoría de Datos</span>
              </h3>
              <button 
                onClick={() => setIsBackupModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%', transition: 'background 0.15s' }} 
                className="btn-light-hover"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Resumen actual */}
              <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>📊 Estado de Base de Datos Activa (Producción)</h4>
                {databaseStatus ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                    <div style={{ background: 'var(--bg-primary)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#7c3aed' }}>{databaseStatus.current.recintos}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Sedes / Recintos</div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0079C1' }}>{databaseStatus.current.equipments}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Equipos Físicos</div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{databaseStatus.current.analytes}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Analitos de Lab</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <Loader2 size={16} className="animate-spin" style={{ marginRight: '6px' }} />
                    Cargando estado...
                  </div>
                )}
              </div>

              {/* Botón de backup */}
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  onClick={handleCreateBackup}
                  disabled={isBackingUp}
                  style={{
                    padding: '10px 18px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                    transition: 'all 0.2s ease',
                    opacity: isBackingUp ? 0.7 : 1
                  }}
                  className="btn-primary-hover"
                >
                  {isBackingUp ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Creando Copia...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Crear Punto de Restauración / Copia</span>
                    </>
                  )}
                </button>
              </div>

              {/* Listado de backups */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>📂 Puntos de Restauración Disponibles</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                  {!databaseStatus || databaseStatus.backups.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      No hay copias de seguridad guardadas todavía.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Fecha / Identificador</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Tamaño</th>
                          <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {databaseStatus.backups.map(bk => (
                          <tr key={bk.filename} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontWeight: 600 }}>{bk.name}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{(bk.sizeBytes / 1024 / 1024).toFixed(2)} MB</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRestoreBackup(bk.filename)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background: 'rgba(16, 185, 129, 0.08)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    color: '#10b981',
                                    fontSize: '0.72rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                  }}
                                  className="btn-light-hover"
                                  title="Restaurar base de datos a este punto"
                                >
                                  ♻️ Restaurar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBackup(bk.filename)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444',
                                    fontSize: '0.72rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                  }}
                                  className="btn-light-hover"
                                  title="Eliminar este archivo de copia"
                                >
                                  🗑️ Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
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

        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />

      {/* Undo Toast flotante */}
      {showUndoToast && lastDeletedEq && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0F172A',
            color: 'white',
            padding: '14px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 1000,
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <span style={{ fontSize: '0.88rem' }}>
            Se eliminó "<strong>{lastDeletedEq.name}</strong>"
          </span>
          <button
            onClick={handleUndo}
            style={{
              background: '#004B87',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw size={12} />
            Deshacer
          </button>
        </div>
      )}

      {/* Modal de Papelera de Reciclaje */}
      {isTrashOpen && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card" style={{ width: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#003B64', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} style={{ color: '#ef4444' }} />
                Papelera de Reciclaje ({deletedEquipments.length})
              </h3>
              <button onClick={() => setIsTrashOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {loadingTrash ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px', gap: '10px' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#004B87' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cargando papelera...</span>
              </div>
            ) : deletedEquipments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Trash2 size={48} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>La papelera está vacía</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Los equipos que elimines aparecerán aquí para que puedas restaurarlos.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
                  Los siguientes equipos han sido eliminados lógicamente. Puedes restaurarlos con todos sus campos e historial intactos, o borrarlos definitivamente de la base de datos.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                  {deletedEquipments.map((eq) => {
                    const recintoName = recintos.find(r => r.id === eq.recintoId)?.name || 'Sede desconocida';
                    const deletedDate = eq.deletedAt ? format(new Date(eq.deletedAt), 'dd/MM/yyyy HH:mm') : 'Fecha de eliminación desconocida';
                    
                    return (
                      <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{eq.name}</div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span>📍 {recintoName}</span>
                            <span>📁 {eq.section}</span>
                            <span>🗑️ {deletedDate}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={async () => {
                              await restoreEquipment(eq.id);
                              await fetchDeletedEquipments();
                            }}
                            className="btn btn-secondary"
                            style={{
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.2)',
                              padding: '6px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 'bold',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Restaurar equipo a su sede original"
                          >
                            <RefreshCw size={12} />
                            Restaurar
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`¿Está seguro de eliminar definitivamente "${eq.name}"? Esta acción no se puede deshacer y borrará permanentemente todo su historial.`)) {
                                await useEquipmentStore.getState().hardDeleteEquipment(eq.id);
                                await fetchDeletedEquipments();
                              }
                            }}
                            className="btn btn-secondary"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              padding: '6px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 'bold',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Eliminar permanentemente de la base de datos"
                          >
                            <X size={12} />
                            Borrar definitivo
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button type="button" onClick={() => setIsTrashOpen(false)} className="btn btn-secondary" style={{ padding: '8px 16px', background: '#004B87', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '6px' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Helper actions for scope change */}
      {(() => {
        // Inicializar funciones auxiliares en caliente
        (globalThis as any).initiateScopeChange = (itemId: string, itemType: 'EQUIPMENT' | 'ANALYTE', newScopeId: string | null, newScopeStatus: string, itemName: string, currentPhaseId: string | null) => {
          let previousScopeName = 'Ninguno';
          if (currentPhaseId) {
            const rp = releasePhases.find(p => p.id === currentPhaseId);
            if (rp) previousScopeName = rp.name;
          } else if (newScopeStatus === 'OUT_OF_SCOPE') {
            previousScopeName = 'Fuera de Alcance';
          }
          
          setScopeChangeParams({
            itemId,
            itemType,
            newScope: newScopeId,
            newScopeStatus,
            itemName,
            previousScopeName
          });
          setJustification('');
          setReasonCode('PMO_DECISION');
          setIsJustifyModalOpen(true);
        };

        (globalThis as any).showItemTimeline = async (itemId: string, itemName: string) => {
          setTimelineItemId(itemId);
          setTimelineItemName(itemName);
          setTimelineLogs([]);
          setIsTimelineModalOpen(true);
          
          const logs = await fetchScopeLogs(itemId);
          setTimelineLogs(logs);
        };
        return null;
      })()}

      {/* MODAL 1: CONFIGURACIÓN DE FASES DINÁMICAS */}
      {isPhaseModalOpen && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#004B87', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} />
                Configurar Fases de Lanzamiento
              </h3>
              <button onClick={() => setIsPhaseModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Listado de Fases */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Fases Existentes
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '8px' }}>
                {releasePhases.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No hay fases configuradas.</div>
                ) : (
                  releasePhases.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', fontSize: '0.82rem', color: 'var(--text-primary)' }}>{p.name}</span>
                        {p.description && <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.description}</p>}
                      </div>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Activa</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Crear Nueva Fase */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newPhaseName.trim()) return;
              const res = await createReleasePhase(newPhaseName, newPhaseDesc);
              if (res.success) {
                setNewPhaseName('');
                setNewPhaseDesc('');
                alert("Fase creada exitosamente");
              } else {
                alert(`Error: ${res.error}`);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#004B87', textTransform: 'uppercase', display: 'block' }}>
                Crear Nueva Fase
              </span>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Nombre de la Fase:</label>
                <input 
                  type="text" 
                  value={newPhaseName} 
                  onChange={e => setNewPhaseName(e.target.value)} 
                  placeholder="Ej: Fase 3 - Expansión"
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.8rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Descripción:</label>
                <textarea 
                  value={newPhaseDesc} 
                  onChange={e => setNewPhaseDesc(e.target.value)} 
                  placeholder="Detalles sobre el alcance de esta fase..."
                  rows={2}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.8rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none' }}
                />
              </div>
              <button 
                type="submit" 
                style={{ alignSelf: 'flex-end', padding: '8px 16px', background: 'linear-gradient(135deg, #004B87 0%, #003B64 100%)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Agregar Fase
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" onClick={() => setIsPhaseModalOpen(false)} className="btn btn-secondary" style={{ padding: '8px 16px', background: '#e2e8f0', color: '#1e293b', border: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: JUSTIFICACIÓN OBLIGATORIA DE ALCANCE */}
      {isJustifyModalOpen && scopeChangeParams && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card" style={{ width: '480px', animation: 'scaleUp 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} />
                Control de Cambios de Alcance
              </h3>
              <button onClick={() => {
                setIsJustifyModalOpen(false);
                setScopeChangeParams(null);
              }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(245, 158, 11, 0.08)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.15)', color: '#b45309', fontSize: '0.82rem', marginBottom: '16px' }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Atención:</strong> Vas a cambiar el alcance de <strong>"{scopeChangeParams.itemName}"</strong> ({scopeChangeParams.itemType === 'EQUIPMENT' ? 'Equipo Clínico' : 'Analito'}). 
                {scopeChangeParams.itemType === 'EQUIPMENT' && ' Este cambio se aplicará en cascada a todos los analitos asociados que heredan su alcance.'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block' }}>Transición de Alcance:</span>
                <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>{scopeChangeParams.previousScopeName}</span>
                  <span>➡️</span>
                  <span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '4px' }}>
                    {scopeChangeParams.newScopeStatus === 'OUT_OF_SCOPE' ? 'Fuera de Alcance' : (releasePhases.find(p => p.id === scopeChangeParams.newScope)?.name || 'Sin Asignar')}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Motivo del Cambio:</label>
                <select
                  value={reasonCode}
                  onChange={e => setReasonCode(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.8rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="PMO_DECISION">Decisión de la PMO (Bupa Chile)</option>
                  <option value="TECHNICAL">Limitación / Criterio Técnico</option>
                  <option value="CONTRACTUAL">Hito Contractual o Comercial</option>
                  <option value="VENDOR_DELAY">Retraso del Proveedor (LIS / Instrumento)</option>
                  <option value="CLINICAL_REQUEST">Solicitud de Dirección Médica</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Justificación Detallada:</label>
                <textarea 
                  value={justification} 
                  onChange={e => setJustification(e.target.value)} 
                  placeholder="Describa el motivo técnico, comercial o de planificación por el cual se realiza este cambio de alcance..."
                  rows={4}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.8rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                type="button" 
                onClick={() => {
                  setIsJustifyModalOpen(false);
                  setScopeChangeParams(null);
                }} 
                style={{ padding: '8px 16px', background: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={async () => {
                  if (!justification.trim() || justification.trim().length < 5) {
                    alert("Debe ingresar una justificación válida de al menos 5 caracteres.");
                    return;
                  }
                  setSaveStatus('saving');
                  const res = await changeScope({
                    itemId: scopeChangeParams.itemId,
                    itemType: scopeChangeParams.itemType,
                    newScope: scopeChangeParams.newScope,
                    newScopeStatus: scopeChangeParams.newScopeStatus,
                    reasonCode,
                    justification: justification.trim(),
                    userEmail: 'agustin@bupa.cl' // Simulador de usuario PMO
                  });
                  if (res.success) {
                    setSaveStatus('saved');
                    setIsJustifyModalOpen(false);
                    setScopeChangeParams(null);
                    setTimeout(() => setSaveStatus('idle'), 1500);
                  } else {
                    alert(`Error al guardar: ${res.error}`);
                    setSaveStatus('idle');
                  }
                }} 
                style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Confirmar y Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: LÍNEA DE TIEMPO DE AUDITORÍA (HISTORIAL DE ALCANCE) */}
      {isTimelineModalOpen && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card" style={{ width: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} />
                Historial de Alcance
              </h3>
              <button onClick={() => setIsTimelineModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Historial de cambios para:</span>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>🔬 {timelineItemName}</div>
            </div>

            {/* Timeline scroll area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 8px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-light)', minHeight: '180px', maxHeight: '350px', overflowY: 'auto' }}>
              {timelineLogs.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 20px' }}>
                  No se registran cambios de alcance históricos en la bitácora de auditoría para este ítem.
                </div>
              ) : (
                timelineLogs.map((log, idx) => {
                  const dateFormatted = format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm');
                  const reasonMap: Record<string, string> = {
                    'PMO_DECISION': 'Decisión PMO',
                    'TECHNICAL': 'Criterio Técnico',
                    'CONTRACTUAL': 'Hito Contractual',
                    'VENDOR_DELAY': 'Retraso Proveedor',
                    'CLINICAL_REQUEST': 'Solicitud Médica'
                  };
                  const reasonLabel = reasonMap[log.reasonCode] || log.reasonCode;

                  return (
                    <div key={log.id} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                      {/* Línea vertical conectora */}
                      {idx !== timelineLogs.length - 1 && (
                        <div style={{ position: 'absolute', left: '7px', top: '16px', bottom: '-24px', width: '2px', background: 'var(--border-light)' }} />
                      )}

                      {/* Nodo del timeline */}
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#7c3aed', border: '3px solid white', flexShrink: 0, marginTop: '2px', boxShadow: '0 0 6px rgba(124,58,237,0.3)' }} />

                      {/* Caja de contenido */}
                      <div style={{ flex: 1, background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {log.previousScope} ➡️ {log.newScope}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{dateFormatted}</span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '6px', margin: '4px 0' }}>
                          <span style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed', padding: '1px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                            {reasonLabel}
                          </span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>
                            Por: {log.userEmail}
                          </span>
                        </div>

                        <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.2 }}>
                          "{log.justification}"
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" onClick={() => setIsTimelineModalOpen(false)} className="btn btn-secondary" style={{ padding: '8px 16px', background: '#e2e8f0', color: '#1e293b', border: 'none', cursor: 'pointer', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
