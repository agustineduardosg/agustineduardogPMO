"use client";

import React, { useMemo, useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  useProjectStore, 
  Project, 
  Task, 
  Phase, 
  TaskStatus, 
  TaskPriority 
} from '@/store/projectStore';
import { useStakeholderStore, Stakeholder } from '@/store/stakeholderStore';
import { useIncidentStore, Incident, IncidentImpact, IncidentStatus } from '@/store/incidentStore';
import { useUserStore } from '@/store/userStore';
import { useEquipmentStore, ClinicalEquipment, EquipmentPhaseStatus } from '@/store/equipmentStore';
import { 
  format, 
  differenceInDays, 
  addDays, 
  eachDayOfInterval, 
  startOfWeek, 
  addWeeks, 
  startOfMonth, 
  addMonths, 
  isToday 
} from 'date-fns';
import { es } from 'date-fns/locale';
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
  ChevronRight,
  ArrowLeft,
  Edit2,
  Save,
  Calendar,
  User,
  Building2,
  Tag,
  BarChart3,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PauseCircle,
  GripVertical,
  Activity,
  Heart,
  TrendingUp,
  Flame,
  CheckSquare,
  HelpCircle,
  Loader2,
  Check
} from 'lucide-react';
import { addBusinessDays, differenceInBusinessDays } from '@/utils/dateUtils';
import { InlineInput, InlineTextarea } from '@/components/InlineInput';
import ReportViewer from '@/components/ReportViewer';


type ViewMode = 'day' | 'week' | 'month';
type TabType = 'dashboard' | 'gantt' | 'stakeholders' | 'incidents' | 'equipments';

const PHASE_STATUSES: EquipmentPhaseStatus[] = ['No iniciado', 'En progreso', 'Completado', 'Descartado', 'Desestimado'];

const EQUIP_STATUS_STYLE: Record<EquipmentPhaseStatus, { bg: string; color: string; border: string }> = {
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
  const style = EQUIP_STATUS_STYLE[value as EquipmentPhaseStatus] || { bg: 'rgba(0, 121, 193, 0.08)', color: '#0079C1', border: 'rgba(0, 121, 193, 0.15)' };

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
        <option key={status} value={status} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          {status}
        </option>
      ))}
      {customStatuses.map(status => (
        <option key={status} value={status} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          {status}
        </option>
      ))}
      {!isStandard && !isCustomOption && value && (
        <option value={value} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          {value}
        </option>
      )}
      <option value="__custom__" style={{ background: 'var(--bg-secondary)', color: '#004B87', fontWeight: 'bold' }}>
        ➕ Otro...
      </option>
    </select>
  );
};

// Styles for circular progress ring
const CircularProgressRing = ({ progress, size = 120, strokeWidth = 10, color = '#0079C1' }: { progress: number; size?: number; strokeWidth?: number; color?: string }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fill: 'var(--text-primary)', fontSize: '18px', fontWeight: 800, transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {progress}%
      </text>
    </svg>
  );
};

