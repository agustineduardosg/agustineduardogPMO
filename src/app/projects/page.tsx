"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useProjectStore, Project, ParentProject } from '@/store/projectStore';
import { addBusinessDays } from '@/utils/dateUtils';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, Folder, ChevronRight, ChevronDown, Edit2, Trash2, X, Save, 
  Calendar, User, FolderPlus, Loader2, UploadCloud, BarChart3, AlertCircle, 
  CheckCircle2, Clock, PauseCircle, Settings, LayoutGrid, Activity 
} from 'lucide-react';

type ProjectStatus = 'Planificación' | 'Ejecución' | 'Pausado' | 'Completado';

const AREAS = ['Tecnología', 'Operaciones', 'Salud Digital', 'Clínico', 'Administración', 'Finanzas', 'Marketing', 'Legal'];

const STATUS_CONFIG: Record<ProjectStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  'Planificación': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <Clock size={14} />, label: 'Planificación' },
  'Ejecución':     { color: '#0079C1', bg: 'rgba(0,121,193,0.1)',  icon: <BarChart3 size={14} />, label: 'En Ejecución' },
  'Pausado':       { color: '#6b7280', bg: 'rgba(107,114,128,0.1)',icon: <PauseCircle size={14} />, label: 'Pausado' },
  'Completado':    { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircle2 size={14} />, label: 'Completado' },
};

const AREA_COLORS: Record<string, string> = {
  'Tecnología': '#6366f1', 'Operaciones': '#f59e0b', 'Salud Digital': '#0079C1',
  'Clínico': '#10b981', 'Administración': '#8b5cf6', 'Finanzas': '#ef4444',
  'Marketing': '#ec4899', 'Legal': '#14b8a6',
};

const formatDateForInput = (d: any) => {
  if (!d) return '';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toISOString().split('T')[0];
};

const CircularProgress = ({ progress, size = 60, color = '#0079C1' }: { progress: number; size?: number; color?: string }) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-light)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fill: 'var(--text-primary)', fontSize: '11px', fontWeight: 700, transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {progress}%
      </text>
    </svg>
  );
};

const calcProjectProgress = (project: Project): number => {
  const rootTasks = project.phases.flatMap(ph => ph.tasks).filter(t => !t.parentId);
  if (rootTasks.length === 0) return 0;
  
  let totalWeightedProgress = 0;
  let totalDuration = 0;
  
  rootTasks.forEach(t => {
    totalDuration += t.duration;
    totalWeightedProgress += t.progress * t.duration;
  });
  
  return totalDuration > 0 ? Math.round(totalWeightedProgress / totalDuration) : 0;
};

