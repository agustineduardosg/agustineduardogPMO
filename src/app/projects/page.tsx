"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useProjectStore, Project } from '@/store/projectStore';
import { addBusinessDays } from '@/utils/dateUtils';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Plus, Search, Folder, ChevronRight, Edit2, Trash2, X, Save, Calendar, User, Building2, Tag, BarChart3, AlertCircle, CheckCircle2, Clock, PauseCircle, UploadCloud } from 'lucide-react';

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
  const allTasks = project.phases.flatMap(ph => ph.tasks);
  if (allTasks.length === 0) return 0;
  const total = allTasks.reduce((acc, t) => acc + t.progress, 0);
  return Math.round(total / allTasks.length);
};

const EmptyModal = ({ onClose, onSave }: { onClose: () => void; onSave: (p: Project) => void }) => {
  const [form, setForm] = useState({ name: '', manager: '', area: 'Tecnología', status: 'Planificación' as ProjectStatus, description: '', hasEquipment: false, startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(addBusinessDays(new Date(), 30), 'yyyy-MM-dd') });

  const handleSave = () => {
    if (!form.name.trim() || !form.manager.trim()) return;
    const [sy, sm, sd] = form.startDate.split('-').map(Number);
    const [ey, em, ed] = form.endDate.split('-').map(Number);
    const proj: Project = {
      id: `proj-${Date.now()}`, name: form.name, manager: form.manager, area: form.area,
      status: form.status, description: form.description, hasEquipment: form.hasEquipment,
      startDate: new Date(sy, sm-1, sd), endDate: new Date(ey, em-1, ed), phases: []
    };
    onSave(proj);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '560px', maxWidth: '95vw', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', animation: 'fadeIn 0.25s ease' }}>
        <div style={{ padding: '28px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Nuevo Proyecto</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.9rem' }}>Ingresa los datos del proyecto para el portafolio PMO</p>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
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

export default function ProjectsPage() {
  const projects = useProjectStore(state => state.projects);
  const addProject = useProjectStore(state => state.addProject);
  const updateProject = useProjectStore(state => state.updateProject);
  const deleteProject = useProjectStore(state => state.deleteProject);
  const setActiveProject = useProjectStore(state => state.setActiveProject);
  const fetchProjects = useProjectStore(state => state.fetchProjects);
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterArea, setFilterArea] = useState<string>('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

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

  const handleOpenProjectConsole = (project: Project) => {
    setActiveProject(project.id);
    router.push(`/projects/${project.id}`);
  };

  const handleSaveNew = (proj: Project) => {
    addProject(proj);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este proyecto y todos sus datos?')) deleteProject(id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Portafolio de Proyectos</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>Centro de mando PMO — {projects.length} proyecto{projects.length !== 1 ? 's' : ''} activo{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
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

      {/* Project Grid */}
      {filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--text-secondary)' }}>
          <Folder size={64} style={{ opacity: 0.2 }} />
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{projects.length === 0 ? 'No hay proyectos aún' : 'Sin resultados'}</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{projects.length === 0 ? 'Crea tu primer proyecto para comenzar.' : 'Intenta ajustar los filtros.'}</p>
          {projects.length === 0 && <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Crear Proyecto</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px', paddingBottom: '32px' }}>
          {filtered.map(project => {
            const progress = calcProjectProgress(project);
            const status = project.status || 'Planificación';
            const sc = STATUS_CONFIG[status as ProjectStatus] || STATUS_CONFIG['Planificación'];
            const areaColor = AREA_COLORS[project.area || ''] || '#0079C1';
            const daysLeft = differenceInDays(new Date(project.endDate), new Date());
            const taskCount = project.phases.flatMap(ph => ph.tasks).length;
            return (
              <div key={project.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden', cursor: 'default', transition: 'transform 0.2s, box-shadow 0.2s', display: 'flex', flexDirection: 'column' }} onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 20px 40px rgba(0,0,0,0.12)'; }} onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}>
                {/* Color bar */}
                <div style={{ height: '5px', background: `linear-gradient(90deg, ${areaColor}, ${areaColor}88)` }} />

                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.name}>{project.name}</h3>
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

                  {project.description && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {project.description}
                    </p>
                  )}

                  {/* Meta */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {project.manager && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <User size={13} style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>PM:</span>
                        <span>{project.manager}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <Calendar size={13} style={{ flexShrink: 0 }} />
                      <span>{format(new Date(project.startDate), 'dd MMM yyyy', { locale: es })} — {format(new Date(project.endDate), 'dd MMM yyyy', { locale: es })}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <span>{taskCount} tarea{taskCount !== 1 ? 's' : ''}</span>
                      <span style={{ color: daysLeft < 0 ? '#ef4444' : daysLeft < 7 ? '#f59e0b' : 'var(--text-muted)' }}>
                        {daysLeft < 0 ? `Venció hace ${Math.abs(daysLeft)} días` : daysLeft === 0 ? 'Vence hoy' : `${daysLeft} días restantes`}
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
                    <button className="icon-btn" title="Eliminar" onClick={() => handleDelete(project.id)} style={{ color: 'var(--accent-danger)' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <button className="btn btn-primary" onClick={() => handleOpenProjectConsole(project)} style={{ padding: '8px 16px', fontSize: '0.85rem', gap: '6px' }}>
                    Ver Consola <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <EmptyModal onClose={() => setShowModal(false)} onSave={handleSaveNew} />}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}} />
    </div>
  );
}