// Status config for tasks
const StatusBadge = ({ status }: { status: TaskStatus }) => {
  const colors = {
    'Not Started': { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', label: 'Sin Iniciar' },
    'In Progress': { bg: 'rgba(2, 132, 199, 0.1)', color: 'var(--accent-primary)', label: 'En Progreso' },
    'Completed': { bg: 'rgba(13, 148, 136, 0.1)', color: 'var(--accent-success)', label: 'Completada' },
    'At Risk': { bg: 'rgba(225, 29, 72, 0.1)', color: 'var(--accent-danger)', label: 'En Riesgo' },
  };
  const c = colors[status] || colors['Not Started'];
  return (
    <span style={{ background: c.bg, color: c.color, padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap', border: `1px solid ${c.color}30` }}>
      {c.label}
    </span>
  );
};

// Impact and Status config for Stakeholders & Incidents
const IMPACT_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  'Crítico': { bg: 'rgba(225, 29, 72, 0.1)', color: '#e11d48', border: 'rgba(225, 29, 72, 0.2)' },
  'Alto': { bg: 'rgba(225, 29, 72, 0.1)', color: '#e11d48', border: 'rgba(225, 29, 72, 0.2)' },
  'Medio': { bg: 'rgba(245, 158, 11, 0.1)', color: '#b45309', border: 'rgba(245, 158, 11, 0.2)' },
  'Bajo': { bg: 'rgba(3, 105, 161, 0.1)', color: '#0369a1', border: 'rgba(3, 105, 161, 0.2)' }
};

const INCIDENT_STATUS_STYLE: Record<IncidentStatus, { bg: string; color: string; border: string }> = {
  'Abierto': { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748b', border: 'rgba(100, 116, 139, 0.2)' },
  'En proceso': { bg: 'rgba(245, 158, 11, 0.1)', color: '#b45309', border: 'rgba(245, 158, 11, 0.2)' },
  'Cerrado': { bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: 'rgba(13, 148, 136, 0.2)' }
};

const PROJECT_STATUS_CONFIG = {
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

export default function ProjectConsolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Zustand atomic selectors for optimized rendering
  const projects = useProjectStore(state => state.projects);
  const updateProject = useProjectStore(state => state.updateProject);
  const updateTask = useProjectStore(state => state.updateTask);
  const deleteTask = useProjectStore(state => state.deleteTask);
  const addTask = useProjectStore(state => state.addTask);
  const addPhase = useProjectStore(state => state.addPhase);
  const updatePhase = useProjectStore(state => state.updatePhase);
  const deletePhase = useProjectStore(state => state.deletePhase);
  const fetchProjects = useProjectStore(state => state.fetchProjects);
  const setActiveProject = useProjectStore(state => state.setActiveProject);
  const isProjectLoading = useProjectStore(state => state.isLoading);

  const stakeholders = useStakeholderStore(state => state.stakeholders);
  const addStakeholder = useStakeholderStore(state => state.addStakeholder);
  const updateStakeholder = useStakeholderStore(state => state.updateStakeholder);
  const deleteStakeholder = useStakeholderStore(state => state.deleteStakeholder);
  const fetchStakeholders = useStakeholderStore(state => state.fetchStakeholders);
  const isStakeholderLoading = useStakeholderStore(state => state.isLoading);

  const incidents = useIncidentStore(state => state.incidents);
  const addIncident = useIncidentStore(state => state.addIncident);
  const updateIncident = useIncidentStore(state => state.updateIncident);
  const deleteIncident = useIncidentStore(state => state.deleteIncident);
  const fetchIncidents = useIncidentStore(state => state.fetchIncidents);
  const isIncidentLoading = useIncidentStore(state => state.isLoading);

  const users = useUserStore(state => state.users);
  const fetchUsers = useUserStore(state => state.fetchUsers);

  const recintos = useEquipmentStore(state => state.recintos);
  const equipments = useEquipmentStore(state => state.equipments);
  const addEquipment = useEquipmentStore(state => state.addEquipment);
  const updateEquipment = useEquipmentStore(state => state.updateEquipment);
  const deleteEquipment = useEquipmentStore(state => state.deleteEquipment);
  const fetchEquipmentData = useEquipmentStore(state => state.fetchEquipmentData);

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

  const handleUpdateIncident = async (incId: string, updates: any) => {
    setSaveStatus('saving');
    try {
      await updateIncident(incId, updates);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (e) {
      console.error(e);
      setSaveStatus('idle');
    }
  };

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

  // Fetch initial data
  useEffect(() => {
    const loadAllData = () => {
      fetchProjects();
      fetchStakeholders();
      fetchIncidents();
      fetchUsers();
      fetchEquipmentData();
    };

    loadAllData();

    // Sincronización proactiva multidispositivo (Sondeo activo cada 15 segundos si la pestaña está activa)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAllData();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Set active project context
  useEffect(() => {
    setActiveProject(id);
  }, [id, setActiveProject]);

  const project = useMemo(() => projects.find(p => p.id === id), [projects, id]);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Gantt Tab State
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [editingTask, setEditingTask] = useState<{task: Task, phaseId: string, isNew: boolean} | null>(null);
  const [editingPhase, setEditingPhase] = useState<{phase: Phase, isNew: boolean} | null>(null);
  const [draggedTask, setDraggedTask] = useState<{ id: string, startOffsetDays: number } | null>(null);
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Stakeholders Tab State
  const [searchTermStakeholders, setSearchTermStakeholders] = useState('');
  const [customColsStakeholders, setCustomColsStakeholders] = useState<string[]>([]);
  const [newColStakeholder, setNewColStakeholder] = useState('');
  const [isAddingColStakeholder, setIsAddingColStakeholder] = useState(false);
  const [editingColIdx, setEditingColIdx] = useState<number | null>(null);
  const [editingColNameText, setEditingColNameText] = useState('');

  // Incidents Tab State
  const [searchTermIncidents, setSearchTermIncidents] = useState('');
  const [filterImpactIncidents, setFilterImpactIncidents] = useState<string>('all');
  const [filterStatusIncidents, setFilterStatusIncidents] = useState<string>('all');
  const [customColsIncidents, setCustomColsIncidents] = useState<string[]>([]);
  const [newColIncident, setNewColIncident] = useState('');
  const [isAddingColIncident, setIsAddingColIncident] = useState(false);

  // Equipments State
  const [searchTermEquipments, setSearchTermEquipments] = useState('');
  const [customColsEquipments, setCustomColsEquipments] = useState<string[]>([]);
  const [newColEquipment, setNewColEquipment] = useState('');
  const [isAddingColEquipment, setIsAddingColEquipment] = useState(false);
  const [collapsedRecintos, setCollapsedRecintos] = useState<Record<string, boolean>>({});

  // Modales & Reportability State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);

  // Project Edit Form State
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [editProjectManager, setEditProjectManager] = useState('');
  const [editProjectArea, setEditProjectArea] = useState('');
  const [editProjectStartDate, setEditProjectStartDate] = useState('');
  const [editProjectEndDate, setEditProjectEndDate] = useState('');
  const [editProjectHasEquipment, setEditProjectHasEquipment] = useState(false);

  // CRUD Responsibles state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('Ingeniero Biomédico');
  const [userMaxTasksLimit, setUserMaxTasksLimit] = useState(5);

  // Gantt Search & Filter States
  const [searchGanttTask, setSearchGanttTask] = useState('');
  const [filterGanttStatus, setFilterGanttStatus] = useState('all');
  const [filterGanttPriority, setFilterGanttPriority] = useState('all');
  const [showCriticalPath, setShowCriticalPath] = useState(false);

  const openEditProjectModal = () => {
    if (project) {
      setEditProjectName(project.name);
      setEditProjectDescription(project.description || '');
      setEditProjectManager(project.manager || '');
      setEditProjectArea(project.area || '');
      setEditProjectStartDate(format(new Date(project.startDate), 'yyyy-MM-dd'));
      setEditProjectEndDate(format(new Date(project.endDate), 'yyyy-MM-dd'));
      setEditProjectHasEquipment(project.hasEquipment || false);
      setIsEditProjectOpen(true);
    }
  };

  const handleSaveProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setSaveStatus('saving');
    try {
      await updateProject(project.id, {
        name: editProjectName,
        description: editProjectDescription,
        manager: editProjectManager,
        area: editProjectArea,
        startDate: new Date(editProjectStartDate),
        endDate: new Date(editProjectEndDate),
        hasEquipment: editProjectHasEquipment
      });
      setIsEditProjectOpen(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
      alert("Error al actualizar los detalles del proyecto.");
    }
  };

  const handleCollapseAllPhases = () => {
    if (!project) return;
    const collapsed: Record<string, boolean> = {};
    project.phases.forEach(ph => {
      collapsed[ph.id] = true;
    });
    setCollapsedPhases(collapsed);
  };

  const handleExpandAllPhases = () => {
    setCollapsedPhases({});
  };

  // Algoritmo de cálculo de ruta crítica (Zero Slack)
  const criticalTaskIds = useMemo(() => {
    if (!project) return new Set<string>();
    
    const tasks = project.phases.flatMap(p => p.tasks);
    if (tasks.length === 0) return new Set<string>();

    let maxEndDate = new Date(0);
    tasks.forEach(t => {
      const d = new Date(t.endDate);
      if (d > maxEndDate) maxEndDate = d;
    });

    const criticalSet = new Set<string>();
    const queue: string[] = [];

    tasks.forEach(t => {
      if (new Date(t.endDate).getTime() === maxEndDate.getTime()) {
        criticalSet.add(t.id);
        queue.push(t.id);
      }
    });

    const taskMap = new Map<string, typeof tasks[0]>();
    tasks.forEach(t => taskMap.set(t.id, t));

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentTask = taskMap.get(currentId);
      if (currentTask && currentTask.dependencies) {
        currentTask.dependencies.forEach(depId => {
          if (!criticalSet.has(depId)) {
            criticalSet.add(depId);
            queue.push(depId);
          }
        });
      }
    }

    return criticalSet;
  }, [project]);

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

  const saveDefaultColNames = (names: Record<string, string>) => {
    setDefaultColNames(names);
    localStorage.setItem('default_cols_names_equipments', JSON.stringify(names));
  };

  const saveHiddenDefaultCols = (cols: string[]) => {
    setHiddenDefaultCols(cols);
    localStorage.setItem('hidden_cols_equipments', JSON.stringify(cols));
  };

  // Load custom columns
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStakeholdersCols = localStorage.getItem('custom_cols_stakeholders');
      if (savedStakeholdersCols) {
        try { setCustomColsStakeholders(JSON.parse(savedStakeholdersCols)); } catch (e) { console.error(e); }
      }
      const savedIncidentsCols = localStorage.getItem('custom_cols_incidents');
      if (savedIncidentsCols) {
        try { setCustomColsIncidents(JSON.parse(savedIncidentsCols)); } catch (e) { console.error(e); }
      }
      const savedEquipmentsCols = localStorage.getItem('custom_cols_equipments');
      if (savedEquipmentsCols) {
        try { setCustomColsEquipments(JSON.parse(savedEquipmentsCols)); } catch (e) { console.error(e); }
      }
      const savedDefaultNames = localStorage.getItem('default_cols_names_equipments');
      if (savedDefaultNames) {
        try { setDefaultColNames(prev => ({ ...prev, ...JSON.parse(savedDefaultNames) })); } catch (e) { console.error(e); }
      }
      const savedHiddenCols = localStorage.getItem('hidden_cols_equipments');
      if (savedHiddenCols) {
        try { setHiddenDefaultCols(JSON.parse(savedHiddenCols)); } catch (e) { console.error(e); }
      }
    }
  }, []);

  // Filtering stakeholders and incidents to the active project
  const projectStakeholders = useMemo(() => {
    return stakeholders.filter(s => s.projectId === id);
  }, [stakeholders, id]);

  const projectIncidents = useMemo(() => {
    return incidents.filter(i => i.projectId === id);
  }, [incidents, id]);

  const projectEquipments = useMemo(() => {
    return equipments.filter(eq => eq.projectId === id);
  }, [equipments, id]);

  const filteredProjectEquipments = useMemo(() => {
    return projectEquipments.filter(eq => {
      const matchSearch = eq.name.toLowerCase().includes(searchTermEquipments.toLowerCase()) || 
                          eq.section.toLowerCase().includes(searchTermEquipments.toLowerCase()) ||
                          eq.responsable.toLowerCase().includes(searchTermEquipments.toLowerCase());
      return matchSearch;
    });
  }, [projectEquipments, searchTermEquipments]);

  // Auto-descubrimiento y sincronización de columnas para Equipamientos
  useEffect(() => {
    if (projectEquipments && projectEquipments.length > 0) {
      const dbKeys = new Set<string>();
      projectEquipments.forEach(eq => {
        if (eq.customFields) {
          try {
            const parsed = JSON.parse(eq.customFields);
            Object.keys(parsed).forEach(k => {
              if (k.trim()) dbKeys.add(k.trim());
            });
          } catch (e) {
            console.error(e);
          }
        }
      });
      let updated = [...customColsEquipments];
      let changed = false;
      dbKeys.forEach(key => {
        if (!updated.includes(key)) {
          updated.push(key);
          changed = true;
        }
      });
      if (changed) {
        saveCustomColsEquipments(updated);
      }
    }
  }, [projectEquipments]);

  // Auto-descubrimiento y sincronización de columnas para Stakeholders
  useEffect(() => {
    if (projectStakeholders && projectStakeholders.length > 0) {
      const dbKeys = new Set<string>();
      projectStakeholders.forEach(st => {
        if (st.customFields) {
          try {
            const parsed = JSON.parse(st.customFields);
            Object.keys(parsed).forEach(k => {
              if (k.trim()) dbKeys.add(k.trim());
            });
          } catch (e) {
            console.error(e);
          }
        }
      });
      let updated = [...customColsStakeholders];
      let changed = false;
      dbKeys.forEach(key => {
        if (!updated.includes(key)) {
          updated.push(key);
          changed = true;
        }
      });
      if (changed) {
        saveCustomColsStakeholders(updated);
      }
    }
  }, [projectStakeholders]);

  // Auto-descubrimiento y sincronización de columnas para Incidentes
  useEffect(() => {
    if (projectIncidents && projectIncidents.length > 0) {
      const dbKeys = new Set<string>();
      projectIncidents.forEach(inc => {
        if (inc.customFields) {
          try {
            const parsed = JSON.parse(inc.customFields);
            Object.keys(parsed).forEach(k => {
              if (k.trim()) dbKeys.add(k.trim());
            });
          } catch (e) {
            console.error(e);
          }
        }
      });
      let updated = [...customColsIncidents];
      let changed = false;
      dbKeys.forEach(key => {
        if (!updated.includes(key)) {
          updated.push(key);
          changed = true;
        }
      });
      if (changed) {
        saveCustomColsIncidents(updated);
      }
    }
  }, [projectIncidents]);

  const saveCustomColsEquipments = (cols: string[]) => {
    setCustomColsEquipments(cols);
    localStorage.setItem('custom_cols_equipments', JSON.stringify(cols));
  };

  const saveCustomColsStakeholders = (cols: string[]) => {
    setCustomColsStakeholders(cols);
    localStorage.setItem('custom_cols_stakeholders', JSON.stringify(cols));
  };

  const saveCustomColsIncidents = (cols: string[]) => {
    setCustomColsIncidents(cols);
    localStorage.setItem('custom_cols_incidents', JSON.stringify(cols));
  };

  // Calculations for active project progress
  const progress = useMemo(() => {
    if (!project) return 0;
    const allTasks = project.phases.flatMap(ph => ph.tasks);
    if (allTasks.length === 0) return 0;
    const total = allTasks.reduce((acc, t) => acc + t.progress, 0);
    return Math.round(total / allTasks.length);
  }, [project]);

  // Dashboard Tab computations
  const dashboardStats = useMemo(() => {
    if (!project) return { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, notStartedTasks: 0, atRiskTasks: 0, totalMilestones: 0, completedMilestones: 0 };
    const tasks = project.phases.flatMap(ph => ph.tasks);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const notStartedTasks = tasks.filter(t => t.status === 'Not Started').length;
    const atRiskTasks = tasks.filter(t => t.status === 'At Risk').length;
    const milestones = tasks.filter(t => t.duration === 0);
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(t => t.progress === 100).length;

    return { totalTasks, completedTasks, inProgressTasks, notStartedTasks, atRiskTasks, totalMilestones, completedMilestones };
  }, [project]);

  const priorityDistribution = useMemo(() => {
    if (!project) return { alta: 0, media: 0, baja: 0, total: 0, altaPct: 0, mediaPct: 0, bajaPct: 0 };
    const tasks = project.phases.flatMap(ph => ph.tasks);
    const total = tasks.length;
    if (total === 0) return { alta: 0, media: 0, baja: 0, total: 0, altaPct: 0, mediaPct: 0, bajaPct: 0 };
    const alta = tasks.filter(t => t.priority === 'Alta').length;
    const media = tasks.filter(t => t.priority === 'Media' || !t.priority).length;
    const baja = tasks.filter(t => t.priority === 'Baja').length;
    return {
      alta,
      media,
      baja,
      total,
      altaPct: Math.round((alta / total) * 100),
      mediaPct: Math.round((media / total) * 100),
      bajaPct: Math.round((baja / total) * 100),
    };
  }, [project]);

  const calibrationStats = useMemo(() => {
    const totalEquips = projectEquipments.length;
    if (totalEquips === 0) {
      return {
        total: 0,
        completion: 0,
        phases: [
          { name: defaultColNames.levantamiento || 'Levantamiento', pct: 0 },
          { name: defaultColNames.parametrizacion || 'Parametrización', pct: 0 },
          { name: defaultColNames.pruebas || 'Pruebas', pct: 0 },
          { name: defaultColNames.capacitacion || 'Capacitación', pct: 0 },
          { name: defaultColNames.validacion || 'Validación', pct: 0 },
          { name: defaultColNames.golive || 'Go-Live', pct: 0 },
        ].filter(p => {
          // Filtrar las fases por sus claves de mapeo
          const mapping: Record<string, string> = {
            'Levantamiento': 'levantamiento',
            'Parametrización': 'parametrizacion',
            'Pruebas': 'pruebas',
            'Capacitación': 'capacitacion',
            'Validación': 'validacion',
            'Go-Live': 'golive'
          };
          const key = mapping[p.name] || '';
          return !hiddenDefaultCols.includes(key);
        })
      };
    }

    const getPhaseScore = (status: string) => {
      if (status === 'Completado') return 1;
      if (status === 'En progreso') return 0.5;
      return 0;
    };

    const sumPhase = (phaseKey: keyof ClinicalEquipment) => {
      let activeCount = 0;
      let scoreSum = 0;
      
      projectEquipments.forEach(eq => {
        const val = eq[phaseKey];
        if (typeof val === 'string') {
          if (val === 'Descartado' || val === 'Desestimado') return;
          activeCount++;
          scoreSum += getPhaseScore(val);
        }
      });
      
      return activeCount === 0 ? 100 : Math.round((scoreSum / activeCount) * 100);
    };

    const allPhases = [
      { key: 'levantamiento', name: defaultColNames.levantamiento || 'Levantamiento' },
      { key: 'parametrizacion', name: defaultColNames.parametrizacion || 'Parametrización' },
      { key: 'pruebas', name: defaultColNames.pruebas || 'Pruebas' },
      { key: 'capacitacion', name: defaultColNames.capacitacion || 'Capacitación' },
      { key: 'validacion', name: defaultColNames.validacion || 'Validación' },
      { key: 'golive', name: defaultColNames.golive || 'Go-Live' },
    ];

    const activePhases = allPhases.filter(ph => !hiddenDefaultCols.includes(ph.key));

    const phs = activePhases.map(ph => ({
      name: ph.name,
      pct: sumPhase(ph.key as keyof ClinicalEquipment)
    }));
    
    const avgCompletion = phs.length === 0 ? 100 : Math.round(phs.reduce((sum, p) => sum + p.pct, 0) / phs.length);

    return {
      total: totalEquips,
      completion: avgCompletion,
      phases: phs
    };
  }, [projectEquipments, hiddenDefaultCols, defaultColNames]);

  // Stakeholders Matrix filtered reactive view
  const filteredStakeholders = useMemo(() => {
    return projectStakeholders.filter(s => {
      const matchSearch = 
        s.name.toLowerCase().includes(searchTermStakeholders.toLowerCase()) ||
        s.role.toLowerCase().includes(searchTermStakeholders.toLowerCase()) ||
        s.area.toLowerCase().includes(searchTermStakeholders.toLowerCase()) ||
        s.contact.toLowerCase().includes(searchTermStakeholders.toLowerCase()) ||
        s.notes.toLowerCase().includes(searchTermStakeholders.toLowerCase());
      return matchSearch;
    });
  }, [projectStakeholders, searchTermStakeholders]);

  // Obtener opciones dinámicas personalizadas ingresadas a nivel global
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

  const uniqueIncidentImpact = useMemo(() => {
    const defaults = ['Crítico', 'Medio', 'Bajo'];
    const uniques = new Set<string>();
    incidents.forEach(inc => {
      if (inc.impacto && !defaults.includes(inc.impacto)) {
        uniques.add(inc.impacto);
      }
    });
    return Array.from(uniques);
  }, [incidents]);

  const uniqueIncidentStatus = useMemo(() => {
    const defaults = ['Abierto', 'En proceso', 'Cerrado'];
    const uniques = new Set<string>();
    incidents.forEach(inc => {
      if (inc.estado && !defaults.includes(inc.estado)) {
        uniques.add(inc.estado);
      }
    });
    return Array.from(uniques);
  }, [incidents]);

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

  // Incidents filtered reactive view
  const filteredIncidents = useMemo(() => {
    return projectIncidents.filter(inc => {
      const matchSearch = 
        inc.descripcion.toLowerCase().includes(searchTermIncidents.toLowerCase()) ||
        inc.equipmentName.toLowerCase().includes(searchTermIncidents.toLowerCase()) ||
        inc.responsable.toLowerCase().includes(searchTermIncidents.toLowerCase()) ||
        inc.planDeAccion.toLowerCase().includes(searchTermIncidents.toLowerCase());
      const matchImpact = filterImpactIncidents === 'all' || inc.impacto === filterImpactIncidents;
      const matchStatus = filterStatusIncidents === 'all' || inc.estado === filterStatusIncidents;
      return matchSearch && matchImpact && matchStatus;
    });
  }, [projectIncidents, searchTermIncidents, filterImpactIncidents, filterStatusIncidents]);

  // Gantt specific calendar definitions
  const allTasks = useMemo(() => {
    return project?.phases.flatMap(ph => ph.tasks) || [];
  }, [project]);

  const { startDate, endDate, periods, totalDays } = useMemo(() => {
    if (!project) return { startDate: new Date(), endDate: new Date(), periods: [], totalDays: 0 };
    
    let minDate = new Date(project.startDate);
    let maxDate = new Date(project.endDate);

    project.phases.forEach(ph => {
      if (ph.startDate < minDate) minDate = ph.startDate;
      if (ph.endDate > maxDate) maxDate = ph.endDate;
    });

    minDate = addDays(minDate, -5);
    maxDate = addDays(maxDate, 30);
    const totalDays = differenceInDays(maxDate, minDate);

    let periods: { date: Date, labelTop: string, labelBottom: string, isToday?: boolean, isWeekend?: boolean }[] = [];

    if (viewMode === 'day') {
      const days = eachDayOfInterval({ start: minDate, end: maxDate });
      periods = days.map(d => ({ 
        date: d, 
        labelTop: format(d, 'MMM', { locale: es }), 
        labelBottom: format(d, 'dd'),
        isToday: isToday(d),
        isWeekend: d.getDay() === 0 || d.getDay() === 6
      }));
    } else if (viewMode === 'week') {
      let curr = startOfWeek(minDate, { weekStartsOn: 1 });
      while (curr <= maxDate) {
        periods.push({
          date: curr,
          labelTop: format(curr, 'MMM', { locale: es }),
          labelBottom: `Sem ${format(curr, 'w')}`,
          isToday: isToday(curr) || (new Date() >= curr && new Date() < addWeeks(curr, 1))
        });
        curr = addWeeks(curr, 1);
      }
    } else if (viewMode === 'month') {
      let curr = startOfMonth(minDate);
      while (curr <= maxDate) {
        periods.push({
          date: curr,
          labelTop: format(curr, 'yyyy'),
          labelBottom: format(curr, 'MMMM', { locale: es }),
          isToday: isToday(curr) || (new Date() >= curr && new Date() < addMonths(curr, 1))
        });
        curr = addMonths(curr, 1);
      }
    }

    return { startDate: minDate, endDate: maxDate, periods, totalDays };
  }, [project, viewMode]);

  const colWidth = viewMode === 'day' ? 40 : viewMode === 'week' ? 80 : 120;
  const gridWidth = periods.length * colWidth;

  const scrollToToday = () => {
    if (!scrollContainerRef.current) return;
    const todayOffset = differenceInDays(new Date(), startDate) * (viewMode === 'day' ? 40 : viewMode === 'week' ? 80/7 : 120/30);
    scrollContainerRef.current.scrollTo({
      left: Math.max(0, todayOffset - 300),
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    if (activeTab === 'gantt') {
      const timeout = setTimeout(scrollToToday, 500);
      return () => clearTimeout(timeout);
    }
  }, [activeTab]);

  const getOffsetAndWidth = (start: Date, end: Date) => {
    let offset = 0;
    let width = 0;
    if (viewMode === 'day') {
      offset = differenceInDays(start, startDate) * colWidth;
      width = (differenceInDays(end, start) + 1) * colWidth;
    } else if (viewMode === 'week') {
      offset = (differenceInDays(start, startDate) / 7) * colWidth;
      width = (differenceInDays(end, start) / 7) * colWidth;
    } else {
      offset = (differenceInDays(start, startDate) / 30) * colWidth;
      width = (differenceInDays(end, start) / 30) * colWidth;
    }
    return { offset: Math.max(0, offset), width: Math.max(colWidth/4, width) };
  };

  const todayOffset = getOffsetAndWidth(new Date(), new Date()).offset;

  // Actions Handlers
  const handleProjectStatusChange = (status: any) => {
    if (project) {
      updateProject(project.id, { status });
    }
  };

  const handleCreateStakeholder = () => {
    const nextIndexId = stakeholders.reduce((max, s) => Math.max(max, s.indexId), 0) + 1;
    const defaultSede = recintos.length > 0 ? recintos[0].name : 'BUPA Santiago';
    const newSt: Stakeholder = {
      id: `st-${Date.now()}`,
      indexId: nextIndexId,
      name: '',
      role: '',
      orgSede: defaultSede,
      area: project?.area || '',
      contact: '',
      influence: 'Medio',
      impact: 'Medio',
      notes: '',
      projectId: id,
      customFields: '{}'
    };
    addStakeholder(newSt);
  };

  const handleCreateIncident = () => {
    const nextIndexId = incidents.reduce((max, i) => Math.max(max, i.indexId), 0) + 1;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const defaultRecinto = recintos.length > 0 ? recintos[0].name : 'BUPA Santiago';
    const defaultUser = users.length > 0 ? users[0].name : 'PMO Admin';
    const newInc: Incident = {
      id: `inc-${Date.now()}`,
      indexId: nextIndexId,
      fecha: todayStr,
      recintoName: defaultRecinto,
      equipmentName: 'General',
      faseAfectada: 'General',
      descripcion: '',
      impacto: 'Bajo',
      responsable: defaultUser,
      estado: 'Abierto',
      planDeAccion: '',
      fechaCierre: '',
      projectId: id,
      customFields: '{}'
    };
    addIncident(newInc);
  };

  // Gantt actions
  const handleTaskClick = (task: Task, phaseId: string) => {
    setEditingTask({ task: { ...task }, phaseId, isNew: false });
  };

  const handleCreateTask = (phaseId: string) => {
    const phase = project?.phases.find(p => p.id === phaseId);
    const rootTasksCount = phase?.tasks.filter(t => !t.parentId).length || 0;
    const start = new Date();
    const duration = 5;
    const end = addBusinessDays(start, duration);
    const newTask: Task = {
      id: `t-${Date.now()}`,
      wbsId: phase?.wbsId ? `${phase.wbsId}.${rootTasksCount + 1}` : undefined,
      name: 'Nueva Tarea',
      startDate: start,
      endDate: end,
      duration: duration,
      progress: 0,
      assignee: 'Sin Asignar',
      status: 'Not Started',
      priority: 'Media',
      phaseId: phaseId,
      dependencies: []
    };
    setEditingTask({ task: newTask, phaseId, isNew: true });
  };

  const handleCreateSubtask = (e: React.MouseEvent, parentId: string, phaseId: string) => {
    e.stopPropagation();
    const phase = project?.phases.find(p => p.id === phaseId);
    const parentTask = phase?.tasks.find(t => t.id === parentId);
    if (!parentTask) return;

    const siblingCount = phase!.tasks.filter(t => t.parentId === parentId).length;
    const newSubtask: Task = {
      id: `t-${Date.now()}`,
      parentId: parentId,
      wbsId: parentTask.wbsId ? `${parentTask.wbsId}.${siblingCount + 1}` : undefined,
      name: 'Nueva Subtarea',
      startDate: parentTask.startDate,
      endDate: addBusinessDays(parentTask.startDate, 3),
      duration: 3,
      progress: 0,
      assignee: parentTask.assignee,
      status: 'Not Started',
      priority: parentTask.priority,
      phaseId: phaseId,
      dependencies: []
    };
    setEditingTask({ task: newSubtask, phaseId, isNew: true });
  };

  const handleTaskDateChange = (field: 'start' | 'end' | 'duration', value: any) => {
    if (!editingTask) return;
    const t = { ...editingTask.task };
    
    if (field === 'start' || field === 'end') {
      if (!value) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (field === 'start') t.startDate = today;
        else t.endDate = today;
      } else {
        const [year, month, day] = value.split('-');
        const localDate = new Date(Number(year), Number(month) - 1, Number(day));
        if (field === 'start') t.startDate = localDate;
        else t.endDate = localDate;
      }
    } else if (field === 'duration') {
      t.duration = parseInt(value) || 0;
    }
    
    if (field === 'start' || field === 'duration') {
      t.endDate = addBusinessDays(t.startDate, t.duration);
    } else if (field === 'end') {
      t.duration = differenceInBusinessDays(t.startDate, t.endDate);
      if (t.duration < 0) {
        t.duration = 0;
        t.startDate = new Date(t.endDate);
      }
    }
    
    setEditingTask({ ...editingTask, task: t });
  };

  const handleSaveTask = () => {
    if (editingTask && project) {
      if (editingTask.isNew) {
        addTask(project.id, editingTask.phaseId, editingTask.task);
      } else {
        updateTask(project.id, editingTask.phaseId, editingTask.task.id, editingTask.task);
      }
      setEditingTask(null);
    }
  };

  const handleDeleteTask = () => {
    if (editingTask && project && !editingTask.isNew) {
      deleteTask(project.id, editingTask.phaseId, editingTask.task.id);
    }
    setEditingTask(null);
  };

  const handleCreatePhase = () => {
    const wbsCount = project?.phases.length || 0;
    const newPhase: Phase = {
      id: `ph-${Date.now()}`,
      name: 'Nueva Fase Clínica',
      wbsId: `${wbsCount + 1}`,
      tasks: [],
      startDate: new Date(),
      endDate: addBusinessDays(new Date(), 10),
      progress: 0
    };
    setEditingPhase({ phase: newPhase, isNew: true });
  };

  const handleEditPhase = (phase: Phase) => {
    setEditingPhase({ phase: { ...phase }, isNew: false });
  };

  const handleSavePhase = () => {
    if (editingPhase && project) {
      if (editingPhase.isNew) {
        addPhase(project.id, editingPhase.phase);
      } else {
        updatePhase(project.id, editingPhase.phase.id, editingPhase.phase);
      }
      setEditingPhase(null);
    }
  };

  const handleDeletePhase = () => {
    if (editingPhase && project && !editingPhase.isNew) {
      if (confirm('¿Estás seguro de eliminar esta fase y todas sus tareas?')) {
        deletePhase(project.id, editingPhase.phase.id);
      }
    }
    setEditingPhase(null);
  };

  const handleTaskDragStart = (e: React.MouseEvent, task: Task, phaseId: string) => {
    if (viewMode !== 'day') return;
    e.stopPropagation();
    
    const startX = e.clientX;
    const initialStart = new Date(task.startDate);
    let currentDaysMoved = 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      currentDaysMoved = Math.round(deltaX / colWidth);
      setDraggedTask({ id: task.id, startOffsetDays: currentDaysMoved });
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setDraggedTask(null);
      
      if (currentDaysMoved !== 0 && project) {
        let newStart = addDays(initialStart, currentDaysMoved);
        if (newStart.getDay() === 0) newStart = addDays(newStart, 1);
        if (newStart.getDay() === 6) newStart = addDays(newStart, 2);
        
        const newEnd = addBusinessDays(newStart, task.duration);
        updateTask(project.id, phaseId, task.id, { startDate: newStart, endDate: newEnd });
      }
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Dynamic Column Addition Handlers
  const handleAddEquipmentCol = (e: React.FormEvent) => {
    e.preventDefault();
    const colName = newColEquipment.trim();
    if (!colName) return;
    if (customColsEquipments.includes(colName)) {
      alert('Esta columna ya existe.');
      return;
    }
    const updated = [...customColsEquipments, colName];
    saveCustomColsEquipments(updated);
    setNewColEquipment('');
    setIsAddingColEquipment(false);
  };

  const handleDeleteEquipmentCol = (col: string) => {
    if (confirm(`¿Eliminar la columna "${col}"? Todos los datos guardados en esta columna se borrarán.`)) {
      const updated = customColsEquipments.filter(c => c !== col);
      saveCustomColsEquipments(updated);
      equipments.forEach(eq => {
        if (eq.customFields) {
          const fields = JSON.parse(eq.customFields);
          if (fields[col] !== undefined) {
            delete fields[col];
            updateEquipment(eq.id, { customFields: JSON.stringify(fields) });
          }
        }
      });
    }
  };

  const handleRenameEquipmentCol = (oldName: string, newNameOverride?: string) => {
    const newName = newNameOverride !== undefined ? newNameOverride : prompt(`Ingrese el nuevo nombre para la columna "${oldName}":`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const cleanName = newName.trim();
    if (customColsEquipments.includes(cleanName) && cleanName !== oldName) {
      alert('Esta columna ya existe.');
      return;
    }
    const updated = customColsEquipments.map(c => c === oldName ? cleanName : c);
    saveCustomColsEquipments(updated);
    equipments.forEach(eq => {
      if (eq.customFields) {
        try {
          const fields = JSON.parse(eq.customFields);
          if (fields[oldName] !== undefined) {
            fields[cleanName] = fields[oldName];
            delete fields[oldName];
            updateEquipment(eq.id, { customFields: JSON.stringify(fields) });
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const handleCreateEquipment = (recintoId: string) => {
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
      projectId: id,
      customFields: '{}'
    };
    addEquipment(newEq);
  };

  const handleAddStakeholderCol = (e: React.FormEvent) => {
    e.preventDefault();
    const colName = newColStakeholder.trim();
    if (!colName) return;
    if (customColsStakeholders.includes(colName)) {
      alert('Esta columna ya existe.');
      return;
    }
    const updated = [...customColsStakeholders, colName];
    saveCustomColsStakeholders(updated);
    setNewColStakeholder('');
  };

  const handleDeleteStakeholderCol = (col: string) => {
    if (confirm(`¿Eliminar la columna "${col}"? Todos los datos guardados en esta columna se borrarán.`)) {
      const updated = customColsStakeholders.filter(c => c !== col);
      saveCustomColsStakeholders(updated);
      // Clean up fields from store
      stakeholders.forEach(s => {
        if (s.customFields) {
          const fields = JSON.parse(s.customFields);
          if (fields[col] !== undefined) {
            delete fields[col];
            updateStakeholder(s.id, { customFields: JSON.stringify(fields) });
          }
        }
      });
      if (editingColIdx !== null) setEditingColIdx(null);
    }
  };

  const handleRenameStakeholderCol = (oldName: string, newNameOverride?: string) => {
    const newName = newNameOverride !== undefined ? newNameOverride : prompt(`Ingrese el nuevo nombre para la columna "${oldName}":`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const cleanName = newName.trim();
    if (customColsStakeholders.includes(cleanName) && cleanName !== oldName) {
      alert('Esta columna ya existe.');
      return;
    }
    const updated = customColsStakeholders.map(c => c === oldName ? cleanName : c);
    saveCustomColsStakeholders(updated);
    stakeholders.forEach(s => {
      if (s.customFields) {
        try {
          const fields = JSON.parse(s.customFields);
          if (fields[oldName] !== undefined) {
            fields[cleanName] = fields[oldName];
            delete fields[oldName];
            updateStakeholder(s.id, { customFields: JSON.stringify(fields) });
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const handleAddIncidentCol = (e: React.FormEvent) => {
    e.preventDefault();
    const colName = newColIncident.trim();
    if (!colName) return;
    if (customColsIncidents.includes(colName)) {
      alert('Esta columna ya existe.');
      return;
    }
    const updated = [...customColsIncidents, colName];
    saveCustomColsIncidents(updated);
    setNewColIncident('');
  };

  const handleDeleteIncidentCol = (col: string) => {
    if (confirm(`¿Eliminar la columna "${col}"? Todos los datos guardados en esta columna se borrarán.`)) {
      const updated = customColsIncidents.filter(c => c !== col);
      saveCustomColsIncidents(updated);
      // Clean up fields from store
      incidents.forEach(i => {
        if (i.customFields) {
          const fields = JSON.parse(i.customFields);
          if (fields[col] !== undefined) {
            delete fields[col];
            updateIncident(i.id, { customFields: JSON.stringify(fields) });
          }
        }
      });
      if (editingColIdx !== null) setEditingColIdx(null);
    }
  };

  const handleRenameIncidentCol = (oldName: string, newNameOverride?: string) => {
    const newName = newNameOverride !== undefined ? newNameOverride : prompt(`Ingrese el nuevo nombre para la columna "${oldName}":`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const cleanName = newName.trim();
    if (customColsIncidents.includes(cleanName) && cleanName !== oldName) {
      alert('Esta columna ya existe.');
      return;
    }
    const updated = customColsIncidents.map(c => c === oldName ? cleanName : c);
    saveCustomColsIncidents(updated);
    incidents.forEach(i => {
      if (i.customFields) {
        try {
          const fields = JSON.parse(i.customFields);
          if (fields[oldName] !== undefined) {
            fields[cleanName] = fields[oldName];
            delete fields[oldName];
            updateIncident(i.id, { customFields: JSON.stringify(fields) });
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  // Circular progress calculations for individual project card
  const daysRemaining = useMemo(() => {
    if (!project) return 0;
    return differenceInDays(new Date(project.endDate), new Date());
  }, [project]);

  if (!project) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', background: 'var(--bg-primary)' }}>
        <AlertCircle size={48} color="var(--accent-danger)" className="animate-pulse" />
        <h3>Proyecto no encontrado</h3>
        <p style={{ color: 'var(--text-secondary)' }}>El proyecto solicitado no existe o fue removido.</p>
        <button className="btn btn-primary" onClick={() => router.push('/projects')}>Volver al Portafolio</button>
      </div>
    );
  }

  const projectStatus = project.status || 'Planificación';
  const sc = PROJECT_STATUS_CONFIG[projectStatus] || PROJECT_STATUS_CONFIG['Planificación'];
  const areaColor = AREA_COLORS[project.area || ''] || '#0079C1';

  // WBS row renderer for Gantt tab
  const renderTaskRow = (task: Task, phase: Phase, depth: number = 0) => {
    // Filtros reactivos de Carta Gantt
    const matchesSearch = !searchGanttTask || 
      task.name.toLowerCase().includes(searchGanttTask.toLowerCase()) || 
      task.assignee.toLowerCase().includes(searchGanttTask.toLowerCase());
    const matchesStatus = filterGanttStatus === 'all' || task.status === filterGanttStatus;
    const matchesPriority = filterGanttPriority === 'all' || task.priority === filterGanttPriority;
    
    const isVisible = matchesSearch && matchesStatus && matchesPriority;
    const subtasks = phase.tasks.filter(t => t.parentId === task.id);

    if (!isVisible) {
      return (
        <React.Fragment key={task.id}>
          {!collapsedPhases[phase.id] && subtasks.map(sub => renderTaskRow(sub, phase, depth))}
        </React.Fragment>
      );
    }

    const isAtRisk = task.status === 'At Risk';
    const isCompleted = task.status === 'Completed';
    const isMilestone = task.duration === 0;
    
    const isCritical = showCriticalPath && criticalTaskIds.has(task.id);
    const barColor = isCritical ? '#ef4444' : (isAtRisk ? 'var(--accent-danger)' : isCompleted ? 'var(--accent-success)' : 'var(--accent-primary)');
    
    const isDragged = draggedTask?.id === task.id;
    const dragOffsetPx = isDragged ? draggedTask.startOffsetDays * colWidth : 0;

    return (
      <React.Fragment key={task.id}>
        <div 
          className="gantt-task-row"
          style={{ 
            display: 'flex', 
            borderBottom: '1px solid var(--border-subtle)', 
            cursor: 'pointer', 
            transition: 'background 0.2s', 
            background: isDragged ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
            borderLeft: isCritical ? '4px solid #ef4444' : 'none'
          }} 
          onClick={() => handleTaskClick(task, phase.id)}
        >
          <div style={{ width: '380px', flexShrink: 0, padding: `12px 16px 12px ${16 + (depth * 24)}px`, fontSize: '0.9rem', borderRight: '1px solid var(--border-light)', position: 'sticky', left: 0, background: isDragged ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', zIndex: 5, borderLeft: depth > 0 && !isCritical ? '4px solid var(--border-light)' : 'none' }}>
            <div style={{ fontWeight: depth === 0 ? '600' : '500', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              {isAtRisk && <AlertTriangle size={14} color="var(--accent-danger)" />}
              {isCritical && <Flame size={14} color="#ef4444" style={{ animation: 'pulse 1.5s infinite', flexShrink: 0 }} />}
              {task.wbsId && <span style={{ color: depth === 0 ? 'var(--text-secondary)' : 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{task.wbsId}</span>}
              <span style={{ flex: 1, whiteSpace: 'normal', lineHeight: '1.2', fontWeight: isCritical ? 'bold' : 'normal' }}>{task.name}</span>
              
              <button 
                className="icon-btn" 
                style={{ width: '22px', height: '22px', border: 'none', background: 'var(--bg-tertiary)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                title="Añadir Subtarea" 
                onClick={(e) => handleCreateSubtask(e, task.id, phase.id)}
              >
                <Plus size={14} color="var(--accent-primary)" />
              </button>
            </div>
            
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>👤 {task.assignee}</span>
                <StatusBadge status={task.status} />
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{format(task.startDate, 'dd/MM')} - {isMilestone ? 'Hito' : format(task.endDate, 'dd/MM')}</span>
            </div>
          </div>
          
          <div style={{ position: 'relative', width: `${gridWidth}px` }}>
            {(() => {
              const { offset, width } = getOffsetAndWidth(task.startDate, task.endDate);
              
              if (isMilestone) {
                return (
                  <div 
                    onMouseDown={(e) => handleTaskDragStart(e, task, phase.id)}
                    style={{ 
                      position: 'absolute', 
                      top: '15px', 
                      left: `${offset + dragOffsetPx - 10}px`, 
                      width: '20px', 
                      height: '20px', 
                      background: barColor, 
                      transform: 'rotate(45deg)', 
                      boxShadow: isCritical ? '0 0 10px rgba(239, 68, 68, 0.8)' : '0 2px 4px rgba(0,0,0,0.2)',
                      border: isCritical ? '1px solid #ff4d4d' : 'none',
                      cursor: 'ew-resize',
                      zIndex: isDragged ? 10 : 1,
                      transition: isDragged ? 'none' : 'left 0.2s'
                    }} 
                  />
                );
              }

              return (
                <div 
                  onMouseDown={(e) => handleTaskDragStart(e, task, phase.id)}
                  style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    left: `${offset + dragOffsetPx}px`, 
                    width: `${width}px`, 
                    height: depth === 0 ? '26px' : '20px', 
                    background: barColor, 
                    borderRadius: '6px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '0 8px', 
                    fontSize: '0.7rem', 
                    fontWeight: 'bold', 
                    color: 'white', 
                    overflow: 'hidden', 
                    boxShadow: isCritical ? '0 0 8px rgba(239, 68, 68, 0.6)' : '0 2px 4px rgba(0,0,0,0.1)',
                    border: isCritical ? '1px solid #ff4d4d' : 'none',
                    cursor: 'ew-resize',
                    zIndex: isDragged ? 10 : 1,
                    transition: isDragged ? 'none' : 'left 0.2s',
                    marginTop: depth > 0 ? '3px' : '0'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${task.progress}%`, background: 'rgba(255,255,255,0.25)' }} />
                  {width > 40 && <span style={{ position: 'relative', zIndex: 1, whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{task.progress}%</span>}
                </div>
              );
            })()}
          </div>
        </div>
        {!collapsedPhases[phase.id] && subtasks.map(sub => renderTaskRow(sub, phase, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', paddingBottom: '24px' }}>
      
      {/* 1. Header Banner - Bupa High-end Corporate Console */}
      <div className="glass-panel" style={{ padding: '24px', borderTop: `6px solid ${areaColor}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Left Detail */}
          <div style={{ display: 'flex', gap: '16px', flex: 1, minWidth: '300px' }}>
            <button className="icon-btn" onClick={() => router.push('/projects')} title="Volver al portafolio" style={{ flexShrink: 0, width: '42px', height: '42px', borderRadius: '12px' }}>
              <ArrowLeft size={20} />
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{project.name}</h1>
                <button 
                  onClick={openEditProjectModal}
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                  title="Editar Detalles del Proyecto"
                  className="icon-btn"
                >
                  <Edit2 size={12} />
                </button>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: `${areaColor}15`, color: areaColor, whiteSpace: 'nowrap' }}>
                  {project.area || 'Sin Área'}
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: sc.bg, color: sc.color, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                  {sc.icon} {sc.label}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0', fontSize: '0.9rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={project.description}>
                {project.description || 'Sin descripción detallada del alcance.'}
              </p>
            </div>
          </div>

          {/* Right Action Dropdowns & Sync Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontWeight: 700 }}>
                <Activity size={14} className="animate-spin" />
                <span>Sincronizando Core DB</span>
              </div>
              <span style={{ marginTop: '2px' }}>Último push: Hoy</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Estado:</span>
              <select 
                value={projectStatus} 
                onChange={(e) => handleProjectStatusChange(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: sc.color, fontWeight: 800, fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="Planificación">Planificación</option>
                <option value="Ejecución">En Ejecución</option>
                <option value="Pausado">Pausado</option>
                <option value="Completado">Completado</option>
              </select>
            </div>
          </div>

        </div>

        {/* Project Metadata Mini Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <User size={16} color="var(--text-muted)" />
              <span style={{ color: 'var(--text-secondary)' }}>Director / PM:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{project.manager || 'No asignado'}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <Calendar size={16} color="var(--text-muted)" />
              <span style={{ color: 'var(--text-secondary)' }}>Plazo:</span>
              <span style={{ fontWeight: 600 }}>{format(new Date(project.startDate), 'dd MMM yy')} — {format(new Date(project.endDate), 'dd MMM yy')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <Clock size={16} color="var(--text-muted)" />
              <span style={{ color: 'var(--text-secondary)' }}>Término:</span>
              <strong style={{ color: daysRemaining < 0 ? 'var(--accent-danger)' : daysRemaining < 7 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                {daysRemaining < 0 ? `Vencido hace ${Math.abs(daysRemaining)} días` : daysRemaining === 0 ? 'Vence hoy' : `${daysRemaining} días restantes`}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '220px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 700 }}>
                <span style={{ color: 'var(--text-muted)' }}>Avance General</span>
                <span style={{ color: areaColor }}>{progress}%</span>
              </div>
              <div style={{ height: '6px', background: 'var(--border-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${areaColor}, ${areaColor}bb)`, borderRadius: '99px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tabs Enterprise Switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1px' }}>
        {(() => {
          const tabs = [
            { id: 'dashboard', label: '🏠 Cuadro de Mando (Dashboard)' },
            { id: 'gantt', label: '📅 Carta Gantt Interactiva' },
            { id: 'stakeholders', label: `👥 Matriz Stakeholders (${projectStakeholders.length})` },
            { id: 'incidents', label: `⚠️ Log de Incidentes y Riesgos (${projectIncidents.length})` },
          ];
          if (project.hasEquipment) {
            tabs.push({ id: 'equipments', label: `🩺 Equipos Clínicos (${projectEquipments.length})` });
          }
          return tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  background: isActive ? 'var(--bg-secondary)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.9rem',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  borderTop: isActive ? `3px solid var(--accent-primary)` : '3px solid transparent',
                  borderLeft: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  borderRight: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {tab.label}
              </button>
            );
          });
        })()}
      </div>

      {/* 3. Dynamic Tab Content View */}
      <div style={{ flex: 1, overflow: 'visible' }}>
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s' }}>
            
            {/* KPI Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              
              {/* Progreso */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avance Consolidado</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px' }}>{progress}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', marginTop: '6px', fontWeight: 600 }}>PMBOK WBS Weighted</div>
                </div>
                <CircularProgressRing progress={progress} size={70} strokeWidth={6} color={areaColor} />
              </div>

              {/* Tareas */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(2, 132, 199, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
                  <CheckSquare size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{dashboardStats.completedTasks} / {dashboardStats.totalTasks}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>Tareas Completadas</div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span>{dashboardStats.inProgressTasks} en curso</span>
                    <span style={{ color: 'var(--accent-danger)' }}>{dashboardStats.atRiskTasks} riesgo</span>
                  </div>
                </div>
              </div>

              {/* Stakeholders Link Card */}
              <div 
                className="glass-panel hover-card" 
                onClick={() => setActiveTab('stakeholders')}
                style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', flexShrink: 0 }}>
                  <Users size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{projectStakeholders.length}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>Stakeholders Clave</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Ver matriz de involucrados ➜
                  </div>
                </div>
              </div>

              {/* Incidentes Link Card */}
              <div 
                className="glass-panel hover-card" 
                onClick={() => setActiveTab('incidents')}
                style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(225, 29, 72, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-danger)', flexShrink: 0 }}>
                  <AlertOctagon size={22} className={projectIncidents.some(i => i.estado !== 'Cerrado') ? "animate-pulse" : ""} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{projectIncidents.filter(i => i.estado !== 'Cerrado').length}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>Incidentes Activos</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Trazabilidad de riesgos ➜
                  </div>
                </div>
              </div>

            </div>

            {/* Split layout: Phases listing and High alert items */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px' }}>
              
              {/* Phases (WBS Status Console) */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="var(--accent-primary)" />
                  Fases Clínicas e Hitos del Proyecto (Estructura WBS)
                </h3>
                {project.phases.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Layers size={36} style={{ opacity: 0.2, marginBottom: '8px' }} />
                    <p>No se han definido fases en este proyecto.</p>
                    <button className="btn btn-secondary" onClick={() => setActiveTab('gantt')} style={{ fontSize: '0.8rem' }}>Configurar Carta Gantt</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {project.phases.map(ph => (
                      <div key={ph.id} style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 800, padding: '2px 6px', background: 'var(--bg-primary)', borderRadius: '4px', color: 'var(--text-secondary)' }}>WBS {ph.wbsId}.0</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{ph.name}</strong>
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{ph.progress}%</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
                          <div style={{ height: '100%', width: `${ph.progress}%`, background: 'var(--accent-primary)', borderRadius: '99px' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>📅 {format(new Date(ph.startDate), 'dd MMM yy')} — {format(new Date(ph.endDate), 'dd MMM yy')}</span>
                          <span>{ph.tasks.length} tareas asociadas</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Milestones and High Risk Tasks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* CONDITIONAL WIDGET: Equipment Calibration Status OR Tasks by Priority */}
                {project.hasEquipment ? (
                  /* Premium "Estado de Calibración Biomédica" Phase Completion Widget */
                  <div className="glass-panel" style={{ padding: '20px', flex: 1 }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={18} color="#10b981" />
                      Estado de Calibración Biomédica ({calibrationStats.total} Equipos)
                    </h3>
                    
                    {calibrationStats.total === 0 ? (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>No hay equipos clínicos asociados a este proyecto aún.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          <span>Progreso de Calibración Global</span>
                          <span style={{ color: '#10b981' }}>{calibrationStats.completion}%</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${calibrationStats.completion}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '99px' }} />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                          {calibrationStats.phases.map(ph => (
                            <div key={ph.name} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                <span>{ph.name}</span>
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{ph.pct}%</span>
                              </div>
                              <div style={{ height: '4px', background: 'var(--border-light)', borderRadius: '99px', overflow: 'hidden', marginTop: '4px' }}>
                                <div style={{ height: '100%', width: `${ph.pct}%`, background: 'var(--accent-primary)', borderRadius: '99px' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Premium "Distribución de Tareas por Prioridad" Widget */
                  <div className="glass-panel" style={{ padding: '20px', flex: 1 }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sliders size={18} color="var(--accent-primary)" />
                      Distribución de Tareas por Prioridad
                    </h3>
                    
                    {priorityDistribution.total === 0 ? (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>No hay tareas definidas en la WBS.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {[
                          { name: 'Prioridad Alta', pct: priorityDistribution.altaPct, count: priorityDistribution.alta, color: 'linear-gradient(90deg, #ef4444, #f87171)', pillBg: 'rgba(239, 68, 68, 0.1)', pillColor: '#ef4444' },
                          { name: 'Prioridad Media', pct: priorityDistribution.mediaPct, count: priorityDistribution.media, color: 'linear-gradient(90deg, #f59e0b, #fbbf24)', pillBg: 'rgba(245, 158, 11, 0.1)', pillColor: '#f59e0b' },
                          { name: 'Prioridad Baja', pct: priorityDistribution.bajaPct, count: priorityDistribution.baja, color: 'linear-gradient(90deg, #10b981, #34d399)', pillBg: 'rgba(16, 185, 129, 0.1)', pillColor: '#10b981' }
                        ].map(prio => (
                          <div key={prio.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: prio.pillBg, color: prio.pillColor }}>{prio.name}</span>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{prio.count} tareas ({prio.pct}%)</span>
                            </div>
                            <div style={{ height: '8px', background: 'var(--border-light)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${prio.pct}%`, background: prio.color, borderRadius: '99px' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Critical Tasks */}
                <div className="glass-panel" style={{ padding: '20px', flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flame size={18} color="var(--accent-danger)" />
                    Tareas en Riesgo Crítico o Demoradas
                  </h3>
                  {allTasks.filter(t => t.status === 'At Risk').length === 0 ? (
                    <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--accent-success)' }}>
                      <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>¡Excelente! Cero tareas marcadas con bandera de riesgo.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {allTasks.filter(t => t.status === 'At Risk').slice(0, 4).map(t => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(225, 29, 72, 0.04)', border: '1px solid rgba(225, 29, 72, 0.1)', borderRadius: '6px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Asignado: {t.assignee}</div>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: 'rgba(225,29,72,0.1)', color: 'var(--accent-danger)' }}>
                            {t.progress}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Milestones Panel */}
                <div className="glass-panel" style={{ padding: '20px', flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={18} color="var(--accent-warning)" />
                    Hitos Clave del Proyecto
                  </h3>
                  {allTasks.filter(t => t.duration === 0).length === 0 ? (
                    <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <HelpCircle size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>No se han definido hitos (duración = 0) en la WBS.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {allTasks.filter(t => t.duration === 0).slice(0, 4).map(t => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Fase Plazo: {format(new Date(t.startDate), 'dd MMM yyyy')}</div>
                          </div>
                          {t.progress === 100 ? (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.1)', color: 'var(--accent-success)' }}>Completo</span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: 'var(--border-light)', color: 'var(--text-secondary)' }}>Pendiente</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 2: GANTT CHART */}
        {activeTab === 'gantt' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', animation: 'fadeIn 0.3s' }}>
            
            {/* Gantt Header Control panel */}
            {/* Gantt Header Control panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {/* Modos y Hoy */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => setViewMode('day')} style={{ opacity: viewMode === 'day' ? 1 : 0.5, padding: '6px 12px', fontSize: '0.8rem' }}>Días</button>
                  <button className="btn btn-secondary" onClick={() => setViewMode('week')} style={{ opacity: viewMode === 'week' ? 1 : 0.5, padding: '6px 12px', fontSize: '0.8rem' }}>Semanas</button>
                  <button className="btn btn-secondary" onClick={() => setViewMode('month')} style={{ opacity: viewMode === 'month' ? 1 : 0.5, padding: '6px 12px', fontSize: '0.8rem' }}>Meses</button>
                  <button className="btn btn-secondary" onClick={scrollToToday} style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> Hoy
                  </button>
                </div>
                
                {/* WBS Accordion Controller & CPM Toggle */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="btn btn-secondary" onClick={handleCollapseAllPhases} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    Colapsar Todo
                  </button>
                  <button className="btn btn-secondary" onClick={handleExpandAllPhases} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    Expandir Todo
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => setShowCriticalPath(!showCriticalPath)} 
                    style={{ 
                      padding: '6px 12px', 
                      fontSize: '0.8rem', 
                      background: showCriticalPath ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)', 
                      color: showCriticalPath ? '#ef4444' : 'var(--text-primary)', 
                      border: `1px solid ${showCriticalPath ? '#ef4444' : 'var(--border-light)'}`,
                      fontWeight: 700, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Flame size={14} />
                    <span>Ruta Crítica</span>
                  </button>
                </div>

                <button className="btn btn-primary" onClick={handleCreatePhase} style={{ padding: '8px 16px', fontSize: '0.85rem', gap: '6px' }}>
                  <Plus size={16} /> Nueva Fase Clínica
                </button>
              </div>

              {/* Búsqueda y Filtros */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '260px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar tarea por nombre o responsable..." 
                    value={searchGanttTask} 
                    onChange={e => setSearchGanttTask(e.target.value)}
                    style={{ padding: '6px 10px 6px 30px', fontSize: '0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', width: '100%', outline: 'none', color: 'var(--text-primary)' }}
                  />
                </div>

                <select 
                  value={filterGanttStatus} 
                  onChange={e => setFilterGanttStatus(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', outline: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  <option value="all">Todos los Estados</option>
                  <option value="Not Started">Sin Iniciar</option>
                  <option value="In Progress">En Progreso</option>
                  <option value="Completed">Completadas</option>
                  <option value="At Risk">En Riesgo</option>
                </select>

                <select 
                  value={filterGanttPriority} 
                  onChange={e => setFilterGanttPriority(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', outline: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  <option value="all">Todas las Prioridades</option>
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>
            </div>

            {/* Gantt Grid Panel */}
            <div className="glass-panel" style={{ overflow: 'auto', padding: '0', position: 'relative', background: 'var(--bg-secondary)', maxHeight: '600px' }} ref={scrollContainerRef}>
              <div style={{ minWidth: '100%', width: 'max-content', position: 'relative' }}>
                
                {/* WBS Columns Header */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10 }}>
                  <div style={{ width: '380px', flexShrink: 0, padding: '16px', fontWeight: 'bold', borderRight: '1px solid var(--border-light)', position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 11, color: 'var(--text-primary)' }}>
                    Estructura del Proyecto (WBS)
                  </div>
                  <div style={{ display: 'flex', width: `${gridWidth}px` }}>
                    {periods.map((p, i) => (
                      <div key={i} style={{ width: `${colWidth}px`, flexShrink: 0, padding: '8px 0', textAlign: 'center', borderRight: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: p.isToday ? 'var(--accent-primary)' : 'var(--text-secondary)', background: p.isWeekend && viewMode === 'day' ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                        <div style={{ textTransform: 'capitalize' }}>{p.labelTop}</div>
                        <div style={{ fontWeight: p.isToday ? 'bold' : 'normal', color: p.isToday ? 'var(--accent-primary)' : 'var(--text-primary)', textTransform: 'capitalize' }}>{p.labelBottom}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid guidelines */}
                <div style={{ position: 'absolute', top: '64px', bottom: 0, left: '380px', width: `${gridWidth}px`, backgroundImage: `repeating-linear-gradient(to right, transparent, transparent ${colWidth - 1}px, var(--border-subtle) ${colWidth - 1}px, var(--border-subtle) ${colWidth}px)`, pointerEvents: 'none', zIndex: 0 }} />
                {todayOffset > 0 && todayOffset < gridWidth && (
                  <div style={{ position: 'absolute', top: '64px', bottom: 0, left: `calc(380px + ${todayOffset + (colWidth/2)}px)`, width: '2px', background: 'rgba(239, 68, 68, 0.4)', zIndex: 2, pointerEvents: 'none' }} />
                )}

                {/* Phases and Tasks renderer */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {project.phases.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', width: '600px' }}>
                      Comienza agregando tu primera fase clínica utilizando el botón "Nueva Fase Clínica".
                    </div>
                  ) : (
                    project.phases.map((phase) => {
                      const isCollapsed = collapsedPhases[phase.id];
                      return (
                        <React.Fragment key={phase.id}>
                          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
                            
                            <div style={{ width: '380px', flexShrink: 0, padding: '12px 16px', fontWeight: 'bold', color: 'var(--text-primary)', borderRight: '1px solid var(--border-light)', position: 'sticky', left: 0, background: 'var(--bg-tertiary)', zIndex: 5, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', width: '20px' }} onClick={() => setCollapsedPhases(prev => ({ ...prev, [phase.id]: !prev[phase.id] }))}>
                                {isCollapsed ? <ChevronRight size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
                              </div>
                              {phase.wbsId && <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', minWidth: '24px' }}>{phase.wbsId}.</span>}
                              <span style={{ flex: 1, cursor: 'pointer' }} onClick={() => setCollapsedPhases(prev => ({ ...prev, [phase.id]: !prev[phase.id] }))}>{phase.name}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginRight: '8px', minWidth: '40px', textAlign: 'right' }}>{phase.progress}%</span>
                              <button className="icon-btn" style={{ width: '28px', height: '28px', border: 'none', background: 'transparent' }} title="Editar Fase" onClick={() => handleEditPhase(phase)}>
                                <Edit2 size={14} />
                              </button>
                              <button className="icon-btn" style={{ width: '28px', height: '28px', border: 'none', background: 'transparent' }} title="Añadir tarea a esta fase" onClick={() => handleCreateTask(phase.id)}>
                                <Plus size={16} color="var(--accent-primary)" />
                              </button>
                            </div>

                            <div style={{ position: 'relative', width: `${gridWidth}px` }}>
                              {(() => {
                                if (phase.tasks.length === 0) return null;
                                const { offset, width } = getOffsetAndWidth(phase.startDate, phase.endDate);
                                return <div style={{ position: 'absolute', top: '16px', left: `${offset}px`, width: `${width}px`, height: '10px', background: 'var(--text-muted)', borderRadius: '4px', opacity: 0.8 }} />
                              })()}
                            </div>
                          </div>

                          {!isCollapsed && phase.tasks.filter(t => !t.parentId).map(task => renderTaskRow(task, phase, 0))}
                        </React.Fragment>
                      );
                    })
                  )}
                </div>

              </div>
            </div>

            {/* Task Edit Drawer */}
            {editingTask && (
              <div className="gantt-drawer" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '450px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-light)', boxShadow: '-10px 0 30px rgba(0,0,0,0.15)', zIndex: 150, display: 'flex', flexDirection: 'column', animation: 'slideIn 0.25s forwards' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
                  <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
                    {editingTask.task.wbsId ? <span style={{ color: 'var(--accent-primary)', marginRight: '8px' }}>{editingTask.task.wbsId}</span> : null}
                    {editingTask.isNew ? 'Nueva Tarea / Hito' : 'Editar Tarea'}
                  </h2>
                  <button className="icon-btn" onClick={() => setEditingTask(null)}>
                    <X size={20} />
                  </button>
                </div>
                
                <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Nombre de la Tarea</label>
                      <input 
                        type="text" 
                        value={editingTask.task.name} 
                        onChange={e => setEditingTask({...editingTask, task: {...editingTask.task, name: e.target.value}})}
                        style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontWeight: 'bold', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Jira Code</label>
                      <input 
                        type="text" 
                        value={editingTask.task.jiraCode || ''} 
                        onChange={e => setEditingTask({...editingTask, task: {...editingTask.task, jiraCode: e.target.value}})}
                        placeholder="Ej. CLIN-402"
                        style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-primary)', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Estado</label>
                      <select 
                        value={editingTask.task.status}
                        onChange={e => setEditingTask({...editingTask, task: {...editingTask.task, status: e.target.value as TaskStatus}})}
                        style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                      >
                        <option value="Not Started">No Iniciada</option>
                        <option value="In Progress">En Progreso</option>
                        <option value="Completed">Completada</option>
                        <option value="At Risk">En Riesgo</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Prioridad</label>
                      <select 
                        value={editingTask.task.priority || 'Media'}
                        onChange={e => setEditingTask({...editingTask, task: {...editingTask.task, priority: e.target.value as TaskPriority}})}
                        style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                      >
                        <option value="Baja">Baja</option>
                        <option value="Media">Media</option>
                        <option value="Alta">Alta</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Inicio</label>
                      <input 
                        type="date" 
                        value={format(editingTask.task.startDate, 'yyyy-MM-dd')} 
                        onChange={e => handleTaskDateChange('start', e.target.value)}
                        style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Fin</label>
                      <input 
                        type="date" 
                        value={format(editingTask.task.endDate, 'yyyy-MM-dd')} 
                        onChange={e => handleTaskDateChange('end', e.target.value)}
                        style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Días</label>
                      <input 
                        type="number" 
                        value={editingTask.task.duration} 
                        onChange={e => handleTaskDateChange('duration', e.target.value)}
                        style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Responsable</label>
                      <button 
                        type="button" 
                        onClick={() => setIsManageUsersOpen(true)}
                        style={{ border: 'none', background: 'transparent', color: '#004B87', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        ⚙️ Administrar
                      </button>
                    </div>
                    <select 
                      value={editingTask.task.assignee} 
                      onChange={e => setEditingTask({...editingTask, task: {...editingTask.task, assignee: e.target.value}})}
                      style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value="Sin Asignar">Sin Asignar</option>
                      {users.map(u => (
                        <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Progreso</label>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{editingTask.task.progress}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={editingTask.task.progress} 
                      onChange={e => setEditingTask({...editingTask, task: {...editingTask.task, progress: parseInt(e.target.value)}})}
                      style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                      disabled={editingTask.task.duration === 0} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Predecesoras (Dependencias)</label>
                    <select 
                      multiple 
                      value={editingTask.task.dependencies || []} 
                      onChange={e => {
                        const opts = Array.from(e.target.selectedOptions, option => option.value);
                        setEditingTask({...editingTask, task: {...editingTask.task, dependencies: opts}});
                      }}
                      style={{ width: '100%', height: '100px', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      {allTasks.filter(t => t.id !== editingTask.task.id).map(t => (
                        <option key={t.id} value={t.id}>
                          {t.wbsId ? `${t.wbsId} ` : ''}{t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Notas</label>
                    <textarea 
                      value={editingTask.task.notes || ''} 
                      onChange={e => setEditingTask({...editingTask, task: {...editingTask.task, notes: e.target.value}})}
                      rows={3}
                      style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>

                <div style={{ padding: '24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-primary)' }}>
                  {!editingTask.isNew ? (
                    <button className="btn btn-secondary" style={{ color: 'var(--accent-danger)', borderColor: 'var(--border-light)' }} onClick={handleDeleteTask}>
                      <Trash2 size={18} /> Eliminar Tarea
                    </button>
                  ) : <div/>}
                  <button className="btn btn-primary" onClick={handleSaveTask}>
                    <Save size={18} /> Guardar
                  </button>
                </div>
              </div>
            )}

            {/* Phase Edit Drawer */}
            {editingPhase && (
              <div className="gantt-drawer" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-light)', boxShadow: '-10px 0 30px rgba(0,0,0,0.15)', zIndex: 150, display: 'flex', flexDirection: 'column', animation: 'slideIn 0.25s forwards' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
                  <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
                    {editingPhase.phase.wbsId ? <span style={{ color: 'var(--accent-primary)', marginRight: '8px' }}>{editingPhase.phase.wbsId}.</span> : null}
                    {editingPhase.isNew ? 'Nueva Fase Clinical' : 'Editar Fase'}
                  </h2>
                  <button className="icon-btn" onClick={() => setEditingPhase(null)}>
                    <X size={20} />
                  </button>
                </div>
                
                <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Nombre de la Fase / Etapa</label>
                    <input 
                      type="text" 
                      value={editingPhase.phase.name} 
                      onChange={e => setEditingPhase({...editingPhase, phase: {...editingPhase.phase, name: e.target.value}})}
                      style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontWeight: 'bold', outline: 'none' }}
                    />
                  </div>
                  
                  <div style={{ padding: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ margin: '0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      <strong>Cálculo Automático PMBOK:</strong> El inicio, término y avance se calculan de manera agregada en base a las tareas contenidas.
                    </p>
                  </div>
                </div>

                <div style={{ padding: '24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-primary)' }}>
                  {!editingPhase.isNew ? (
                    <button className="btn btn-secondary" style={{ color: 'var(--accent-danger)', borderColor: 'var(--border-light)' }} onClick={handleDeletePhase}>
                      <Trash2 size={18} /> Eliminar Fase
                    </button>
                  ) : <div/>}
                  <button className="btn btn-primary" onClick={handleSavePhase}>
                    <Save size={18} /> Guardar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STAKEHOLDERS */}
        {activeTab === 'stakeholders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
            
            {/* Header / Sub-Banner controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              
              {/* Stakeholder matrix search */}
              <div style={{ position: 'relative', flex: '1', minWidth: '260px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', flex: '1' }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar stakeholder por nombre, rol, área o contacto..." 
                    value={searchTermStakeholders} 
                    onChange={e => setSearchTermStakeholders(e.target.value)}
                    className="control-input"
                    style={{ padding: '10px 10px 10px 42px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
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
                      whiteSpace: 'nowrap'
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
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn btn-secondary shadow-sm" 
                  onClick={() => {
                    setIsAddingColStakeholder(true);
                    setEditingColIdx(null);
                  }} 
                  style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sliders size={14} />
                  Administrar Columnas
                </button>
                <button className="btn btn-primary shadow-sm" onClick={handleCreateStakeholder} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  + Nuevo Interesado
                </button>
              </div>

            </div>

            {isAddingColStakeholder && (
              <div className="custom-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(3px)' }}>
                <div className="custom-modal-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', width: '450px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#004B87', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sliders size={18} />
                      Administrar Columnas (Stakeholders)
                    </h3>
                    <button onClick={() => setIsAddingColStakeholder(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
                  </div>
                  
                  {/* Formulario Agregar */}
                  <form onSubmit={handleAddStakeholderCol} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>+ Crear Columna Nueva</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        placeholder="Ej. Departamento, Compañía, Cargo..." 
                        value={newColStakeholder} 
                        onChange={e => setNewColStakeholder(e.target.value)}
                        style={{ flex: 1, padding: '8px', border: '1px solid var(--border-light)', borderRadius: '6px', outline: 'none', background: 'white', fontSize: '0.85rem' }}
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', background: '#004B87', color: 'white', border: 'none', fontSize: '0.82rem' }}>Crear</button>
                    </div>
                  </form>

                  {/* Listado Existentes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>Columnas Activas ({customColsStakeholders.length})</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                      {customColsStakeholders.length === 0 ? (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No hay columnas personalizadas activas.</div>
                      ) : (
                        customColsStakeholders.map((col, idx) => (
                          <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                            {editingColIdx === idx ? (
                              <>
                                <input 
                                  type="text" 
                                  value={editingColNameText}
                                  onChange={e => setEditingColNameText(e.target.value)}
                                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.82rem', border: '1px solid var(--accent-primary)', borderRadius: '4px', background: 'white', outline: 'none' }}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleRenameStakeholderCol(col, editingColNameText);
                                      setEditingColIdx(null);
                                    }
                                  }}
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    handleRenameStakeholderCol(col, editingColNameText);
                                    setEditingColIdx(null);
                                  }}
                                  style={{ border: 'none', background: 'transparent', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                  title="Guardar nombre"
                                >
                                  <Check size={16} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setEditingColIdx(null)}
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
                                    setEditingColIdx(idx);
                                    setEditingColNameText(col);
                                  }}
                                  style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                  title="Renombrar columna"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteStakeholderCol(col)}
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
                    <button type="button" onClick={() => setIsAddingColStakeholder(false)} className="btn btn-secondary" style={{ padding: '8px 16px', background: '#004B87', color: 'white', border: 'none' }}>Listo</button>
                  </div>
                </div>
              </div>
            )}

            {/* Spreadsheet Table View */}
            <div className="table-container" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="stakeholders-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', width: '60px', textAlign: 'center', fontWeight: 'bold' }}>ID</th>
                      <th style={{ padding: '12px 16px', minWidth: '160px' }}>Nombre</th>
                      <th style={{ padding: '12px 16px', minWidth: '160px' }}>Cargo / Rol</th>
                      <th style={{ padding: '12px 16px', minWidth: '140px' }}>Sede</th>
                      <th style={{ padding: '12px 16px', minWidth: '120px' }}>Área</th>
                      <th style={{ padding: '12px 16px', minWidth: '150px' }}>Contacto</th>
                      <th style={{ padding: '12px 16px', width: '120px', textAlign: 'center' }}>Influencia</th>
                      <th style={{ padding: '12px 16px', width: '120px', textAlign: 'center' }}>Impacto</th>
                      <th style={{ padding: '12px 16px', minWidth: '220px' }}>Expectativas / Notas</th>
                      {customColsStakeholders.map((col, idx) => (
                        <th key={col} style={{ padding: '12px 16px', minWidth: '140px', position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span 
                              style={{ cursor: 'pointer' }} 
                              onClick={() => {
                                setIsAddingColStakeholder(true);
                                setEditingColIdx(idx);
                                setEditingColNameText(col);
                              }} 
                              title="Administrar columna"
                            >
                              {col}
                            </span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button 
                                onClick={() => {
                                  setIsAddingColStakeholder(true);
                                  setEditingColIdx(idx);
                                  setEditingColNameText(col);
                                }} 
                                style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                                title={`Renombrar columna "${col}"`}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button 
                                onClick={() => handleDeleteStakeholderCol(col)} 
                                style={{ border: 'none', background: 'transparent', color: 'var(--accent-danger)', cursor: 'pointer', padding: '2px' }} 
                                title="Eliminar Columna"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                      <th style={{ padding: '12px 16px', width: '60px', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStakeholders.length === 0 ? (
                      <tr>
                        <td colSpan={10 + customColsStakeholders.length} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          <Users size={32} style={{ opacity: 0.2, marginBottom: '8px' }} />
                          <p style={{ margin: 0 }}>No hay stakeholders registrados en este proyecto que cumplan el criterio de búsqueda.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredStakeholders.map(st => {
                        const influenceStyle = IMPACT_STYLE[st.influence] || { bg: 'rgba(0, 121, 193, 0.08)', color: '#0079C1', border: 'rgba(0, 121, 193, 0.15)' };
                        const impactStyle = IMPACT_STYLE[st.impact] || { bg: 'rgba(0, 121, 193, 0.08)', color: '#0079C1', border: 'rgba(0, 121, 193, 0.15)' };
                        const customFieldsData = st.customFields ? JSON.parse(st.customFields) : {};

                        return (
                          <tr key={st.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="table-row-interactive">
                            
                            {/* ID */}
                            <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 'bold', color: '#004B87' }}>
                              #{st.indexId}
                            </td>
                            {/* Nombre */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineInput 
                                value={st.name} 
                                onSave={val => handleUpdateStakeholder(st.id, { name: val })}
                                placeholder="Nombre..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-primary)', outline: 'none', fontWeight: 600 }}
                              />
                            </td>

                            {/* Cargo */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineInput 
                                value={st.role} 
                                onSave={val => handleUpdateStakeholder(st.id, { role: val })}
                                placeholder="Cargo o Rol..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-secondary)', outline: 'none' }}
                              />
                            </td>

                            {/* Sede */}
                            <td style={{ padding: '8px 12px' }}>
                              <select 
                                value={st.orgSede}
                                onChange={e => handleUpdateStakeholder(st.id, { orgSede: e.target.value })}
                                style={{ width: '100%', padding: '6px', border: '1px solid transparent', background: 'transparent', outline: 'none', fontWeight: 600 }}
                              >
                                {recintos.map(r => (
                                  <option key={r.id} value={r.name}>{r.name}</option>
                                ))}
                                <option value="BUPA CLA">BUPA CLA</option>
                                <option value="BUPA Santiago">BUPA Santiago</option>
                              </select>
                            </td>

                            {/* Area */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineInput 
                                value={st.area} 
                                onSave={val => handleUpdateStakeholder(st.id, { area: val })}
                                placeholder="Área..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', outline: 'none' }}
                              />
                            </td>

                            {/* Contacto */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineInput 
                                value={st.contact} 
                                onSave={val => handleUpdateStakeholder(st.id, { contact: val })}
                                placeholder="Email o fono..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', outline: 'none' }}
                              />
                            </td>

                            {/* Influencia */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
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
                                  background: influenceStyle.bg,
                                  color: influenceStyle.color,
                                  border: `1px solid ${influenceStyle.border}`,
                                  borderRadius: '20px',
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  outline: 'none',
                                  cursor: 'pointer',
                                  width: '100px',
                                  textAlignLast: 'center'
                                }}
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
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
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
                                  background: impactStyle.bg,
                                  color: impactStyle.color,
                                  border: `1px solid ${impactStyle.border}`,
                                  borderRadius: '20px',
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  outline: 'none',
                                  cursor: 'pointer',
                                  width: '100px',
                                  textAlignLast: 'center'
                                }}
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

                            {/* Expectativas */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineTextarea 
                                value={st.notes} 
                                onSave={val => handleUpdateStakeholder(st.id, { notes: val })}
                                placeholder="Notas o planes de acción..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                              />
                            </td>

                            {/* Custom Columns Cells */}
                            {customColsStakeholders.map(col => {
                              const cellVal = customFieldsData[col] || '';
                              return (
                                <td key={col} style={{ padding: '8px 12px' }}>
                                  <InlineInput 
                                    value={cellVal} 
                                    onSave={val => {
                                      const updatedFields = { ...customFieldsData, [col]: val };
                                      handleUpdateStakeholder(st.id, { customFields: JSON.stringify(updatedFields) });
                                    }}
                                    placeholder="Ingresar..."
                                    style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', outline: 'none' }}
                                  />
                                </td>
                              );
                            })}

                            {/* Action */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar a ${st.name || 'este participante'} de stakeholders?`)) {
                                    deleteStakeholder(st.id);
                                  }
                                }}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--accent-danger)' }}
                                title="Eliminar"
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
        )}

        {/* TAB 4: INCIDENTS */}
        {activeTab === 'incidents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
            
            {/* Header controls row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              
              <div style={{ display: 'flex', gap: '12px', flex: '1', minWidth: '320px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Buscar incidente por descripción, equipo, responsable..." 
                      value={searchTermIncidents} 
                      onChange={e => setSearchTermIncidents(e.target.value)}
                      className="control-input"
                      style={{ padding: '10px 10px 10px 42px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
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
                        whiteSpace: 'nowrap'
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
                </div>

                <select 
                  value={filterImpactIncidents}
                  onChange={e => setFilterImpactIncidents(e.target.value)}
                  style={{ padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', outline: 'none', color: 'var(--text-primary)' }}
                >
                  <option value="all">Todos los Impactos</option>
                  <option value="Crítico">Crítico</option>
                  <option value="Medio">Medio</option>
                  <option value="Bajo">Bajo</option>
                </select>

                <select 
                  value={filterStatusIncidents}
                  onChange={e => setFilterStatusIncidents(e.target.value)}
                  style={{ padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', outline: 'none', color: 'var(--text-primary)' }}
                >
                  <option value="all">Todos los Estados</option>
                  <option value="Abierto">Abierto</option>
                  <option value="En proceso">En proceso</option>
                  <option value="Cerrado">Cerrado</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn btn-secondary shadow-sm" 
                  onClick={() => {
                    setIsAddingColIncident(true);
                    setEditingColIdx(null);
                  }} 
                  style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sliders size={14} />
                  Administrar Columnas
                </button>
                <button className="btn btn-primary shadow-sm" onClick={handleCreateIncident} style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'var(--accent-danger)' }}>
                  + Registrar Incidente
                </button>
              </div>

            </div>

            {/* Custom Col addition modal */}
            {isAddingColIncident && (
              <div className="custom-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(3px)' }}>
                <div className="custom-modal-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', width: '450px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#004B87', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sliders size={18} />
                      Administrar Columnas (Incidentes)
                    </h3>
                    <button onClick={() => setIsAddingColIncident(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
                  </div>
                  
                  {/* Formulario Agregar */}
                  <form onSubmit={handleAddIncidentCol} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>+ Crear Columna Nueva</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        placeholder="Ej. Gravedad, Impacto Financiero..." 
                        value={newColIncident} 
                        onChange={e => setNewColIncident(e.target.value)}
                        style={{ flex: 1, padding: '8px', border: '1px solid var(--border-light)', borderRadius: '6px', outline: 'none', background: 'white', fontSize: '0.85rem' }}
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', background: '#004B87', color: 'white', border: 'none', fontSize: '0.82rem' }}>Crear</button>
                    </div>
                  </form>

                  {/* Listado Existentes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>Columnas Activas ({customColsIncidents.length})</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                      {customColsIncidents.length === 0 ? (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No hay columnas personalizadas activas.</div>
                      ) : (
                        customColsIncidents.map((col, idx) => (
                          <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                            {editingColIdx === idx ? (
                              <>
                                <input 
                                  type="text" 
                                  value={editingColNameText}
                                  onChange={e => setEditingColNameText(e.target.value)}
                                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.82rem', border: '1px solid var(--accent-primary)', borderRadius: '4px', background: 'white', outline: 'none' }}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleRenameIncidentCol(col, editingColNameText);
                                      setEditingColIdx(null);
                                    }
                                  }}
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    handleRenameIncidentCol(col, editingColNameText);
                                    setEditingColIdx(null);
                                  }}
                                  style={{ border: 'none', background: 'transparent', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                  title="Guardar nombre"
                                >
                                  <Check size={16} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setEditingColIdx(null)}
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
                                    setEditingColIdx(idx);
                                    setEditingColNameText(col);
                                  }}
                                  style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                  title="Renombrar columna"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteIncidentCol(col)}
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
                    <button type="button" onClick={() => setIsAddingColIncident(false)} className="btn btn-secondary" style={{ padding: '8px 16px', background: '#004B87', color: 'white', border: 'none' }}>Listo</button>
                  </div>
                </div>
              </div>
            )}

            {/* Spreadsheet Table View */}
            <div className="table-container" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="incidents-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', width: '60px', textAlign: 'center', fontWeight: 'bold' }}>ID</th>
                      <th style={{ padding: '12px 16px', width: '110px' }}>Fecha</th>
                      <th style={{ padding: '12px 16px', minWidth: '140px' }}>Sede</th>
                      <th style={{ padding: '12px 16px', minWidth: '150px' }}>Equipo Clínico</th>
                      <th style={{ padding: '12px 16px', minWidth: '120px' }}>Fase Afectada</th>
                      <th style={{ padding: '12px 16px', minWidth: '220px' }}>Descripción del Evento</th>
                      <th style={{ padding: '12px 16px', width: '110px', textAlign: 'center' }}>Impacto</th>
                      <th style={{ padding: '12px 16px', minWidth: '140px' }}>Responsable</th>
                      <th style={{ padding: '12px 16px', width: '110px', textAlign: 'center' }}>Estado</th>
                      <th style={{ padding: '12px 16px', minWidth: '200px' }}>Plan de Acción Inmediato</th>
                      <th style={{ padding: '12px 16px', width: '110px' }}>Cierre</th>
                      {customColsIncidents.map((col, idx) => (
                        <th key={col} style={{ padding: '12px 16px', minWidth: '140px', position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span 
                              style={{ cursor: 'pointer' }} 
                              onClick={() => {
                                setIsAddingColIncident(true);
                                setEditingColIdx(idx);
                                setEditingColNameText(col);
                              }} 
                              title="Administrar columna"
                            >
                              {col}
                            </span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button 
                                onClick={() => {
                                  setIsAddingColIncident(true);
                                  setEditingColIdx(idx);
                                  setEditingColNameText(col);
                                }} 
                                style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                                title={`Renombrar columna "${col}"`}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button 
                                onClick={() => handleDeleteIncidentCol(col)} 
                                style={{ border: 'none', background: 'transparent', color: 'var(--accent-danger)', cursor: 'pointer', padding: '2px' }} 
                                title="Eliminar Columna"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                      <th style={{ padding: '12px 16px', width: '60px', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={12 + customColsIncidents.length} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          <AlertTriangle size={32} style={{ opacity: 0.2, marginBottom: '8px' }} />
                          <p style={{ margin: 0 }}>Cero incidentes activos o registrados en este proyecto.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredIncidents.map(inc => {
                        const impactStyle = IMPACT_STYLE[inc.impacto] || { bg: 'rgba(0, 121, 193, 0.08)', color: '#0079C1', border: 'rgba(0, 121, 193, 0.15)' };
                        const statusStyle = INCIDENT_STATUS_STYLE[inc.estado] || { bg: 'rgba(0, 121, 193, 0.08)', color: '#0079C1', border: 'rgba(0, 121, 193, 0.15)' };
                        const customFieldsData = inc.customFields ? JSON.parse(inc.customFields) : {};

                        return (
                          <tr key={inc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="table-row-interactive">
                            
                            {/* ID */}
                            <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-danger)' }}>
                              #{inc.indexId}
                            </td>


                            {/* Fecha */}
                            <td style={{ padding: '8px 12px' }}>
                              <input 
                                type="date" 
                                value={inc.fecha} 
                                onChange={e => handleUpdateIncident(inc.id, { fecha: e.target.value })}
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', outline: 'none', color: 'var(--text-primary)' }}
                              />
                            </td>

                            {/* Sede */}
                            <td style={{ padding: '8px 12px' }}>
                              <select 
                                value={inc.recintoName}
                                onChange={e => handleUpdateIncident(inc.id, { recintoName: e.target.value })}
                                style={{ width: '100%', padding: '6px', border: '1px solid transparent', background: 'transparent', outline: 'none', fontWeight: 600 }}
                              >
                                {recintos.map(r => (
                                  <option key={r.id} value={r.name}>{r.name}</option>
                                ))}
                                <option value="BUPA CLA">BUPA CLA</option>
                                <option value="BUPA Santiago">BUPA Santiago</option>
                              </select>
                            </td>

                            {/* Equipo */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineInput 
                                value={inc.equipmentName} 
                                onSave={val => handleUpdateIncident(inc.id, { equipmentName: val })}
                                placeholder="Equipo afectado..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
                              />
                            </td>

                            {/* Fase */}
                            <td style={{ padding: '8px 12px' }}>
                              <select
                                value={inc.faseAfectada}
                                onChange={e => handleUpdateIncident(inc.id, { faseAfectada: e.target.value })}
                                style={{ width: '100%', padding: '6px', border: '1px solid transparent', background: 'transparent', outline: 'none' }}
                              >
                                <option value="General">General</option>
                                <option value="Levantamiento">Levantamiento</option>
                                <option value="Parametrización">Parametrización</option>
                                <option value="Pruebas">Pruebas</option>
                                <option value="Capacitación">Capacitación</option>
                                <option value="Validación">Validación</option>
                                <option value="Go-live">Go-live</option>
                              </select>
                            </td>

                            {/* Descripcion */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineTextarea 
                                value={inc.descripcion} 
                                onSave={val => handleUpdateIncident(inc.id, { descripcion: val })}
                                placeholder="Qué ocurrió..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                              />
                            </td>

                            {/* Impacto */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <select
                                value={inc.impacto}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__custom__') {
                                    const customVal = prompt("Ingrese el impacto de incidente personalizado:");
                                    if (customVal && customVal.trim()) {
                                      handleUpdateIncident(inc.id, { impacto: customVal.trim() });
                                    }
                                  } else {
                                    handleUpdateIncident(inc.id, { impacto: val });
                                  }
                                }}
                                style={{
                                  background: impactStyle.bg,
                                  color: impactStyle.color,
                                  border: `1px solid ${impactStyle.border}`,
                                  borderRadius: '20px',
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  outline: 'none',
                                  cursor: 'pointer',
                                  width: '100px',
                                  textAlignLast: 'center'
                                }}
                              >
                                <option value="Crítico">Crítico</option>
                                <option value="Medio">Medio</option>
                                <option value="Bajo">Bajo</option>
                                {uniqueIncidentImpact.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                                <option value="__custom__">➕ Otro...</option>
                              </select>
                            </td>

                            {/* Responsable */}
                            <td style={{ padding: '8px 12px' }}>
                              <select 
                                value={inc.responsable} 
                                onChange={e => handleUpdateIncident(inc.id, { responsable: e.target.value })}
                                style={{ width: '100%', padding: '6px', border: '1px solid transparent', background: 'transparent', outline: 'none' }}
                              >
                                {users.map(u => (
                                  <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                                <option value="PMO Admin">PMO Admin</option>
                              </select>
                            </td>

                            {/* Estado */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <select
                                value={inc.estado}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__custom__') {
                                    const customVal = prompt("Ingrese el estado de incidente personalizado:");
                                    if (customVal && customVal.trim()) {
                                      handleUpdateIncident(inc.id, { estado: customVal.trim() });
                                    }
                                  } else {
                                    handleUpdateIncident(inc.id, { estado: val });
                                  }
                                }}
                                style={{
                                  background: statusStyle.bg,
                                  color: statusStyle.color,
                                  border: `1px solid ${statusStyle.border}`,
                                  borderRadius: '20px',
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  outline: 'none',
                                  cursor: 'pointer',
                                  width: '100px',
                                  textAlignLast: 'center'
                                }}
                              >
                                <option value="Abierto">Abierto</option>
                                <option value="En proceso">En proceso</option>
                                <option value="Cerrado">Cerrado</option>
                                {uniqueIncidentStatus.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                                <option value="__custom__">➕ Otro...</option>
                              </select>
                            </td>

                            {/* Plan de Acción */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineTextarea 
                                value={inc.planDeAccion} 
                                onSave={val => handleUpdateIncident(inc.id, { planDeAccion: val })}
                                placeholder="Acciones preventivas..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                              />
                            </td>

                            {/* Cierre */}
                            <td style={{ padding: '8px 12px' }}>
                              <input 
                                type="date" 
                                value={inc.fechaCierre} 
                                onChange={e => handleUpdateIncident(inc.id, { fechaCierre: e.target.value })}
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', outline: 'none', color: 'var(--text-primary)' }}
                              />
                            </td>

                            {/* Custom columns */}
                            {customColsIncidents.map(col => {
                              const cellVal = customFieldsData[col] || '';
                              return (
                                <td key={col} style={{ padding: '8px 12px' }}>
                                  <InlineInput 
                                    value={cellVal} 
                                    onSave={val => {
                                      const updatedFields = { ...customFieldsData, [col]: val };
                                      handleUpdateIncident(inc.id, { customFields: JSON.stringify(updatedFields) });
                                    }}
                                    placeholder="Ingresar..."
                                    style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', outline: 'none' }}
                                  />
                                </td>
                              );
                            })}

                            {/* Action */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  if (confirm('¿Eliminar esta alerta de incidente?')) {
                                    deleteIncident(inc.id);
                                  }
                                }}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--accent-danger)' }}
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
        )}

        {/* TAB 5: EQUIPMENTS */}
        {activeTab === 'equipments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
            
            {/* Header controls row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              
              <div style={{ position: 'relative', flex: '1', minWidth: '260px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', flex: '1' }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar equipo por nombre, sección o responsable..." 
                    value={searchTermEquipments} 
                    onChange={e => setSearchTermEquipments(e.target.value)}
                    className="control-input"
                    style={{ padding: '10px 10px 10px 42px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
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
                      whiteSpace: 'nowrap'
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
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn btn-secondary shadow-sm"
                  onClick={() => setIsReportOpen(true)}
                  style={{ 
                    background: 'transparent', 
                    color: '#004B87', 
                    border: '1px solid #004B87', 
                    padding: '8px 16px', 
                    fontSize: '0.85rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <FileSpreadsheet size={14} /> Generar Informe
                </button>
                <button className="btn btn-secondary shadow-sm" onClick={() => { setIsAddingColEquipment(true); setEditingColIdx(null); }} style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sliders size={14} /> Administrar Columnas
                </button>
              </div>

            </div>

            {isAddingColEquipment && (
              <div className="custom-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(3px)' }}>
                <div className="custom-modal-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', width: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#004B87', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sliders size={18} />
                      Administrar Columnas (Equipos)
                    </h3>
                    <button onClick={() => setIsAddingColEquipment(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
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
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#004B87', paddingBottom: '6px', display: 'block', textTransform: 'uppercase' }}>
                      Columnas Personalizadas (Creadas por el Usuario)
                    </span>

                    {/* Formulario Agregar Columna */}
                    <form onSubmit={handleAddEquipmentCol} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '8px', marginBottom: '12px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>+ Crear Columna Nueva</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="text" 
                          placeholder="Ej. IP del Equipo, Código Bupa, Proveedor..." 
                          value={newColEquipment} 
                          onChange={e => setNewColEquipment(e.target.value)}
                          className="cell-input"
                          style={{ flex: 1, padding: '8px', border: '1px solid var(--border-light)', borderRadius: '6px', outline: 'none', background: 'white', fontSize: '0.85rem' }}
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', background: '#004B87', color: 'white', border: 'none', fontSize: '0.82rem' }}>Crear</button>
                      </div>
                    </form>

                    {/* Listado de Columnas Existentes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>Columnas Activas ({customColsEquipments.length})</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                        {customColsEquipments.length === 0 ? (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No hay columnas personalizadas activas.</div>
                        ) : (
                          customColsEquipments.map((col, idx) => (
                            <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                              {editingColIdx === idx ? (
                                <>
                                  <input 
                                    type="text" 
                                    value={editingColNameText}
                                    onChange={e => setEditingColNameText(e.target.value)}
                                    className="cell-input"
                                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.82rem', border: '1px solid var(--accent-primary)', borderRadius: '4px', background: 'white', outline: 'none' }}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleRenameEquipmentCol(col, editingColNameText);
                                        setEditingColIdx(null);
                                      }
                                    }}
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      handleRenameEquipmentCol(col, editingColNameText);
                                      setEditingColIdx(null);
                                    }}
                                    style={{ border: 'none', background: 'transparent', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                    title="Guardar nombre"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => setEditingColIdx(null)}
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
                                      setEditingColIdx(idx);
                                      setEditingColNameText(col);
                                    }}
                                    style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                    title="Renombrar columna"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => handleDeleteEquipmentCol(col)}
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
                    <button type="button" onClick={() => setIsAddingColEquipment(false)} className="btn btn-secondary" style={{ padding: '8px 16px', background: '#004B87', color: 'white', border: 'none' }}>Listo</button>
                  </div>
                </div>
              </div>
            )}

            {/* Recintos Loop */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {recintos.map((recinto) => {
                const recintoEquips = filteredProjectEquipments.filter(e => e.recintoId === recinto.id);
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
                      if (hiddenDefaultCols.includes(ph.key)) return;
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
                  <div key={recinto.id} className="table-container" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                    {/* Header Excel Bupa style banner (Clickable to collapse) */}
                    <div 
                      style={{ 
                        background: '#004B87', 
                        color: 'white', 
                        padding: '14px 20px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                      onClick={() => toggleRecintoCollapse(recinto.id)}
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
                        onClick={(e) => e.stopPropagation()} // Detener propagación
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
                          onClick={() => handleCreateEquipment(recinto.id)}
                          style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '6px 12px', fontSize: '0.78rem', gap: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Plus size={14} /> Registrar Equipo
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Container */}
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
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', minWidth: '1700px' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-subtle)' }}>
                            <th style={{ padding: '12px 16px', width: '40px' }}>#</th>
                            {!hiddenDefaultCols.includes('name') && <th style={{ padding: '12px 12px', width: '180px' }}>{defaultColNames.name}</th>}
                            {!hiddenDefaultCols.includes('section') && <th style={{ padding: '12px 12px', width: '145px' }}>{defaultColNames.section}</th>}
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
                            {customColsEquipments.map((col, idx) => (
                              <th key={col} style={{ padding: '12px 12px', minWidth: '150px', position: 'relative' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                  <span 
                                    style={{ cursor: 'pointer' }} 
                                    onClick={() => {
                                      setIsAddingColEquipment(true);
                                      setEditingColIdx(idx);
                                      setEditingColNameText(col);
                                    }} 
                                    title="Administrar columna"
                                  >
                                    {col}
                                  </span>
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button 
                                      onClick={() => {
                                        setIsAddingColEquipment(true);
                                        setEditingColIdx(idx);
                                        setEditingColNameText(col);
                                      }} 
                                      style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                                      title={`Renombrar columna "${col}"`}
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteEquipmentCol(col)} 
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
                              <td colSpan={14 - hiddenDefaultCols.length + customColsEquipments.length} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No hay equipos registrados en esta sede clínica para este proyecto. Registra uno usando el botón superior.
                              </td>
                            </tr>
                          ) : (
                            recintoEquips.map((eq, index) => {
                              const customFieldsData = eq.customFields ? JSON.parse(eq.customFields) : {};
                              
                              return (
                                <tr key={eq.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }} className="table-row-interactive">
                                  <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{index + 1}</td>
                                  
                                  {/* Nombre Equipo */}
                                  {!hiddenDefaultCols.includes('name') && (
                                    <td style={{ padding: '8px 12px' }}>
                                      <InlineInput
                                        value={eq.name}
                                        onSave={(val) => handleUpdateEquipment(eq.id, { name: val })}
                                        style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px solid transparent', borderRadius: '4px', outline: 'none', fontWeight: 600, color: 'var(--text-primary)' }}
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
                                      />
                                    </td>
                                  )}

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
                                      />
                                    </td>
                                  )}

                                  {/* Observaciones */}
                                  {!hiddenDefaultCols.includes('observaciones') && (
                                    <td style={{ padding: '8px 12px' }}>
                                      <InlineInput
                                        value={eq.observaciones}
                                        onSave={(val) => handleUpdateEquipment(eq.id, { observaciones: val })}
                                        style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px solid transparent', borderRadius: '4px', outline: 'none', color: 'var(--text-secondary)', fontSize: '0.78rem' }}
                                        title={eq.observaciones}
                                      />
                                    </td>
                                  )}

                                  {/* Pendiente de */}
                                  {!hiddenDefaultCols.includes('pendienteDe') && (
                                    <td style={{ padding: '8px 12px' }}>
                                      <InlineInput
                                        value={eq.pendienteDe}
                                        onSave={(val) => handleUpdateEquipment(eq.id, { pendienteDe: val })}
                                        style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px solid transparent', borderRadius: '4px', outline: 'none', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.78rem' }}
                                        placeholder="Ej: Proveedor"
                                      />
                                    </td>
                                  )}

                                  {/* Celdas de Columnas Dinámicas */}
                                  {customColsEquipments.map(col => {
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
            
          </div>
        )}

        {/* Visor de Informes Corporativo */}
        <ReportViewer 
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          filterProjectId={id}
        />

        {/* MODAL EDITAR DETALLES DEL PROYECTO */}
        {isEditProjectOpen && (
          <div className="custom-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div className="custom-modal-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', width: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#004B87', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Briefcase size={20} />
                  Editar Detalles del Proyecto
                </h3>
                <button onClick={() => setIsEditProjectOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>

              <form onSubmit={handleSaveProjectDetails} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nombre del Proyecto</label>
                  <input 
                    type="text" 
                    required
                    value={editProjectName}
                    onChange={e => setEditProjectName(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Director / PM</label>
                    <select
                      value={editProjectManager}
                      onChange={e => setEditProjectManager(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="">-- No Asignado --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Área de Negocio</label>
                    <select
                      value={editProjectArea}
                      onChange={e => setEditProjectArea(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="">-- Sin Área --</option>
                      <option value="Salud Digital">Salud Digital</option>
                      <option value="Tecnología">Tecnología</option>
                      <option value="Operaciones">Operaciones</option>
                      <option value="Clínico">Clínico</option>
                      <option value="Administración">Administración</option>
                      <option value="Finanzas">Finanzas</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Fecha Inicio</label>
                    <input 
                      type="date" 
                      required
                      value={editProjectStartDate}
                      onChange={e => setEditProjectStartDate(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Fecha Término</label>
                    <input 
                      type="date" 
                      required
                      value={editProjectEndDate}
                      onChange={e => setEditProjectEndDate(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Descripción del Alcance</label>
                  <textarea 
                    value={editProjectDescription}
                    onChange={e => setEditProjectDescription(e.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <input 
                    type="checkbox" 
                    id="hasEquipmentCheckbox"
                    checked={editProjectHasEquipment}
                    onChange={e => setEditProjectHasEquipment(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="hasEquipmentCheckbox" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                    Activar módulo de Equipamiento Clínico 🩺
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditProjectOpen(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#004B87', color: 'white', border: 'none' }}>Guardar Cambios</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL ADMINISTRAR RESPONSABLES (CRUD) */}
        {isManageUsersOpen && (
          <div className="custom-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1010, backdropFilter: 'blur(4px)' }}>
            <div className="custom-modal-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', width: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#004B87', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} />
                  Administrar Responsables (Maestros)
                </h3>
                <button onClick={() => { setIsManageUsersOpen(false); setEditingUser(null); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>

              {/* Formulario Crear / Editar */}
              <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#004B87', fontWeight: 700 }}>
                  {editingUser ? '📝 Editar Responsable' : '➕ Registrar Nuevo Responsable'}
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Nombre Completo</label>
                    <input 
                      type="text" 
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      placeholder="Ej: Carlos Ruiz"
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '4px', outline: 'none', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Email corporativo</label>
                    <input 
                      type="email" 
                      value={userEmail}
                      onChange={e => setUserEmail(e.target.value)}
                      placeholder="carlos.ruiz@bupa.cl"
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '4px', outline: 'none', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Rol / Cargo</label>
                    <select
                      value={userRole}
                      onChange={e => setUserRole(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '4px', outline: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                    >
                      <option value="Project Manager">Project Manager</option>
                      <option value="Ingeniero Biomédico">Ingeniero Biomédico</option>
                      <option value="Físico Médico">Físico Médico</option>
                      <option value="Técnico de TI">Técnico de TI</option>
                      <option value="Mantenimiento Climatización">Mantenimiento Climatización</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }} title="Capacidad recomendada de tareas activas">Límite Tareas Activas</label>
                    <input 
                      type="number" 
                      min="1" max="50"
                      value={userMaxTasksLimit}
                      onChange={e => setUserMaxTasksLimit(parseInt(e.target.value) || 5)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '4px', outline: 'none', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  {editingUser && (
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => {
                        setEditingUser(null);
                        setUserName('');
                        setUserEmail('');
                        setUserRole('Ingeniero Biomédico');
                        setUserMaxTasksLimit(5);
                      }}
                    >
                      Cancelar Edición
                    </button>
                  )}
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ background: '#004B87', color: 'white', border: 'none', padding: '6px 16px', fontSize: '0.8rem', fontWeight: 700 }}
                    onClick={async () => {
                      if (!userName.trim() || !userEmail.trim()) {
                        alert("Nombre y Email son obligatorios.");
                        return;
                      }
                      setSaveStatus('saving');
                      try {
                        if (editingUser) {
                          const { updateUser } = useUserStore.getState();
                          await updateUser(editingUser.id, {
                            name: userName.trim(),
                            email: userEmail.trim(),
                            role: userRole,
                            maxTasksLimit: userMaxTasksLimit
                          });
                        } else {
                          const { addUser } = useUserStore.getState();
                          await addUser({
                            id: `usr-${Date.now()}`,
                            name: userName.trim(),
                            email: userEmail.trim(),
                            role: userRole,
                            maxTasksLimit: userMaxTasksLimit
                          });
                        }
                        setUserName('');
                        setUserEmail('');
                        setUserRole('Ingeniero Biomédico');
                        setUserMaxTasksLimit(5);
                        setEditingUser(null);
                        setSaveStatus('saved');
                        setTimeout(() => setSaveStatus('idle'), 1500);
                      } catch (err) {
                        console.error(err);
                        setSaveStatus('idle');
                        alert("Error al procesar el responsable.");
                      }
                    }}
                  >
                    {editingUser ? 'Actualizar Responsable' : 'Añadir Responsable'}
                  </button>
                </div>
              </div>

              {/* Listado de Usuarios */}
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', display: 'block', marginBottom: '8px' }}>
                  Responsables Activos ({users.length})
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {users.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No hay responsables registrados.</div>
                  ) : (
                    users.map(u => (
                      <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', gap: '12px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{u.name}</strong>
                            <span style={{ fontSize: '0.7rem', background: '#004B8715', color: '#004B87', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{u.role}</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>{u.email} • Límite: {u.maxTasksLimit} tareas</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            type="button" 
                            onClick={() => {
                              setEditingUser(u);
                              setUserName(u.name);
                              setUserEmail(u.email);
                              setUserRole(u.role);
                              setUserMaxTasksLimit(u.maxTasksLimit);
                            }}
                            style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                            title="Editar responsable"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            type="button" 
                            onClick={async () => {
                              if (confirm(`¿Eliminar al responsable "${u.name}"?`)) {
                                setSaveStatus('saving');
                                try {
                                  const { deleteUser } = useUserStore.getState();
                                  await deleteUser(u.id);
                                  setSaveStatus('saved');
                                  setTimeout(() => setSaveStatus('idle'), 1500);
                                } catch (err) {
                                  console.error(err);
                                  setSaveStatus('idle');
                                  alert("Error al eliminar responsable.");
                                }
                              }
                            }}
                            style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', padding: '4px' }}
                            title="Eliminar responsable"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <button type="button" onClick={() => { setIsManageUsersOpen(false); setEditingUser(null); }} className="btn btn-secondary" style={{ background: '#004B87', color: 'white', border: 'none' }}>Listo</button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hover-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--panel-shadow);
        }
        .table-row-interactive {
          transition: background-color 0.15s;
        }
        .table-row-interactive:hover {
          background-color: var(--bg-tertiary) !important;
        }
        .table-row-interactive input:focus, .table-row-interactive textarea:focus {
          background: var(--bg-secondary) !important;
          border-color: var(--accent-primary) !important;
          box-shadow: 0 0 0 2px rgba(0, 121, 193, 0.15);
          border-radius: 4px;
        }
        .stakeholders-table th, .incidents-table th {
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .gantt-task-row:hover {
          background-color: var(--bg-tertiary) !important;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