// Modal de Creación
const EmptyModal = ({ onClose, onSave, parentProjects }: { onClose: () => void; onSave: (p: any) => void; parentProjects: ParentProject[] }) => {
  const [form, setForm] = useState({ 
    name: '', 
    manager: '', 
    sponsor: '',
    responsible: '',
    area: 'Tecnología', 
    status: 'Planificación' as ProjectStatus, 
    description: '', 
    hasEquipment: false, 
    startDate: format(new Date(), 'yyyy-MM-dd'), 
    endDate: format(addBusinessDays(new Date(), 30), 'yyyy-MM-dd'),
    parentProjectId: '',
    type: 'Proyecto Estratégico',
    methodology: 'Tradicional',
    pmo: '',
    jiraId: '',
    goLiveDate: format(addBusinessDays(new Date(), 30), 'yyyy-MM-dd'),
    cutoffDate: format(new Date(), 'yyyy-MM-dd')
  });

  const handleSave = () => {
    if (!form.name.trim() || !form.manager.trim()) return;
    const [sy, sm, sd] = form.startDate.split('-').map(Number);
    const [ey, em, ed] = form.endDate.split('-').map(Number);
    const [gy, gm, gd] = form.goLiveDate.split('-').map(Number);
    const [cy, cm, cd] = form.cutoffDate.split('-').map(Number);
    const proj = {
      id: `proj-${Date.now()}`, 
      name: form.name, 
      manager: form.manager, 
      sponsor: form.sponsor,
      responsible: form.responsible,
      area: form.area,
      status: form.status, 
      description: form.description, 
      hasEquipment: form.hasEquipment,
      startDate: new Date(sy, sm-1, sd), 
      endDate: new Date(ey, em-1, ed), 
      phases: [],
      parentProjectId: form.parentProjectId || null,
      type: form.type,
      methodology: form.methodology,
      pmo: form.pmo,
      jiraId: form.jiraId,
      goLiveDate: form.goLiveDate ? new Date(gy, gm-1, gd) : null,
      cutoffDate: form.cutoffDate ? new Date(cy, cm-1, cd) : null
    };
    onSave(proj);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '560px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', animation: 'fadeIn 0.25s ease' }}>
        <div style={{ padding: '28px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Nuevo Proyecto</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.9rem' }}>Ingresa los datos del proyecto para el portafolio PMO</p>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto', flex: 1 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Nombre del Proyecto *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Implementación ERP Clínico"
              style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', fontSize: '1rem', fontWeight: 600 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Responsable (PM) *</label>
              <input type="text" value={form.manager} onChange={e => setForm({...form, manager: e.target.value})} placeholder="Nombre del PM"
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Área / Departamento</label>
              <select value={form.area} onChange={e => setForm({...form, area: e.target.value})}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
                {AREAS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Sponsor del Proyecto</label>
              <input type="text" value={form.sponsor} onChange={e => setForm({...form, sponsor: e.target.value})} placeholder="Sponsor del Proyecto"
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Responsable(s) Clínico/Operativo</label>
              <input type="text" value={form.responsible} onChange={e => setForm({...form, responsible: e.target.value})} placeholder="Otros responsables / Co-PM"
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Estado Inicial</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value as ProjectStatus})}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
                {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Fecha Inicio</label>
              <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Fecha Término</label>
              <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
          </div>

          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0079C1', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '12px' }}>
              📊 Datos Complementarios (Estándar Bupa Chile)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Tipo de Proyecto</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
                  <option value="Proyecto Estratégico">Proyecto Estratégico</option>
                  <option value="Proyecto SCL">Proyecto SCL</option>
                  <option value="Inversión">Inversión</option>
                  <option value="Operaciones">Operaciones</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Metodología</label>
                <select value={form.methodology} onChange={e => setForm({...form, methodology: e.target.value})}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
                  <option value="Tradicional">Tradicional</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Ágil">Ágil</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>PMO / Scrum Master</label>
                <input type="text" value={form.pmo} onChange={e => setForm({...form, pmo: e.target.value})} placeholder="Catalina Pacheco"
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Jira / ID</label>
                <input type="text" value={form.jiraId} onChange={e => setForm({...form, jiraId: e.target.value})} placeholder="PRSCL-62"
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Fecha Go-Live</label>
                <input type="date" value={form.goLiveDate} onChange={e => setForm({...form, goLiveDate: e.target.value})}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Última Actualización</label>
                <input type="date" value={form.cutoffDate} onChange={e => setForm({...form, cutoffDate: e.target.value})}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Proyecto Padre / Agrupador</label>
            <select value={form.parentProjectId} onChange={e => setForm({...form, parentProjectId: e.target.value})}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
              <option value="">-- Proyecto Independiente / Sin Agrupar --</option>
              {parentProjects.map(pp => (
                <option key={pp.id} value={pp.id}>{pp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Descripción (Opcional)</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
              placeholder="Breve descripción del alcance del proyecto..."
              style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,121,193,0.05)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(0,121,193,0.3)' }}>
            <input type="checkbox" id="hasEquipment" checked={form.hasEquipment} onChange={e => setForm({...form, hasEquipment: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0079C1' }} />
            <label htmlFor="hasEquipment" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🩺 ¿Gestiona Equipamiento Clínico en este Proyecto?
            </label>
          </div>
        </div>

        <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim() || !form.manager.trim()}>
            <Save size={16} /> Crear Proyecto
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal de Edición
const EditModal = ({ project, onClose, onSave, parentProjects }: { project: Project; onClose: () => void; onSave: (id: string, updates: any) => void; parentProjects: ParentProject[] }) => {
  const [form, setForm] = useState({ 
    name: project.name, 
    manager: project.manager || '', 
    sponsor: project.sponsor || '', 
    responsible: project.responsible || '', 
    area: project.area || 'Tecnología', 
    status: (project.status || 'Planificación') as ProjectStatus, 
    description: project.description || '', 
    hasEquipment: project.hasEquipment || false, 
    startDate: formatDateForInput(project.startDate), 
    endDate: formatDateForInput(project.endDate),
    parentProjectId: project.parentProjectId || '',
    type: project.type || 'Proyecto Estratégico',
    methodology: project.methodology || 'Tradicional',
    pmo: project.pmo || '',
    jiraId: project.jiraId || '',
    goLiveDate: formatDateForInput(project.goLiveDate) || formatDateForInput(project.endDate),
    cutoffDate: formatDateForInput(project.cutoffDate) || formatDateForInput(new Date())
  });

  const handleSave = () => {
    if (!form.name.trim() || !form.manager.trim()) return;
    const [sy, sm, sd] = form.startDate.split('-').map(Number);
    const [ey, em, ed] = form.endDate.split('-').map(Number);
    const [gy, gm, gd] = form.goLiveDate.split('-').map(Number);
    const [cy, cm, cd] = form.cutoffDate.split('-').map(Number);
    const updates = {
      name: form.name, 
      manager: form.manager, 
      sponsor: form.sponsor,
      responsible: form.responsible,
      area: form.area,
      status: form.status, 
      description: form.description, 
      hasEquipment: form.hasEquipment,
      startDate: new Date(sy, sm-1, sd), 
      endDate: new Date(ey, em-1, ed),
      parentProjectId: form.parentProjectId || null,
      type: form.type,
      methodology: form.methodology,
      pmo: form.pmo,
      jiraId: form.jiraId,
      goLiveDate: form.goLiveDate ? new Date(gy, gm-1, gd) : null,
      cutoffDate: form.cutoffDate ? new Date(cy, cm-1, cd) : null
    };
    onSave(project.id, updates);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '560px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', animation: 'fadeIn 0.25s ease' }}>
        <div style={{ padding: '28px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Editar Configuración</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.9rem' }}>Actualiza los parámetros generales del proyecto</p>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto', flex: 1 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Nombre del Proyecto *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', fontSize: '1rem', fontWeight: 600 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Responsable (PM) *</label>
              <input type="text" value={form.manager} onChange={e => setForm({...form, manager: e.target.value})}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Área / Departamento</label>
              <select value={form.area} onChange={e => setForm({...form, area: e.target.value})}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
                {AREAS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Sponsor del Proyecto</label>
              <input type="text" value={form.sponsor} onChange={e => setForm({...form, sponsor: e.target.value})} placeholder="Sponsor del Proyecto"
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Responsable(s) Clínico/Operativo</label>
              <input type="text" value={form.responsible} onChange={e => setForm({...form, responsible: e.target.value})} placeholder="Otros responsables / Co-PM"
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Estado</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value as ProjectStatus})}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
                {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Fecha Inicio</label>
              <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Fecha Término</label>
              <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
          </div>

          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0079C1', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '12px' }}>
              📊 Datos Complementarios (Estándar Bupa Chile)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Tipo de Proyecto</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
                  <option value="Proyecto Estratégico">Proyecto Estratégico</option>
                  <option value="Proyecto SCL">Proyecto SCL</option>
                  <option value="Inversión">Inversión</option>
                  <option value="Operaciones">Operaciones</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Metodología</label>
                <select value={form.methodology} onChange={e => setForm({...form, methodology: e.target.value})}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
                  <option value="Tradicional">Tradicional</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Ágil">Ágil</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>PMO / Scrum Master</label>
                <input type="text" value={form.pmo} onChange={e => setForm({...form, pmo: e.target.value})} placeholder="Catalina Pacheco"
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Jira / ID</label>
                <input type="text" value={form.jiraId} onChange={e => setForm({...form, jiraId: e.target.value})} placeholder="PRSCL-62"
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Fecha Go-Live</label>
                <input type="date" value={form.goLiveDate} onChange={e => setForm({...form, goLiveDate: e.target.value})}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Última Actualización</label>
                <input type="date" value={form.cutoffDate} onChange={e => setForm({...form, cutoffDate: e.target.value})}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Proyecto Padre / Agrupador</label>
            <select value={form.parentProjectId} onChange={e => setForm({...form, parentProjectId: e.target.value})}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
              <option value="">-- Proyecto Independiente / Sin Agrupar --</option>
              {parentProjects.map(pp => (
                <option key={pp.id} value={pp.id}>{pp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Descripción</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
              style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,121,193,0.05)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(0,121,193,0.3)' }}>
            <input type="checkbox" id="editHasEquipment" checked={form.hasEquipment} onChange={e => setForm({...form, hasEquipment: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0079C1' }} />
            <label htmlFor="editHasEquipment" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🩺 ¿Gestiona Equipamiento Clínico en este Proyecto?
            </label>
          </div>
        </div>

        <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} /> Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal Administrador de Agrupadores
const ParentProjectsModal = ({ 
  onClose, 
  parentProjects, 
  onAdd, 
  onUpdate, 
  onDelete 
}: { 
  onClose: () => void; 
  parentProjects: ParentProject[];
  onAdd: (name: string, description?: string) => Promise<void>;
  onUpdate: (id: string, name: string, description?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
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

  const handleStartEdit = (pp: ParentProject) => {
    setEditingId(pp.id);
    setEditingName(pp.name);
    setEditingDesc(pp.description || '');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    await onUpdate(id, editingName.trim(), editingDesc.trim());
    setEditingId(null);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '600px', maxWidth: '95vw', maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', animation: 'scaleUp 0.2s ease' }}>
        
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#003B64', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderPlus size={20} color="#0079C1" />
              Gestión de Agrupadores de Proyectos
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.85rem' }}>Crea carpetas maestras (Programas) para agrupar tus cronogramas clínicos</p>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Form Nuevo */}
          <form onSubmit={handleCreate} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>+ Crear Agrupador Principal</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input 
                type="text" 
                placeholder="Nombre del Agrupador (ej: Proyecto de Calidad)" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                style={{ padding: '8px 12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.88rem', outline: 'none' }}
                required
              />
              <input 
                type="text" 
                placeholder="Descripción corta (ej: Implementación de automatización LIS)" 
                value={newDesc} 
                onChange={e => setNewDesc(e.target.value)}
                style={{ padding: '8px 12px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '8px 16px', fontSize: '0.82rem' }}>
              Crear Agrupador
            </button>
          </form>

          {/* Listado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              Agrupadores Creados ({parentProjects.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {parentProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic' }}>
                  No hay agrupadores creados. Los proyectos se muestran de forma independiente.
                </div>
              ) : (
                parentProjects.map(pp => (
                  <div key={pp.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 16px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    {editingId === pp.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <input 
                          type="text" 
                          value={editingName} 
                          onChange={e => setEditingName(e.target.value)}
                          style={{ padding: '6px 10px', border: '1px solid var(--accent-primary)', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}
                          required
                        />
                        <input 
                          type="text" 
                          value={editingDesc} 
                          onChange={e => setEditingDesc(e.target.value)}
                          style={{ padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', fontSize: '0.8rem' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                          <button type="button" onClick={() => setEditingId(null)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Cancelar</button>
                          <button type="button" onClick={() => handleSaveEdit(pp.id)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Guardar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#003B64', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📁 {pp.name}
                          </div>
                          {pp.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{pp.description}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleStartEdit(pp)} className="icon-btn" title="Editar Nombre" style={{ color: 'var(--text-secondary)' }}>
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => {
                            if (confirm(`¿Está seguro de eliminar el agrupador "${pp.name}"? Los proyectos asociados quedarán huérfanos pero no se eliminarán.`)) {
                              onDelete(pp.id);
                            }
                          }} className="icon-btn" title="Eliminar" style={{ color: 'var(--accent-danger)' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ padding: '8px 20px' }}>Listo</button>
        </div>
      </div>
    </div>
  );
};

export default function ProjectsPage() {
  const projects = useProjectStore(state => state.projects);
  const parentProjects = useProjectStore(state => state.parentProjects);
  const addProject = useProjectStore(state => state.addProject);
  const updateProject = useProjectStore(state => state.updateProject);
  const deleteProject = useProjectStore(state => state.deleteProject);
  const setActiveProject = useProjectStore(state => state.setActiveProject);
  const fetchProjects = useProjectStore(state => state.fetchProjects);
  const fetchParentProjects = useProjectStore(state => state.fetchParentProjects);
  const addParentProject = useProjectStore(state => state.addParentProject);
  const updateParentProject = useProjectStore(state => state.updateParentProject);
  const deleteParentProject = useProjectStore(state => state.deleteParentProject);
  
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
    fetchParentProjects();
  }, []);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterArea, setFilterArea] = useState<string>('Todos');
  
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showParentManager, setShowParentManager] = useState(false);

  // Control colapsables de grupos
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const allAreas = useMemo(() => ['Todos', ...Array.from(new Set(projects.map(p => p.area).filter(Boolean) as string[]))], [projects]);
  const allStatuses = ['Todos', ...Object.keys(STATUS_CONFIG)];

  const filtered = useMemo(() => projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.manager || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'Todos' || p.status === filterStatus;
    const matchArea = filterArea === 'Todos' || p.area === filterArea;
    return matchSearch && matchStatus && matchArea;
  }), [projects, search, filterStatus, filterArea]);

  const stats = useMemo(() => ({
    total: projects.length,
    enEjecucion: projects.filter(p => p.status === 'Ejecución').length,
    completados: projects.filter(p => p.status === 'Completado').length,
    enRiesgo: projects.filter(p => calcProjectProgress(p) < 30 && p.status === 'Ejecución').length,
  }), [projects]);

  // Agrupamiento por Proyecto Padre
  const groupedProjects = useMemo(() => {
    const groups: Record<string, { parent: ParentProject | null; projects: Project[] }> = {};
    
    // Inicializar agrupadores
    parentProjects.forEach(pp => {
      groups[pp.id] = { parent: pp, projects: [] };
    });
    
    // Clave especial para independientes
    groups['independent'] = { parent: null, projects: [] };
    
    filtered.forEach(p => {
      if (p.parentProjectId && groups[p.parentProjectId]) {
        groups[p.parentProjectId].projects.push(p);
      } else {
        groups['independent'].projects.push(p);
      }
    });

    return groups;
  }, [parentProjects, filtered]);

  const handleOpenProjectConsole = (project: Project) => {
    setActiveProject(project.id);
    router.push(`/projects/${project.id}`);
  };

  const handleSaveNew = (proj: Project) => {
    addProject(proj);
    setShowModal(false);
  };

  const handleSaveEdit = (id: string, updates: any) => {
    updateProject(id, updates);
    setEditingProject(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este proyecto y todos sus datos?')) deleteProject(id);
  };

  // Calcular el progreso ponderado de un grupo
  const getGroupProgress = (subProjects: Project[]): number => {
    if (subProjects.length === 0) return 0;
    const totalProgress = subProjects.reduce((sum, p) => sum + calcProjectProgress(p), 0);
    return Math.round(totalProgress / subProjects.length);
  };

  const renderProjectCard = (project: Project) => {
    const progress = calcProjectProgress(project);
    const status = project.status || 'Planificación';
    const sc = STATUS_CONFIG[status as ProjectStatus] || STATUS_CONFIG['Planificación'];
    const areaColor = AREA_COLORS[project.area || ''] || '#0079C1';
    const daysLeft = differenceInDays(new Date(project.endDate), new Date());
    const taskCount = project.phases.flatMap(ph => ph.tasks).length;

    return (
      <div 
        key={project.id} 
        className="glass-panel" 
        style={{ 
          padding: 0, 
          overflow: 'hidden', 
          cursor: 'default', 
          transition: 'transform 0.2s, box-shadow 0.2s', 
          display: 'flex', 
          flexDirection: 'column' 
        }} 
        onMouseEnter={e => { 
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; 
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 20px 40px rgba(0,0,0,0.12)'; 
        }} 
        onMouseLeave={e => { 
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; 
          (e.currentTarget as HTMLDivElement).style.boxShadow = ''; 
        }}
      >
        {/* Color bar */}
        <div style={{ height: '5px', background: `linear-gradient(90deg, ${areaColor}, ${areaColor}88)` }} />

        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.6em' }} title={project.name}>{project.name}</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: sc.bg, color: sc.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {sc.icon} {sc.label}
                </span>
                {project.area && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: `${areaColor}15`, color: areaColor }}>
                    {project.area}
                  </span>
                )}
                {project.hasEquipment && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🩺 Equipamiento
                  </span>
                )}
              </div>
            </div>
            <CircularProgress progress={progress} size={58} color={areaColor} />
          </div>

          <p style={{ 
            fontSize: '0.82rem', 
            color: project.description ? 'var(--text-secondary)' : 'var(--text-muted)', 
            margin: 0, 
            lineHeight: 1.5, 
            display: '-webkit-box', 
            WebkitLineClamp: 2, 
            WebkitBoxOrient: 'vertical', 
            overflow: 'hidden',
            minHeight: '2.9em',
            fontStyle: project.description ? 'normal' : 'italic'
          }}>
            {project.description || 'Sin descripción detallada registrada para este proyecto clínico.'}
          </p>

          {/* Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <User size={13} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>PM:</span>
              <span>{project.manager || 'No asignado'}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <Activity size={13} style={{ flexShrink: 0, color: '#0284c7' }} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Go-Live:</span>
              <span style={{ fontWeight: project.goLiveDate ? 700 : 'normal', color: project.goLiveDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {project.goLiveDate ? format(new Date(project.goLiveDate), 'dd MMM yyyy', { locale: es }) : 'No programada'}
              </span>
            </div>

            {project.sponsor && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <User size={13} style={{ flexShrink: 0, color: '#0d9488' }} />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Sponsor:</span>
                <span>{project.sponsor}</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <Calendar size={13} style={{ flexShrink: 0 }} />
              <span>{format(new Date(project.startDate), 'dd MMM yyyy', { locale: es })} — {format(new Date(project.endDate), 'dd MMM yyyy', { locale: es })}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <span>{taskCount} tarea{taskCount !== 1 ? 's' : ''}</span>
              <span style={{ color: (progress === 100 || status === 'Completado') ? '#10b981' : daysLeft < 0 ? '#ef4444' : daysLeft < 7 ? '#f59e0b' : 'var(--text-muted)' }}>
                {(progress === 100 || status === 'Completado') ? 'Finalizado' : daysLeft < 0 ? `Venció hace ${Math.abs(daysLeft)} días` : daysLeft === 0 ? 'Vence hoy' : `${daysLeft} días restantes`}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <span>Progreso general</span><span style={{ fontWeight: 700, color: areaColor }}>{progress}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${areaColor}, ${areaColor}aa)`, borderRadius: '99px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="icon-btn" title="Configurar / Editar" onClick={() => setEditingProject(project)} style={{ color: 'var(--text-secondary)' }}>
              <Settings size={15} />
            </button>
            <button className="icon-btn" title="Eliminar" onClick={() => handleDelete(project.id)} style={{ color: 'var(--accent-danger)' }}>
              <Trash2 size={15} />
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => handleOpenProjectConsole(project)} style={{ padding: '8px 16px', fontSize: '0.85rem', gap: '6px' }}>
            Ver Proyecto <ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 800 }}>Portafolio de Proyectos</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>Centro de mando PMO — {projects.length} proyecto{projects.length !== 1 ? 's' : ''} en portafolio</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary shadow-sm" 
            onClick={() => setShowParentManager(true)}
            style={{ 
              gap: '8px', 
              border: '1px solid var(--border-strong)', 
              background: 'var(--bg-secondary)', 
              color: 'var(--text-primary)',
              fontWeight: 700
            }}
          >
            <FolderPlus size={18} color="#0079C1" /> Gestionar Agrupadores
          </button>
          <button 
            className="btn btn-secondary shadow-sm" 
            onClick={() => router.push('/import?type=gantt')} 
            style={{ 
              gap: '8px', 
              border: '1px dashed var(--accent-primary)', 
              background: 'rgba(0, 121, 193, 0.05)', 
              color: 'var(--accent-primary)',
              fontWeight: 700
            }}
          >
            <UploadCloud size={18} /> Importar Cronograma
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ gap: '8px' }}>
            <Plus size={18} /> Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {[
          { label: 'Total Proyectos', value: stats.total, color: '#0079C1', icon: <Folder size={22} /> },
          { label: 'En Ejecución', value: stats.enEjecucion, color: '#6366f1', icon: <BarChart3 size={22} /> },
          { label: 'Completados', value: stats.completados, color: '#10b981', icon: <CheckCircle2 size={22} /> },
          { label: 'En Riesgo', value: stats.enRiesgo, color: '#ef4444', icon: <AlertCircle size={22} /> },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color, flexShrink: 0 }}>
              {kpi.icon}
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Buscar proyecto o responsable..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 42px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
          {allStatuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
          style={{ padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
          {allAreas.map(a => <option key={a}>{a}</option>)}
        </select>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Matriz Agrupada de Proyectos */}
      {filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-secondary)', padding: '60px 0' }}>
          <Folder size={64} style={{ opacity: 0.2 }} />
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{projects.length === 0 ? 'No hay proyectos aún' : 'Sin resultados'}</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{projects.length === 0 ? 'Crea tu primer proyecto para comenzar.' : 'Intenta ajustar los filtros.'}</p>
          {projects.length === 0 && <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Crear Proyecto</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '48px' }}>
          
          {/* 1. Renderizar agrupadores (ParentProjects) */}
          {parentProjects.map(pp => {
            const groupData = groupedProjects[pp.id];
            const subProjects = groupData?.projects || [];
            const isCollapsed = !!collapsedGroups[pp.id];
            const groupProgress = getGroupProgress(subProjects);
            
            // Si el filtro de búsqueda/estado vacía la lista de un agrupador, podemos ocultarlo o dejarlo como vacío
            if (subProjects.length === 0 && (search || filterStatus !== 'Todos' || filterArea !== 'Todos')) return null;

            return (
              <div 
                key={pp.id} 
                className="group-container" 
                style={{ 
                  background: 'rgba(248, 250, 252, 0.6)', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: '12px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Cabecera del Agrupador */}
                <div 
                  onClick={() => toggleGroup(pp.id)}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      background: 'rgba(0, 121, 193, 0.08)', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'var(--accent-primary)' 
                    }}>
                      <Folder size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#003B64' }}>{pp.name}</span>
                        <span style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 700, 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          background: 'rgba(0,75,135,0.08)', 
                          color: '#004B87' 
                        }}>
                          {subProjects.length} Proyecto{subProjects.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {pp.description && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{pp.description}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    {subProjects.length > 0 && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Presupuesto Consolidado</span>
                          <span style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                            ${subProjects.reduce((sum, p) => sum + (p.budget || 0), 0).toLocaleString('es-CL')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Avance Consolidado</span>
                          <div style={{ width: '120px', height: '8px', background: 'var(--border-light)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${groupProgress}%`, background: 'linear-gradient(90deg, #0079C1, #00B2E3)', borderRadius: '99px' }} />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-primary)', minWidth: '32px' }}>{groupProgress}%</span>
                        </div>
                      </>
                    )}
                    <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                      {isCollapsed ? <ChevronRight size={22} /> : <ChevronDown size={22} />}
                    </button>
                  </div>
                </div>

                {/* Sub-proyectos del agrupador */}
                {!isCollapsed && (
                  <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    {subProjects.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border-light)', borderRadius: '8px', background: 'white' }}>
                        No hay proyectos asociados a este agrupador. Puedes arrastrar o editar un proyecto para asociarlo.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                        {subProjects.map(p => renderProjectCard(p))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. Proyectos Independientes / Sin Agrupar */}
          {(() => {
            const independentData = groupedProjects['independent'];
            const subProjects = independentData?.projects || [];
            const isCollapsed = !!collapsedGroups['independent'];
            if (subProjects.length === 0) return null;

            return (
              <div 
                className="group-container" 
                style={{ 
                  background: 'rgba(241, 245, 249, 0.4)', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: '12px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div 
                  onClick={() => toggleGroup('independent')}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      background: 'rgba(100, 116, 139, 0.08)', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#64748b' 
                    }}>
                      <LayoutGrid size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#334155' }}>Proyectos Independientes</span>
                        <span style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 700, 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          background: 'rgba(100,116,139,0.08)', 
                          color: '#475569' 
                        }}>
                          {subProjects.length} Proyecto{subProjects.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cronogramas independientes no vinculados a programas</span>
                    </div>
                  </div>
                  <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                    {isCollapsed ? <ChevronRight size={22} /> : <ChevronDown size={22} />}
                  </button>
                </div>

                {!isCollapsed && (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
                    gap: '20px', 
                    animation: 'fadeIn 0.2s ease' 
                  }}>
                    {subProjects.map(p => renderProjectCard(p))}
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      )}

      {/* Modales */}
      {showModal && (
        <EmptyModal 
          onClose={() => setShowModal(false)} 
          onSave={handleSaveNew} 
          parentProjects={parentProjects} 
        />
      )}

      {editingProject && (
        <EditModal 
          project={editingProject} 
          onClose={() => setEditingProject(null)} 
          onSave={handleSaveEdit} 
          parentProjects={parentProjects} 
        />
      )}

      {showParentManager && (
        <ParentProjectsModal 
          onClose={() => {
            setShowParentManager(false);
            fetchProjects(); // Recargar proyectos por si cambiaron relaciones
          }}
          parentProjects={parentProjects}
          onAdd={addParentProject}
          onUpdate={updateParentProject}
          onDelete={deleteParentProject}
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}} />
    </div>
  );
}
