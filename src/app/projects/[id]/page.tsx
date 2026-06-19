"use client";

import React, { useMemo, useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  useProjectStore, 
  Project, 
  Task, 
  Phase, 
  TaskStatus, 
  TaskPriority,
  CostItem
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
  ChevronUp,
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
import { InlineInput, InlineTextarea, InlineNumberInput, InlineDateInput, InlineCombobox, InlineMoneyInput } from '@/components/InlineInput';
import ReportViewer from '@/components/ReportViewer';
import { EquipmentCommentsModal } from '@/components/EquipmentCommentsModal';
import { parseComments } from '@/utils/commentUtils';
import { MessageSquare, Flag, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';


type ViewMode = 'day' | 'week' | 'month';
type TabType = 'summary' | 'dashboard' | 'gantt' | 'risks' | 'costs' | 'stakeholders' | 'incidents' | 'equipments';

const PHASE_STATUSES: EquipmentPhaseStatus[] = ['No iniciado', 'En progreso', 'Completado', 'Descartado', 'Desestimado'];

const RISK_CATEGORIES = ['Sistema LIS', 'Infraestructura', 'Comercial', 'Seguridad TI', 'Alcance', 'Otros'];
const RISK_STATUSES = ['Activo', 'Mitigado', 'Cerrado'];

const COST_CATEGORIES = ['Licencia Software', 'Hardware TI', 'Telecomunicaciones', 'Servicios Externos', 'Recursos Internos', 'Capacitación', 'Reserva', 'Otros'];
const OC_STATUSES = ['Pendiente', 'Emitida', 'Facturada', 'Pagada', 'N/A'];

export function getRiskLevel(probability: number, impact: number): 'Bajo' | 'Medio' | 'Alto' | 'Crítico' {
  if (impact === 1) return 'Bajo';
  if (impact === 2) {
    if (probability <= 3) return 'Bajo';
    return 'Medio';
  }
  if (impact === 3) {
    if (probability === 1) return 'Bajo';
    if (probability <= 4) return 'Medio';
    return 'Alto';
  }
  if (impact === 4) {
    if (probability === 1) return 'Medio';
    if (probability === 2) return 'Alto';
    return 'Crítico';
  }
  if (impact === 5) {
    if (probability === 1) return 'Alto';
    return 'Crítico';
  }
  return 'Bajo';
}

const RISK_LEVEL_COLORS: Record<'Bajo' | 'Medio' | 'Alto' | 'Crítico', { bg: string; text: string; border: string }> = {
  'Bajo': { bg: '#10b981', text: '#ffffff', border: '#059669' },
  'Medio': { bg: '#eab308', text: '#000000', border: '#ca8a04' },
  'Alto': { bg: '#f59e0b', text: '#ffffff', border: '#d97706' },
  'Crítico': { bg: '#ef4444', text: '#ffffff', border: '#dc2626' }
};

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

const PeriodStatusTextarea = ({
  initialValue,
  placeholder,
  onSave,
  style
}: {
  initialValue: string | null | undefined;
  placeholder: string;
  onSave: (val: string) => void;
  style?: React.CSSProperties;
}) => {
  const [val, setVal] = useState(initialValue || '');
  
  useEffect(() => {
    setVal(initialValue || '');
  }, [initialValue]);

  return (
    <textarea
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => {
        if (val !== (initialValue || '')) {
          onSave(val);
        }
      }}
      placeholder={placeholder}
      style={{
        width: '100%',
        minHeight: '120px',
        padding: '10px 14px',
        border: 'none',
        background: 'transparent',
        outline: 'none',
        resize: 'vertical',
        fontFamily: 'inherit',
        fontSize: '0.85rem',
        color: 'var(--text-primary)',
        lineHeight: '1.6',
        ...style
      }}
    />
  );
};

const renderSemaphoreCircle = (status: string | null | undefined) => {
  let color = '#9CA3AF'; // Gris por defecto
  if (status === 'Verde') color = '#10B981';
  if (status === 'Amarillo') color = '#F59E0B';
  if (status === 'Rojo') color = '#EF4444';
  return (
    <span style={{
      display: 'inline-block',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: color,
      marginRight: '8px',
      verticalAlign: 'middle',
      boxShadow: '0 0 4px rgba(0,0,0,0.1)'
    }} />
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

const BASE_AREA_COLORS: Record<string, string> = {
  'Tecnología': '#6366f1', 'Operaciones': '#f59e0b', 'Salud Digital': '#0079C1',
  'Clínico': '#10b981', 'Administración': '#8b5cf6', 'Finanzas': '#ef4444',
  'Marketing': '#ec4899', 'Legal': '#14b8a6',
};

const AREA_COLORS = new Proxy(BASE_AREA_COLORS, {
  get: (target, prop: string) => target[prop] || '#0079C1' // Default Bupa blue fallback
});

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
  const addRisk = useProjectStore(state => state.addRisk);
  const updateRisk = useProjectStore(state => state.updateRisk);
  const deleteRisk = useProjectStore(state => state.deleteRisk);
  const addCostItem = useProjectStore(state => state.addCostItem);
  const updateCostItem = useProjectStore(state => state.updateCostItem);
  const deleteCostItem = useProjectStore(state => state.deleteCostItem);

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
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  // Gantt Tab State
  const [editingTask, setEditingTask] = useState<{task: Task, phaseId: string, isNew: boolean} | null>(null);
  const [editingPhase, setEditingPhase] = useState<{phase: Phase, isNew: boolean} | null>(null);
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

  // Risks Tab State
  const [selectedRiskCell, setSelectedRiskCell] = useState<{ probability: number, impact: number } | null>(null);
  const [searchTermRisks, setSearchTermRisks] = useState('');
  const [filterLevelRisks, setFilterLevelRisks] = useState<string>('all');
  const [filterStatusRisks, setFilterStatusRisks] = useState<string>('all');

  // Costs Tab State
  const [searchTermCosts, setSearchTermCosts] = useState('');
  const [filterCategoryCosts, setFilterCategoryCosts] = useState<string>('all');
  const [filterStatusCosts, setFilterStatusCosts] = useState<string>('all');
  const [exchangeRates, setExchangeRates] = useState<{ usd: number; uf: number; date: string } | null>(null);
  const [customCategoryEditing, setCustomCategoryEditing] = useState<Record<string, boolean>>({});
  const [customCategoryInput, setCustomCategoryInput] = useState<Record<string, string>>({});
  const [costItemAttachmentsOpen, setCostItemAttachmentsOpen] = useState(false);
  const [activeCostItemForFiles, setActiveCostItemForFiles] = useState<CostItem | null>(null);
  const [isUploadingCostFile, setIsUploadingCostFile] = useState(false);

  // Fetch exchange rates on mount
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('/api/exchange-rates');
        if (res.ok) {
          const data = await res.json();
          setExchangeRates(data);
        }
      } catch (e) {
        console.error('Error fetching exchange rates:', e);
      }
    };
    fetchRates();
  }, []);

  // Equipments State
  const [searchTermEquipments, setSearchTermEquipments] = useState('');
  const [customColsEquipments, setCustomColsEquipments] = useState<string[]>([]);
  const [newColEquipment, setNewColEquipment] = useState('');
  const [isAddingColEquipment, setIsAddingColEquipment] = useState(false);
  const [collapsedRecintos, setCollapsedRecintos] = useState<Record<string, boolean>>({});
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [selectedEqForComments, setSelectedEqForComments] = useState<ClinicalEquipment | null>(null);

  // Modales & Reportability State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);

  // Project Edit Form State
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [editProjectManager, setEditProjectManager] = useState('');
  const [editProjectArea, setEditProjectArea] = useState('');
  const [isCustomArea, setIsCustomArea] = useState(false);
  const [editProjectStartDate, setEditProjectStartDate] = useState('');
  const [editProjectEndDate, setEditProjectEndDate] = useState('');
  const [editProjectHasEquipment, setEditProjectHasEquipment] = useState(false);

  // CRUD Responsibles state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('Ingeniero Biomédico');
  const [userMaxTasksLimit, setUserMaxTasksLimit] = useState(5);

  // Inline add user state
  const [isInlineAddUserOpen, setIsInlineAddUserOpen] = useState(false);
  const [inlineUserName, setInlineUserName] = useState('');
  const [inlineUserEmail, setInlineUserEmail] = useState('');
  const [inlineUserRole, setInlineUserRole] = useState('Project Manager');
  const [inlineUserMaxTasks, setInlineUserMaxTasks] = useState(5);
  const [inlineUserSuccessCallback, setInlineUserSuccessCallback] = useState<((name: string) => void) | null>(null);

  const handleOpenInlineAddUser = (onSuccess: (name: string) => void) => {
    setInlineUserName('');
    setInlineUserEmail('');
    setInlineUserRole('Project Manager');
    setInlineUserMaxTasks(5);
    setInlineUserSuccessCallback(() => onSuccess);
    setIsInlineAddUserOpen(true);
  };

  // Gantt Search & Filter States
  const [searchGanttTask, setSearchGanttTask] = useState('');
  const [filterGanttStatus, setFilterGanttStatus] = useState('all');
  const [filterGanttPriority, setFilterGanttPriority] = useState('all');
  const [showCriticalPath, setShowCriticalPath] = useState(false);

  // Column Widths for WBS Gantt Table with LocalStorage cache
  const [colWidths, setColWidths] = useState(() => {
    const defaultWidths = {
      id: 40,
      name: 240,
      startDate: 90,
      endDate: 90,
      realStartDate: 90,
      realEndDate: 90,
      assignee: 110,
      progress: 60,
      expectedProgress: 60,
      delay: 50,
      semaphore: 40,
      status: 120,
      estimatedCost: 95,
      realCost: 95,
      risk: 90,
      notes: 180,
      actions: 55
    };
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gantt_col_widths');
      if (saved) {
        try {
          return { ...defaultWidths, ...JSON.parse(saved) };
        } catch (e) {}
      }
    }
    return defaultWidths;
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('gantt_col_widths', JSON.stringify(colWidths));
  }, [colWidths]);

  // Handler to resize columns via mouse drag
  const handleResizeMouseDown = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = (colWidths as any)[colKey] || 80;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setColWidths((prev: any) => ({
        ...prev,
        [colKey]: Math.max(30, startWidth + deltaX)
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const totalWidth = useMemo<number>(() => {
    return (Object.values(colWidths) as number[]).reduce((a, b) => a + b, 0);
  }, [colWidths]);

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
    const rootTasks = project.phases.flatMap(ph => ph.tasks).filter(t => !t.parentId);
    if (rootTasks.length === 0) return 0;
    
    let totalWeightedProgress = 0;
    let totalDuration = 0;
    
    rootTasks.forEach(t => {
      totalDuration += t.duration;
      totalWeightedProgress += t.progress * t.duration;
    });
    
    return totalDuration > 0 ? Math.round(totalWeightedProgress / totalDuration) : 0;
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

    // Calcular el promedio real sobre todas las 6 fases fijas (de forma independiente a la UI)
    const allPhasesCalculated = allPhases.map(ph => ({
      name: ph.name,
      pct: sumPhase(ph.key as keyof ClinicalEquipment)
    }));
    const avgCompletion = allPhasesCalculated.length === 0 ? 100 : Math.round(allPhasesCalculated.reduce((sum, p) => sum + p.pct, 0) / allPhasesCalculated.length);

    // Filtrar las fases para mostrar en la interfaz de usuario de la tarjeta
    const activePhases = allPhases.filter(ph => !hiddenDefaultCols.includes(ph.key));
    const phs = activePhases.map(ph => ({
      name: ph.name,
      pct: sumPhase(ph.key as keyof ClinicalEquipment)
    }));

    return {
      total: totalEquips,
      completion: avgCompletion,
      phases: phs
    };
  }, [projectEquipments, hiddenDefaultCols, defaultColNames]);

  const projectRisks = useMemo(() => project?.risks || [], [project]);

  const filteredRisks = useMemo(() => {
    return projectRisks.filter(r => {
      // 1. Heatmap cell filter
      if (selectedRiskCell) {
        if (r.probability !== selectedRiskCell.probability || r.impact !== selectedRiskCell.impact) {
          return false;
        }
      }
      // 2. Search term
      const search = searchTermRisks.toLowerCase();
      if (search) {
        const descMatch = (r.description || '').toLowerCase().includes(search);
        const respMatch = (r.responsible || '').toLowerCase().includes(search);
        const obsMatch = (r.observations || '').toLowerCase().includes(search);
        const mitMatch = (r.mitigationPlan || '').toLowerCase().includes(search);
        if (!descMatch && !respMatch && !obsMatch && !mitMatch) {
          return false;
        }
      }
      // 3. Level filter
      if (filterLevelRisks !== 'all') {
        const level = getRiskLevel(r.probability, r.impact);
        if (level !== filterLevelRisks) {
          return false;
        }
      }
      // 4. Status filter
      if (filterStatusRisks !== 'all') {
        if (r.status !== filterStatusRisks) {
          return false;
        }
      }
      return true;
    });
  }, [projectRisks, selectedRiskCell, searchTermRisks, filterLevelRisks, filterStatusRisks]);

  const projectCostItems = useMemo(() => {
    const items = project?.costItems || [];
    return [...items].sort((a, b) => (a.indexId || '').localeCompare(b.indexId || ''));
  }, [project]);

  const filteredCostItems = useMemo(() => {
    return projectCostItems.filter(c => {
      const search = searchTermCosts.toLowerCase();
      if (search) {
        const descMatch = (c.description || '').toLowerCase().includes(search);
        const provMatch = (c.provider || '').toLowerCase().includes(search);
        const refMatch = (c.ocNumber || '').toLowerCase().includes(search);
        const obsMatch = (c.observations || '').toLowerCase().includes(search);
        if (!descMatch && !provMatch && !refMatch && !obsMatch) {
          return false;
        }
      }
      if (filterCategoryCosts !== 'all') {
        if (c.category !== filterCategoryCosts) {
          return false;
        }
      }
      if (filterStatusCosts !== 'all') {
        if (c.ocStatus !== filterStatusCosts) {
          return false;
        }
      }
      return true;
    });
  }, [projectCostItems, searchTermCosts, filterCategoryCosts, filterStatusCosts]);

  const financialTotals = useMemo(() => {
    const items = projectCostItems;
    
    const getItemNetAndGross = (originalVal: number, rate: number, tax: string) => {
      let net = 0;
      let gross = 0;
      const val = originalVal || 0;
      const r = rate || 1.0;
      
      if (tax === 'BRUTO') {
        gross = val * r;
        net = (val / 1.19) * r;
      } else if (tax === 'EXENTO') {
        net = val * r;
        gross = val * r;
      } else { // NETO
        net = val * r;
        gross = val * r * 1.19;
      }
      return { net, gross };
    };

    let totalBudgetNet = 0;
    let totalBudgetGross = 0;
    let totalCommittedNet = 0;
    let totalCommittedGross = 0;
    let totalExecutedNet = 0;
    let totalExecutedGross = 0;

    items.forEach(item => {
      const origBudget = item.originalBudget !== undefined && item.originalBudget !== null ? item.originalBudget : item.approvedBudget;
      const b = getItemNetAndGross(origBudget, item.exchangeRate || 1.0, item.taxType || 'NETO');
      totalBudgetNet += b.net;
      totalBudgetGross += b.gross;

      const origReal = item.originalRealCost !== undefined && item.originalRealCost !== null ? item.originalRealCost : item.realCost;
      const r = getItemNetAndGross(origReal, item.exchangeRate || 1.0, item.taxType || 'NETO');
      totalExecutedNet += r.net;
      totalExecutedGross += r.gross;

      const commVal = parseFloat(item.ocEmitted || '') || 0;
      const c = getItemNetAndGross(commVal, item.exchangeRate || 1.0, item.taxType || 'NETO');
      totalCommittedNet += c.net;
      totalCommittedGross += c.gross;
    });

    const availableBalanceNet = totalBudgetNet - totalExecutedNet;
    const availableBalanceGross = totalBudgetGross - totalExecutedGross;
    const executionPercentage = totalBudgetNet > 0 ? (totalExecutedNet / totalBudgetNet) * 100 : 0;

    return {
      totalBudget: totalBudgetNet,
      totalBudgetNet,
      totalBudgetGross,
      totalCommitted: totalCommittedNet,
      totalCommittedNet,
      totalCommittedGross,
      totalExecuted: totalExecutedNet,
      totalExecutedNet,
      totalExecutedGross,
      availableBalance: availableBalanceNet,
      availableBalanceNet,
      availableBalanceGross,
      executionPercentage
    };
  }, [projectCostItems]);

  const filteredFinancialSums = useMemo(() => {
    const getItemNetAndGross = (originalVal: number, rate: number, tax: string) => {
      let net = 0;
      let gross = 0;
      const val = originalVal || 0;
      const r = rate || 1.0;
      
      if (tax === 'BRUTO') {
        gross = val * r;
        net = (val / 1.19) * r;
      } else if (tax === 'EXENTO') {
        net = val * r;
        gross = val * r;
      } else { // NETO
        net = val * r;
        gross = val * r * 1.19;
      }
      return { net, gross };
    };

    let budgetNet = 0;
    let budgetGross = 0;
    let committedNet = 0;
    let committedGross = 0;
    let executedNet = 0;
    let executedGross = 0;

    filteredCostItems.forEach(item => {
      const origBudget = item.originalBudget !== undefined && item.originalBudget !== null ? item.originalBudget : item.approvedBudget;
      const b = getItemNetAndGross(origBudget, item.exchangeRate || 1.0, item.taxType || 'NETO');
      budgetNet += b.net;
      budgetGross += b.gross;

      const origReal = item.originalRealCost !== undefined && item.originalRealCost !== null ? item.originalRealCost : item.realCost;
      const r = getItemNetAndGross(origReal, item.exchangeRate || 1.0, item.taxType || 'NETO');
      executedNet += r.net;
      executedGross += r.gross;

      const commVal = parseFloat(item.ocEmitted || '') || 0;
      const c = getItemNetAndGross(commVal, item.exchangeRate || 1.0, item.taxType || 'NETO');
      committedNet += c.net;
      committedGross += c.gross;
    });

    return {
      budgetNet,
      budgetGross,
      committedNet,
      committedGross,
      executedNet,
      executedGross
    };
  }, [filteredCostItems]);

  const formatDateForInput = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return format(d, 'yyyy-MM-dd');
  };

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

  const [predecessorSearch, setPredecessorSearch] = useState('');
  const [predecessorDropdownOpen, setPredecessorDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const filteredPredecessorOptions = useMemo(() => {
    if (!editingTask) return [];
    const currentDeps = editingTask.task.dependencies || [];
    
    return allTasks.filter(t => {
      // Exclude self
      if (t.id === editingTask.task.id) return false;
      // Exclude existing dependencies
      if (currentDeps.includes(t.id)) return false;
      // Exclude child subtasks of current task to prevent hierarchy loops
      if (t.parentId === editingTask.task.id) return false;
      // Exclude tasks that already list the current task as a dependency to prevent circular references
      if (t.dependencies && t.dependencies.includes(editingTask.task.id)) return false;
      
      if (predecessorSearch) {
        const q = predecessorSearch.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesWbs = t.wbsId ? t.wbsId.toLowerCase().includes(q) : false;
        return matchesName || matchesWbs;
      }
      return true;
    });
  }, [allTasks, editingTask, predecessorSearch]);

  // Obsolete Gantt specific calendar calculations removed since Tab 2 is now a pure data spreadsheet table

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

  const handleCreateRisk = async () => {
    if (!project) return;
    const nextIndexId = `R${String((project.risks || []).length + 1).padStart(2, '0')}`;
    const defaultUser = users.length > 0 ? users[0].name : 'PMO Admin';
    const newRisk = {
      indexId: nextIndexId,
      description: '',
      category: 'Sistema LIS',
      probability: 3,
      impact: 3,
      mitigationPlan: '',
      responsible: defaultUser,
      status: 'Activo',
      associatedActivity: '',
      mitigationCost: 0,
      observations: '',
      limitDate: null
    };
    try {
      await addRisk(project.id, newRisk);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRisk = async (riskId: string, updates: any) => {
    if (!project) return;
    setSaveStatus('saving');
    try {
      await updateRisk(project.id, riskId, updates);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (e) {
      console.error(e);
      setSaveStatus('idle');
    }
  };

  const handleDeleteRisk = async (riskId: string) => {
    if (!project) return;
    if (confirm('¿Está seguro de eliminar este riesgo?')) {
      try {
        await deleteRisk(project.id, riskId);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCreateCostItem = async () => {
    if (!project) return;
    const nextIndexId = `C${String((project.costItems || []).length + 1).padStart(2, '0')}`;
    const defaultUser = users.length > 0 ? users[0].name : 'PMO Admin';
    const newCostItem = {
      indexId: nextIndexId,
      description: '',
      category: 'Licencia Software',
      provider: defaultUser,
      approvedBudget: 0,
      currency: 'CLP',
      originalBudget: 0,
      exchangeRate: 1.0,
      ocEmitted: '',
      ocNumber: '',
      realCost: 0,
      originalRealCost: 0,
      ocStatus: 'Pendiente',
      observations: '',
      taxType: 'NETO'
    };
    try {
      await addCostItem(project.id, newCostItem);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCostItem = async (itemId: string, updates: any) => {
    if (!project) return;
    setSaveStatus('saving');
    try {
      await updateCostItem(project.id, itemId, updates);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (e) {
      console.error(e);
      setSaveStatus('idle');
    }
  };

  const handleDeleteCostItem = async (itemId: string) => {
    if (!project) return;
    if (confirm('¿Está seguro de eliminar este ítem de costo?')) {
      try {
        await deleteCostItem(project.id, itemId);
      } catch (e) {
        console.error(e);
      }
    }
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

  const handleUploadFile = async (file: File) => {
    if (!editingTask || editingTask.isNew) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/tasks/${editingTask.task.id}/attachments`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al subir archivo');
      }

      const newAttachment = await response.json();

      // Update local state
      const updatedAttachments = [...(editingTask.task.attachments || []), newAttachment];
      setEditingTask({
        ...editingTask,
        task: {
          ...editingTask.task,
          attachments: updatedAttachments
        }
      });

      // Reload project store to keep in sync
      await fetchProjects();
    } catch (err: any) {
      alert(`Error al subir el archivo: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (editingTask?.isNew) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteAttachment = async (e: React.MouseEvent, attachmentId: string) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de eliminar este archivo adjunto?')) return;
    
    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al eliminar archivo');
      }

      // Update local state
      if (editingTask) {
        const updatedAttachments = (editingTask.task.attachments || []).filter(
          att => att.id !== attachmentId
        );
        setEditingTask({
          ...editingTask,
          task: {
            ...editingTask.task,
            attachments: updatedAttachments
          }
        });
      }

      // Reload project store to keep in sync
      await fetchProjects();
    } catch (err: any) {
      alert(`Error al eliminar el archivo: ${err.message}`);
    }
  };

  const handleUploadCostFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCostItemForFiles) return;

    setIsUploadingCostFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/costs/${activeCostItemForFiles.id}/attachments`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al subir archivo');
      }

      const newAttachment = await response.json();
      
      const updatedAttachments = [...(activeCostItemForFiles.attachments || []), newAttachment];
      const updatedCostItem = {
        ...activeCostItemForFiles,
        attachments: updatedAttachments
      };
      setActiveCostItemForFiles(updatedCostItem);

      await fetchProjects();
    } catch (err: any) {
      alert(`Error al subir el archivo: ${err.message}`);
    } finally {
      setIsUploadingCostFile(false);
    }
  };

  const handleDeleteCostFile = async (attachmentId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo?')) return;
    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al eliminar archivo');
      }

      if (activeCostItemForFiles) {
        const updatedAttachments = (activeCostItemForFiles.attachments || []).filter(
          att => att.id !== attachmentId
        );
        const updatedCostItem = {
          ...activeCostItemForFiles,
          attachments: updatedAttachments
        };
        setActiveCostItemForFiles(updatedCostItem);
      }

      await fetchProjects();
    } catch (err: any) {
      alert(`Error al eliminar el archivo: ${err.message}`);
    }
  };

  const currentActiveCostItem = useMemo(() => {
    if (!activeCostItemForFiles || !project) return null;
    return (project.costItems || []).find(c => c.id === activeCostItemForFiles.id) || activeCostItemForFiles;
  }, [activeCostItemForFiles, project]);

  const handleExportProjectToExcel = () => {
    if (!project) return;

    // Helper to format Date as YYYY-MM-DD
    const formatDateStr = (d: any) => {
      if (!d) return '';
      const date = new Date(d);
      if (isNaN(date.getTime())) return '';
      return format(date, 'yyyy-MM-dd');
    };

    // Rows array for SheetJS
    const rows: any[] = [];

    // Traverse phases and tasks
    project.phases.forEach((phase) => {
      // 1. Add Phase row
      rows.push({
        WBS: phase.wbsId || '',
        Tipo: 'FASE',
        Nombre: phase.name.toUpperCase(),
        'Duración Plan (Días)': differenceInDays(new Date(phase.endDate), new Date(phase.startDate)) || 0,
        'Inicio Plan': formatDateStr(phase.startDate),
        'Fin Plan': formatDateStr(phase.endDate),
        'Inicio Real': '',
        'Fin Real': '',
        '% Avance': `${phase.progress}%`,
        '% Esperado': '',
        Desviación: '',
        Responsable: '',
        Estado: phase.progress === 100 ? 'Completado' : (phase.progress > 0 ? 'En Progreso' : 'Sin Iniciar'),
        Prioridad: '',
        'Costo Estimado': '',
        'Costo Real': '',
        Riesgo: '',
        Observación: 'Fase del proyecto'
      });

      // Helper for recursive task addition (DFS)
      const addTaskRowRecursive = (task: Task, depth: number, wbsStr: string) => {
        // Calculate expected progress
        const expectedProgress = (() => {
          const today = new Date();
          today.setHours(0,0,0,0);
          const start = new Date(task.startDate);
          start.setHours(0,0,0,0);
          const end = new Date(task.endDate);
          end.setHours(0,0,0,0);
          if (today < start) return 0;
          if (today > end) return 100;
          const totalDays = differenceInDays(end, start);
          if (totalDays <= 0) return 100;
          const elapsed = differenceInDays(today, start);
          return Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
        })();

        // Indent task name to show hierarchy
        const indentation = '   '.repeat(depth);

        rows.push({
          WBS: wbsStr,
          Tipo: depth === 0 ? 'ACTIVIDAD' : 'SUB-ACTIVIDAD',
          Nombre: indentation + task.name,
          'Duración Plan (Días)': task.duration,
          'Inicio Plan': formatDateStr(task.startDate),
          'Fin Plan': formatDateStr(task.endDate),
          'Inicio Real': formatDateStr(task.realStartDate),
          'Fin Real': formatDateStr(task.realEndDate),
          '% Avance': `${task.progress}%`,
          '% Esperado': `${expectedProgress}%`,
          Desviación: task.delayDays !== null && task.delayDays !== undefined ? task.delayDays : 0,
          Responsable: task.assignee || '',
          Estado: task.status === 'Completed' ? 'Completado' : (task.status === 'In Progress' ? 'En Progreso' : (task.status === 'At Risk' ? 'En Riesgo' : 'Sin Iniciar')),
          Prioridad: task.priority || 'Media',
          'Costo Estimado': task.estimatedCost || 0,
          'Costo Real': task.realCost || 0,
          Riesgo: task.risk || '',
          Observación: task.notes || ''
        });

        // Find and sort subtasks
        const subtasks = phase.tasks.filter(t => t.parentId === task.id);
        subtasks.forEach((sub, idx) => {
          addTaskRowRecursive(sub, depth + 1, `${wbsStr}.${idx + 1}`);
        });
      };

      // 2. Add root tasks of this phase
      const rootTasks = phase.tasks.filter(t => !t.parentId);
      rootTasks.forEach((task, idx) => {
        addTaskRowRecursive(task, 0, `${phase.wbsId}.${idx + 1}`);
      });
    });

    // Create Worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Apply header style and column widths
    const max_len = rows.reduce((w, r) => Math.max(w, r.Nombre ? r.Nombre.length : 10), 10);
    worksheet['!cols'] = [
      { wch: 8 },  // WBS
      { wch: 15 }, // Tipo
      { wch: Math.min(max_len + 4, 50) }, // Nombre
      { wch: 20 }, // Duración
      { wch: 12 }, // Inicio Plan
      { wch: 12 }, // Fin Plan
      { wch: 12 }, // Inicio Real
      { wch: 12 }, // Fin Real
      { wch: 10 }, // % Avance
      { wch: 12 }, // % Esperado
      { wch: 12 }, // Desviación
      { wch: 20 }, // Responsable
      { wch: 15 }, // Estado
      { wch: 10 }, // Prioridad
      { wch: 15 }, // Costo Est
      { wch: 15 }, // Costo Real
      { wch: 15 }, // Riesgo
      { wch: 30 }  // Observación
    ];

    // Create Workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cronograma');

    // 3. Create CostItems Worksheet
    const costRows: any[] = [];
    const costItems = [...(project.costItems || [])].sort((a, b) => (a.indexId || '').localeCompare(b.indexId || ''));
    
    costItems.forEach(item => {
      const origBudget = item.originalBudget !== undefined && item.originalBudget !== null ? item.originalBudget : item.approvedBudget;
      const origReal = item.originalRealCost !== undefined && item.originalRealCost !== null ? item.originalRealCost : item.realCost;
      
      const getItemNetAndGross = (val: number, r: number, tax: string) => {
        let net = 0;
        let gross = 0;
        if (tax === 'BRUTO') {
          gross = val * r;
          net = (val / 1.19) * r;
        } else if (tax === 'EXENTO') {
          net = val * r;
          gross = val * r;
        } else { // NETO
          net = val * r;
          gross = val * r * 1.19;
        }
        return { net, gross };
      };

      const b = getItemNetAndGross(origBudget, item.exchangeRate || 1.0, item.taxType || 'NETO');
      const r = getItemNetAndGross(origReal, item.exchangeRate || 1.0, item.taxType || 'NETO');
      const c = getItemNetAndGross(parseFloat(item.ocEmitted || '') || 0, item.exchangeRate || 1.0, item.taxType || 'NETO');

      costRows.push({
        'ID Costo': item.indexId,
        'Descripción': item.description,
        'Categoría': item.category || '',
        'Proveedor / Responsable': item.provider || '',
        'Moneda Original': item.currency,
        'Monto Presupuesto Orig.': origBudget,
        'Monto Costo Real Orig.': origReal,
        'Tipo Cambio': item.exchangeRate || 1.0,
        'Condición IVA': item.taxType || 'NETO',
        'Presupuesto Neto (CLP)': Math.round(b.net),
        'Presupuesto IVA Incluido (CLP)': Math.round(b.gross),
        'Comprometido Neto (CLP)': Math.round(c.net),
        'Comprometido IVA Incluido (CLP)': Math.round(c.gross),
        'Ejecutado Neto (CLP)': Math.round(r.net),
        'Ejecutado IVA Incluido (CLP)': Math.round(r.gross),
        'N° OC / Ref': item.ocNumber || '',
        'Estado OC': item.ocStatus || 'Pendiente',
        'Observación': item.observations || ''
      });
    });

    const costWorksheet = XLSX.utils.json_to_sheet(costRows);
    costWorksheet['!cols'] = [
      { wch: 10 }, // ID Costo
      { wch: 30 }, // Descripción
      { wch: 20 }, // Categoría
      { wch: 25 }, // Responsable
      { wch: 15 }, // Moneda Original
      { wch: 22 }, // Presupuesto Orig
      { wch: 22 }, // Costo Real Orig
      { wch: 15 }, // Tipo Cambio
      { wch: 15 }, // Condición IVA
      { wch: 22 }, // Presupuesto Neto
      { wch: 22 }, // Presupuesto IVA Incluido
      { wch: 22 }, // Comprometido Neto
      { wch: 22 }, // Comprometido IVA Incluido
      { wch: 22 }, // Ejecutado Neto
      { wch: 22 }, // Ejecutado IVA Incluido
      { wch: 15 }, // OC Ref
      { wch: 15 }, // Estado OC
      { wch: 30 }  // Observación
    ];

    XLSX.utils.book_append_sheet(workbook, costWorksheet, 'Control de Costos');

    // Download Workbook
    const dateStr = format(new Date(), 'dd-MM-yyyy');
    const sanitizedProjName = project.name.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `Reporte_Fiel_Proyecto_${sanitizedProjName}_${dateStr}.xlsx`);
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

  // Obsolete handleTaskDragStart removed

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
      scopeStatus: 'ACTIVE',
      releasePhaseId: null,
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

  const expectedProgressGlobal = useMemo(() => {
    if (!project) return 0;
    const rootTasks = project.phases.flatMap(ph => ph.tasks).filter(t => !t.parentId);
    if (rootTasks.length === 0) return 0;
    
    let totalWeightedExpected = 0;
    let totalDuration = 0;
    
    rootTasks.forEach(t => {
      totalDuration += t.duration;
      const tExp = (() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const start = new Date(t.startDate);
        start.setHours(0,0,0,0);
        const end = new Date(t.endDate);
        end.setHours(0,0,0,0);
        if (today < start) return 0;
        if (today > end) return 100;
        const totalDays = differenceInDays(end, start);
        if (totalDays <= 0) return 100;
        const elapsed = differenceInDays(today, start);
        return Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
      })();
      totalWeightedExpected += tExp * t.duration;
    });
    
    return totalDuration > 0 ? Math.round(totalWeightedExpected / totalDuration) : 0;
  }, [project]);

  const projectDeviationDays = useMemo(() => {
    if (!project) return 0;
    const rootTasks = project.phases.flatMap(ph => ph.tasks).filter(t => !t.parentId);
    if (rootTasks.length === 0) return 0;
    return rootTasks.reduce((sum, t) => sum + (t.delayDays || 0), 0);
  }, [project]);

  const consolidatedRisk = useMemo(() => {
    if (!project) return 'Bajo';
    const tasks = project.phases.flatMap(ph => ph.tasks);
    const risks = tasks.map(t => t.risk).filter(Boolean);
    if (risks.includes('Alto')) return 'Alto';
    if (risks.includes('Medio')) return 'Medio';
    return 'Bajo';
  }, [project]);

  const totalBudget = useMemo(() => {
    return financialTotals.totalBudgetNet;
  }, [financialTotals]);

  const totalRealCost = useMemo(() => {
    return financialTotals.totalExecutedNet;
  }, [financialTotals]);

  const projectSemaphore = useMemo(() => {
    if (projectDeviationDays > 5) return { label: 'Rojo', color: '#EF4444', bg: '#FEE2E2', icon: '🔴' };
    if (projectDeviationDays > 0) return { label: 'Amarillo', color: '#F59E0B', bg: '#FEF3C7', icon: '🟡' };
    return { label: 'Verde', color: '#10B981', bg: '#D1FAE5', icon: '🟢' };
  }, [projectDeviationDays]);

  // Auto-populate or default statusTime to projectSemaphore.label
  useEffect(() => {
    if (project && projectSemaphore.label && project.statusTime !== projectSemaphore.label) {
      updateProject(project.id, { statusTime: projectSemaphore.label });
    }
  }, [project?.id, projectSemaphore.label, project?.statusTime, updateProject]);

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

  // WBS row renderer for Gestor tab (pure table, no Gantt timeline)
  const renderGestorTaskRow = (task: Task, phase: Phase, depth: number = 0) => {
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
          {!collapsedPhases[phase.id] && subtasks.map(sub => renderGestorTaskRow(sub, phase, depth))}
        </React.Fragment>
      );
    }

    const isAtRisk = task.status === 'At Risk';
    const isCritical = showCriticalPath && criticalTaskIds.has(task.id);
    const isMilestone = task.duration === 0;

    // Calculate expected progress
    const expectedProgress = (() => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const start = new Date(task.startDate);
      start.setHours(0,0,0,0);
      const end = new Date(task.endDate);
      end.setHours(0,0,0,0);
      if (today < start) return 0;
      if (today > end) return 100;
      const totalDays = differenceInDays(end, start);
      if (totalDays <= 0) return 100;
      const elapsed = differenceInDays(today, start);
      return Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
    })();

    // Semaphore formatting
    const semIcon = task.semaphore === 'Rojo' ? '🔴' : task.semaphore === 'Amarillo' ? '🟡' : '🟢';

    return (
      <React.Fragment key={task.id}>
        <div 
          className="gantt-task-row"
          style={{ 
            display: 'flex', 
            borderBottom: '1px solid var(--border-subtle)', 
            cursor: 'pointer', 
            transition: 'background 0.2s', 
            background: 'var(--bg-secondary)',
            borderLeft: isCritical ? '4px solid #ef4444' : 'none',
            alignItems: 'center',
            height: '44px',
            width: '100%',
            minWidth: `${totalWidth}px`
          }} 
          onClick={() => handleTaskClick(task, phase.id)}
        >
          {/* 1. ID */}
          <div style={{ width: `${colWidths.id}px`, flexShrink: 0, padding: '0 8px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '0.78rem', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {task.wbsId || '-'}
          </div>

          {/* 2. Fase / Actividad */}
          <div style={{ width: `${colWidths.name}px`, flexShrink: 0, paddingLeft: `${8 + (depth * 16)}px`, paddingRight: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: depth === 0 ? '600' : 'normal', overflow: 'hidden', borderRight: '1px solid var(--border-subtle)', height: '100%' }}>
            {isAtRisk && <AlertTriangle size={12} color="var(--accent-danger)" style={{ flexShrink: 0 }} />}
            <span style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); handleTaskClick(task, phase.id); }}>
              <InlineInput value={task.name} onSave={(val) => updateTask(project.id, phase.id, task.id, { name: val })} />
            </span>
          </div>

          {/* 3. Inicio Plan */}
          <div style={{ width: `${colWidths.startDate}px`, flexShrink: 0, padding: '0 4px', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <InlineDateInput value={task.startDate} onSave={(val) => val && updateTask(project.id, phase.id, task.id, { startDate: new Date(val) })} />
          </div>

          {/* 4. Término Plan */}
          <div style={{ width: `${colWidths.endDate}px`, flexShrink: 0, padding: '0 4px', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <InlineDateInput value={task.endDate} onSave={(val) => val && updateTask(project.id, phase.id, task.id, { endDate: new Date(val) })} />
          </div>

          {/* 5. Inicio Real */}
          <div style={{ width: `${colWidths.realStartDate}px`, flexShrink: 0, padding: '0 4px', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <InlineDateInput value={task.realStartDate} onSave={(val) => updateTask(project.id, phase.id, task.id, { realStartDate: val ? new Date(val) : null })} />
          </div>

          {/* 6. Término Real */}
          <div style={{ width: `${colWidths.realEndDate}px`, flexShrink: 0, padding: '0 4px', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <InlineDateInput value={task.realEndDate} onSave={(val) => updateTask(project.id, phase.id, task.id, { realEndDate: val ? new Date(val) : null })} />
          </div>

          {/* 7. PM/Resp. */}
          <div style={{ width: `${colWidths.assignee}px`, flexShrink: 0, padding: '0 6px', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <InlineCombobox
              value={task.assignee}
              onSave={(val) => {
                if (val) updateTask(project.id, phase.id, task.id, { assignee: val });
              }}
              options={['Sin Asignar', ...users.map(u => u.name)]}
              placeholder="Asignar..."
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                color: '#475569',
                background: '#F1F5F9',
                borderRadius: '12px',
                padding: '3px 8px',
              }}
            />
          </div>

          {/* 8. % Av. R. */}
          <div style={{ width: `${colWidths.progress}px`, flexShrink: 0, padding: '0 4px', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
            <InlineNumberInput value={task.progress} formatType="percent" min={0} max={100} onSave={(val) => updateTask(project.id, phase.id, task.id, { progress: val || 0 })} style={{ textAlign: 'center' }} />
          </div>

          {/* 9. % Esp. */}
          <div style={{ width: `${colWidths.expectedProgress}px`, flexShrink: 0, padding: '0 4px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 'bold', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {expectedProgress}%
          </div>

          {/* 10. Desv. */}
          <div style={{ width: `${colWidths.delay}px`, flexShrink: 0, padding: '0 4px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 'bold', color: (task.delayDays || 0) > 0 ? 'var(--accent-danger)' : 'var(--accent-success)', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(task.delayDays || 0) > 0 ? `+${task.delayDays}` : task.delayDays || 0}
          </div>

          {/* 11. Sem. */}
          <div style={{ width: `${colWidths.semaphore}px`, flexShrink: 0, textAlign: 'center', fontSize: '0.85rem', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={`Semáforo: ${task.semaphore}`}>
            {semIcon}
          </div>

          {/* 12. Estado */}
          <div style={{ width: `${colWidths.status}px`, flexShrink: 0, padding: '0 6px', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <select
              value={task.status}
              onChange={(e) => updateTask(project.id, phase.id, task.id, { status: e.target.value as TaskStatus })}
              style={{
                width: '100%',
                fontSize: '0.72rem',
                background: task.status === 'Completed' ? '#E6F4F1' : task.status === 'In Progress' ? '#E0F2FE' : task.status === 'At Risk' ? '#FFE4E6' : '#F1F5F9',
                border: 'none',
                borderRadius: '12px',
                padding: '3px 8px',
                textAlign: 'center',
                outline: 'none',
                fontWeight: 'bold',
                color: task.status === 'Completed' ? '#0D9488' : task.status === 'In Progress' ? '#0284C7' : task.status === 'At Risk' ? '#E11D48' : '#64748B',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
            >
              <option value="Not Started">Sin Iniciar</option>
              <option value="In Progress">En Progreso</option>
              <option value="Completed">Completada</option>
              <option value="At Risk">En Riesgo</option>
            </select>
          </div>

          {/* 13. C. Est. */}
          <div style={{ width: `${colWidths.estimatedCost}px`, flexShrink: 0, padding: '0 4px', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
            <InlineNumberInput value={task.estimatedCost} formatType="currency" onSave={(val) => updateTask(project.id, phase.id, task.id, { estimatedCost: val })} style={{ textAlign: 'right' }} />
          </div>

          {/* 14. C. Real. */}
          <div style={{ width: `${colWidths.realCost}px`, flexShrink: 0, padding: '0 4px', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
            <InlineNumberInput value={task.realCost} formatType="currency" onSave={(val) => updateTask(project.id, phase.id, task.id, { realCost: val })} style={{ textAlign: 'right' }} />
          </div>

          {/* 15. Riesgo */}
          <div style={{ width: `${colWidths.risk}px`, flexShrink: 0, padding: '0 6px', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <select
              value={task.risk || 'Bajo'}
              onChange={(e) => updateTask(project.id, phase.id, task.id, { risk: e.target.value })}
              style={{
                width: '100%',
                fontSize: '0.72rem',
                background: task.risk === 'Alto' ? '#FFE4E6' : task.risk === 'Medio' ? '#FEF3C7' : '#E6F4F1',
                border: 'none',
                borderRadius: '12px',
                padding: '3px 8px',
                textAlign: 'center',
                outline: 'none',
                fontWeight: 'bold',
                color: task.risk === 'Alto' ? '#E11D48' : task.risk === 'Medio' ? '#D97706' : '#0D9488',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
            >
              <option value="Bajo">Bajo</option>
              <option value="Medio">Medio</option>
              <option value="Alto">Alto</option>
            </select>
          </div>

          {/* 16. Observación */}
          <div style={{ width: `${colWidths.notes}px`, flexShrink: 0, padding: '0 4px', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <InlineInput value={task.notes || ''} placeholder="Notas..." onSave={(val) => updateTask(project.id, phase.id, task.id, { notes: val })} />
          </div>

          {/* 17. Acc. */}
          <div style={{ width: `${colWidths.actions}px`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '100%' }} onClick={(e) => e.stopPropagation()}>
            <button 
              className="icon-btn" 
              style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} 
              title="Añadir Subtarea" 
              onClick={(e) => handleCreateSubtask(e, task.id, phase.id)}
            >
              <Plus size={14} color="var(--accent-primary)" />
            </button>
            <button 
              className="icon-btn" 
              style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} 
              title="Eliminar Tarea" 
              onClick={() => { if (confirm('¿Estás seguro de eliminar esta tarea?')) deleteTask(project.id, phase.id, task.id); }}
            >
              <Trash2 size={13} color="var(--accent-danger)" />
            </button>
          </div>

        </div>
        {!collapsedPhases[phase.id] && subtasks.map(sub => renderGestorTaskRow(sub, phase, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', paddingBottom: '24px' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Hide HTML5 input type="number" spin buttons */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }

        /* Resize handles hover effects */
        .resize-handle {
          background: transparent;
          transition: background 0.15s ease, width 0.15s ease;
        }
        .resize-handle:hover {
          background: var(--accent-primary) !important;
          width: 4px !important;
        }

        /* Zebra striping for task rows to optimize visual tracking */
        .gantt-task-row:nth-child(even) {
          background: var(--bg-tertiary) !important;
        }
        .gantt-task-row:hover {
          background: var(--bg-hover) !important;
        }
      `}} />
      
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
              {!isHeaderCollapsed && (
                <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0', fontSize: '0.9rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={project.description}>
                  {project.description || 'Sin descripción detallada del alcance.'}
                </p>
              )}
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

        {/* Project Metadata Mini Row & KPI Boxes Grid */}
        {!isHeaderCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            
            {/* Top metadata info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} color="var(--text-muted)" />
                  <span style={{ color: 'var(--text-secondary)' }}>Director / PM:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{project.manager || 'No asignado'}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="var(--text-muted)" />
                  <span style={{ color: 'var(--text-secondary)' }}>Plazo:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{format(new Date(project.startDate), 'dd MMM yy')} — {format(new Date(project.endDate), 'dd MMM yy')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} color="var(--text-muted)" />
                  <span style={{ color: 'var(--text-secondary)' }}>Plazo de Entrega:</span>
                  <strong style={{ color: (progress === 100 || projectStatus === 'Completado') ? 'var(--accent-success)' : daysRemaining < 0 ? 'var(--accent-danger)' : daysRemaining < 7 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                    {(progress === 100 || projectStatus === 'Completado') ? 'Finalizado' : daysRemaining < 0 ? `Vencido hace ${Math.abs(daysRemaining)} días` : daysRemaining === 0 ? 'Vence hoy' : `${daysRemaining} días restantes`}
                  </strong>
                </div>
              </div>
            </div>

            {/* KPI Boxes Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              
              {/* 1. % AVANCE GLOBAL */}
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '76px', background: 'var(--bg-tertiary)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>% Avance Global</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{progress}%</div>
              </div>

              {/* 2. % ESPERADO (HOY) */}
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '76px', background: 'var(--bg-tertiary)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>% Esperado (Hoy)</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{expectedProgressGlobal}%</div>
              </div>

              {/* 3. DESVIACIÓN (días) */}
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '76px', background: 'var(--bg-tertiary)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Desviación (días)</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: projectDeviationDays > 0 ? 'var(--accent-danger)' : 'var(--accent-success)', fontFamily: 'monospace' }}>
                  {projectDeviationDays > 0 ? `+${projectDeviationDays}` : projectDeviationDays}
                </div>
              </div>

              {/* 4. RIESGO CONSOLID. */}
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '76px', background: 'var(--bg-tertiary)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Riesgo Consolid.</div>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 900, 
                  padding: '2px 8px', 
                  borderRadius: '6px', 
                  background: consolidatedRisk === 'Alto' ? 'rgba(239, 68, 68, 0.15)' : consolidatedRisk === 'Medio' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: consolidatedRisk === 'Alto' ? '#EF4444' : consolidatedRisk === 'Medio' ? '#F59E0B' : '#10B981',
                  textTransform: 'uppercase'
                }}>
                  {consolidatedRisk}
                </span>
              </div>

              {/* 5. COSTO EJECUTADO */}
              <div className="glass-panel" style={{ padding: '8px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '76px', background: 'var(--bg-tertiary)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Costo Ejecutado</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  N: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(financialTotals.totalExecutedNet)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%', whiteSpace: 'nowrap' }}>
                  IVA Inc: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(financialTotals.totalExecutedGross)}
                </div>
              </div>

              {/* 6. PRESUPUESTO APROBADO */}
              <div className="glass-panel" style={{ padding: '8px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '76px', background: 'var(--bg-tertiary)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Presupuesto Aprobado</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  N: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(financialTotals.totalBudgetNet)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%', whiteSpace: 'nowrap' }}>
                  IVA Inc: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(financialTotals.totalBudgetGross)}
                </div>
              </div>

              {/* 7. DÍAS RESTANTES */}
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '76px', background: 'var(--bg-tertiary)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Días Restantes</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: daysRemaining < 0 ? 'var(--accent-danger)' : daysRemaining < 7 ? 'var(--accent-warning)' : 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {daysRemaining < 0 ? 0 : daysRemaining}
                </div>
              </div>

              {/* 8. SEMÁFORO PROYECTO */}
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '76px', background: 'var(--bg-tertiary)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Semáforo Proyecto</div>
                <span style={{ 
                  fontSize: '0.72rem', 
                  fontWeight: 900, 
                  padding: '2px 8px', 
                  borderRadius: '6px', 
                  background: projectSemaphore.bg,
                  color: projectSemaphore.color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textTransform: 'uppercase'
                }}>
                  <span>{projectSemaphore.icon}</span>
                  <span>{projectSemaphore.label}</span>
                </span>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* 2. Tabs Enterprise Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1px', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(() => {
            const tabs = [
              { id: 'summary', label: '📄 Ficha Resumen' },
              { id: 'dashboard', label: '📊 Cuadro de Mando (Dashboard)' },
              { id: 'gantt', label: '📋 Gestor de Datos (Tabla)' },
              { id: 'risks', label: `⚡ Registro de Riesgos (${(project?.risks || []).length})` },
              { id: 'costs', label: `💰 Control de Costos (${(project?.costItems || []).length})` },
              { id: 'stakeholders', label: `👥 Matriz Stakeholders (${projectStakeholders.length})` },
              { id: 'incidents', label: `⚠️ Log de Incidentes (${projectIncidents.length})` },
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

        {/* Toggle Header Button */}
        <button
          onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: 'var(--bg-tertiary)',
            color: 'var(--accent-primary)',
            border: '1px solid var(--border-subtle)',
            borderBottom: 'none',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 800,
            transition: 'all 0.2s',
            marginBottom: '-1px',
            boxShadow: '0 -2px 4px rgba(0,0,0,0.02)'
          }}
          title={isHeaderCollapsed ? "Expandir información del proyecto" : "Colapsar cabecera para maximizar el área de trabajo"}
        >
          {isHeaderCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          <span>{isHeaderCollapsed ? "Mostrar Resumen" : "Maximizar Tabla"}</span>
        </button>
      </div>

      {/* 3. Dynamic Tab Content View */}
      <div style={{ flex: 1, overflow: 'visible' }}>
        
        {/* TAB 0: FICHA RESUMEN */}
        {activeTab === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s' }}>
            {/* Header / Title block */}
            <div style={{ background: '#0F2C59', color: '#FFFFFF', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 'var(--radius-sm)' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>FICHA RESUMEN DEL PROYECTO</h2>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Metadatos del estándar Bupa Chile y Resumen Ejecutivo del Comité SCL
            </div>

            {/* METADATOS ESTÁNDAR BUPA CHILE (12 CAMPOS) */}
            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              {/* Blue Header */}
              <div style={{ background: '#0F2C59', color: '#FFFFFF', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 800 }}>
                <span>📄</span> METADATOS GENERALES DEL PROYECTO (ESTÁNDAR BUPA CHILE)
              </div>
              
              {/* 4-column Grid styled like an Excel sheet */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', background: 'var(--bg-secondary)' }}>
                <tbody>
                  {/* Row 1: Nombre del Proyecto & Fecha Inicio */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ width: '15%', padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Nombre del Proyecto</td>
                    <td style={{ width: '35%', padding: '8px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                      <input
                        type="text"
                        value={project.name || ''}
                        onChange={e => updateProject(project.id, { name: e.target.value })}
                        placeholder="Nombre del proyecto..."
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ width: '15%', padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Fecha Inicio</td>
                    <td style={{ width: '35%', padding: '8px 12px' }}>
                      <input
                        type="date"
                        value={project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : ''}
                        onChange={e => updateProject(project.id, { startDate: e.target.value ? new Date(e.target.value) : new Date() })}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </td>
                  </tr>

                  {/* Row 2: Tipo & Fecha Término Plan */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Tipo</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                      <select
                        value={project.type || ''}
                        onChange={e => updateProject(project.id, { type: e.target.value })}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Proyecto Estratégico">Proyecto Estratégico</option>
                        <option value="Proyecto Habilitante">Proyecto Habilitante</option>
                        <option value="Proyecto de Continuidad Operativa">Proyecto de Continuativa</option>
                        <option value="Proyecto SCL">Proyecto SCL</option>
                        <option value="Inversión">Inversión</option>
                        <option value="Operaciones">Operaciones</option>
                        <option value="Iniciativa/Otros">Iniciativa/Otros</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Fecha Término Plan</td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="date"
                        value={project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : ''}
                        onChange={e => updateProject(project.id, { endDate: e.target.value ? new Date(e.target.value) : new Date() })}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </td>
                  </tr>

                  {/* Row 3: Metodología & Fecha Go-Live */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Metodología</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                      <select
                        value={project.methodology || ''}
                        onChange={e => updateProject(project.id, { methodology: e.target.value })}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Tradicional">Tradicional</option>
                        <option value="Ágil">Ágil</option>
                        <option value="Híbrido">Híbrido</option>
                        <option value="Híbrida">Híbrida</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Fecha Go-Live</td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="date"
                        value={project.goLiveDate ? new Date(project.goLiveDate).toISOString().split('T')[0] : ''}
                        onChange={e => updateProject(project.id, { goLiveDate: e.target.value ? new Date(e.target.value) : null })}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </td>
                  </tr>

                  {/* Row 4: Sponsor & Jira / ID */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Sponsor</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                      <input
                        type="text"
                        value={project.sponsor || ''}
                        onChange={e => updateProject(project.id, { sponsor: e.target.value })}
                        placeholder="Sponsor del proyecto..."
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Jira / ID</td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        value={project.jiraId || ''}
                        onChange={e => updateProject(project.id, { jiraId: e.target.value })}
                        placeholder="Ej: PRSCL-62"
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </td>
                  </tr>

                  {/* Row 5: Líder & Estado */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Líder</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                      <input
                        type="text"
                        value={project.manager || ''}
                        onChange={e => updateProject(project.id, { manager: e.target.value })}
                        placeholder="PM/Líder responsable..."
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Estado</td>
                    <td style={{ padding: '8px 12px' }}>
                      <select
                        value={project.status || 'Planificación'}
                        onChange={e => updateProject(project.id, { status: e.target.value as any })}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <option value="Planificación">Planificación</option>
                        <option value="Ejecución">Ejecución</option>
                        <option value="Pausado">Pausado</option>
                        <option value="Completado">Completado</option>
                      </select>
                    </td>
                  </tr>

                  {/* Row 6: PMO & Última Actualización */}
                  <tr style={{ borderBottom: 'none' }}>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>PMO</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                      <input
                        type="text"
                        value={project.pmo || ''}
                        onChange={e => updateProject(project.id, { pmo: e.target.value })}
                        placeholder="PMO responsable..."
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Última Actualización</td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="date"
                        value={project.cutoffDate ? new Date(project.cutoffDate).toISOString().split('T')[0] : ''}
                        onChange={e => updateProject(project.id, { cutoffDate: e.target.value ? new Date(e.target.value) : null })}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* RESUMEN EJECUTIVO DEL PROYECTO (Teal Section - COMITÉ SCL) */}
            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              {/* Teal Section Header */}
              <div style={{ background: '#008489', color: '#FFFFFF', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 800 }}>
                <span>▶</span> RESUMEN EJECUTIVO DEL PROYECTO (COMITÉ SCL)
              </div>
              
              {/* Excel-like grid for metadata */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', background: 'var(--bg-secondary)' }}>
                <tbody>
                  {/* Row 1: Nombre del Proyecto & Última Actualización */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ width: '20%', padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Nombre del Proyecto</td>
                    <td style={{ width: '30%', padding: '8px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                      <input
                        type="text"
                        value={project.name}
                        onChange={e => updateProject(project.id, { name: e.target.value })}
                        placeholder="Nombre del proyecto..."
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ width: '20%', padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Última Actualización</td>
                    <td style={{ width: '30%', padding: '8px 12px' }}>
                      <input
                        type="date"
                        value={project.cutoffDate ? new Date(project.cutoffDate).toISOString().split('T')[0] : ''}
                        onChange={e => updateProject(project.id, { cutoffDate: e.target.value ? new Date(e.target.value) : null })}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </td>
                  </tr>

                  {/* Row 2: Estado General & Semáforo Tiempo */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Estado General</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: project.status === 'Completado' ? '#10B981' : project.status === 'Pausado' ? '#F59E0B' : '#008489',
                          marginRight: '8px'
                        }} />
                        <select
                          value={project.status || 'Planificación'}
                          onChange={e => updateProject(project.id, { status: e.target.value as any })}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <option value="Planificación">Planificación</option>
                          <option value="Ejecución">En Ejecución</option>
                          <option value="Pausado">Pausado</option>
                          <option value="Completado">Completado</option>
                        </select>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Semáforo Tiempo</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {renderSemaphoreCircle(project.statusTime)}
                        <select
                          value={project.statusTime || ''}
                          onChange={e => updateProject(project.id, { statusTime: e.target.value || null })}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <option value="">Seleccionar...</option>
                          <option value="Verde">Verde</option>
                          <option value="Amarillo">Amarillo</option>
                          <option value="Rojo">Rojo</option>
                        </select>
                      </div>
                    </td>
                  </tr>

                  {/* Row 3: % Avance Real & Semáforo Calidad */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>% Avance Real</td>
                    <td style={{ padding: '10px 24px', borderRight: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'monospace' }}>
                      {progress}%
                    </td>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Semáforo Calidad</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {renderSemaphoreCircle(project.statusQuality)}
                        <select
                          value={project.statusQuality || ''}
                          onChange={e => updateProject(project.id, { statusQuality: e.target.value || null })}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <option value="">Seleccionar...</option>
                          <option value="Verde">Verde</option>
                          <option value="Amarillo">Amarillo</option>
                          <option value="Rojo">Rojo</option>
                        </select>
                      </div>
                    </td>
                  </tr>

                  {/* Row 4: % Avance Esperado & Semáforo Costo */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>% Avance Esperado</td>
                    <td style={{ padding: '10px 24px', borderRight: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'monospace' }}>
                      {expectedProgressGlobal}%
                    </td>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Semáforo Costo</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {renderSemaphoreCircle(project.statusCost)}
                        <select
                          value={project.statusCost || ''}
                          onChange={e => updateProject(project.id, { statusCost: e.target.value || null })}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <option value="">Seleccionar...</option>
                          <option value="Verde">Verde</option>
                          <option value="Amarillo">Amarillo</option>
                          <option value="Rojo">Rojo</option>
                        </select>
                      </div>
                    </td>
                  </tr>

                  {/* Row 5: Desviación Tiempo & Próximo Hito */}
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Desviación Tiempo</td>
                    <td style={{ padding: '10px 24px', borderRight: '1px solid var(--border-subtle)', color: projectDeviationDays > 0 ? 'var(--accent-danger)' : 'var(--accent-success)', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'monospace' }}>
                      {projectDeviationDays > 0 ? `+${projectDeviationDays}` : projectDeviationDays} días
                    </td>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Próximo Hito</td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="text"
                        value={project.nextMilestone || ''}
                        onChange={e => updateProject(project.id, { nextMilestone: e.target.value || null })}
                        placeholder="Describir próximo hito relevante..."
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </td>
                  </tr>

                  {/* Row 6: Riesgo Consolidado & Fecha Próximo Hito */}
                  <tr style={{ borderBottom: 'none' }}>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Riesgo Consolidado</td>
                    <td style={{ padding: '8px 12px', borderRight: '1px solid var(--border-subtle)' }}>
                      <select
                        value={project.consolidatedRisk || 'Medio'}
                        onChange={e => updateProject(project.id, { consolidatedRisk: e.target.value || null })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          border: '1px solid var(--border-light)',
                          borderRadius: '4px',
                          background: '#FFFFFF',
                          color: project.consolidatedRisk === 'Crítico' || project.consolidatedRisk === 'Alto' ? 'var(--accent-danger)' : project.consolidatedRisk === 'Medio' ? 'var(--accent-warning)' : 'var(--accent-success)',
                          outline: 'none',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Bajo" style={{ color: 'var(--accent-success)', fontWeight: 'bold' }}>Bajo</option>
                        <option value="Medio" style={{ color: 'var(--accent-warning)', fontWeight: 'bold' }}>Medio</option>
                        <option value="Alto" style={{ color: 'var(--accent-danger)', fontWeight: 'bold' }}>Alto</option>
                        <option value="Crítico" style={{ color: 'var(--accent-danger)', fontWeight: 'bold' }}>Crítico</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontWeight: 'bold', borderRight: '1px solid var(--border-subtle)' }}>Fecha Próximo Hito</td>
                    <td style={{ padding: '8px 12px' }}>
                      <input
                        type="date"
                        value={project.nextMilestoneDate ? new Date(project.nextMilestoneDate).toISOString().split('T')[0] : ''}
                        onChange={e => updateProject(project.id, { nextMilestoneDate: e.target.value ? new Date(e.target.value) : null })}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#FFFFFF', color: '#0F172A', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ESTADO PERIODO */}
            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)', marginTop: '8px' }}>
              {/* Teal Section Header */}
              <div style={{ background: '#008489', color: '#FFFFFF', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 800 }}>
                <span>▶</span> ESTADO PERIODO
              </div>
            </div>

            {/* Vertically Stacked Cards for Period Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* 1. LOGROS DEL PERÍODO */}
              <div style={{ border: '1px solid #C5E0B4', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#F2F9EE' }}>
                <div style={{ background: '#E2F0D9', padding: '10px 16px', borderBottom: '1px solid #C5E0B4', display: 'flex', alignItems: 'center', gap: '8px', color: '#385723', fontWeight: 800, fontSize: '0.85rem' }}>
                  <span>☑</span> LOGROS DEL PERÍODO
                </div>
                <PeriodStatusTextarea
                  initialValue={project.achievements}
                  placeholder="Detallar logros e hitos alcanzados en este período..."
                  onSave={val => updateProject(project.id, { achievements: val })}
                  style={{ color: '#385723' }}
                />
              </div>

              {/* 2. PRÓXIMOS PASOS */}
              <div style={{ border: '1px solid #B4C6E7', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#F2F7FC' }}>
                <div style={{ background: '#DDEBF7', padding: '10px 16px', borderBottom: '1px solid #B4C6E7', display: 'flex', alignItems: 'center', gap: '8px', color: '#1F4E79', fontWeight: 800, fontSize: '0.85rem' }}>
                  <span>⇄</span> PRÓXIMOS PASOS
                </div>
                <PeriodStatusTextarea
                  initialValue={project.nextSteps}
                  placeholder="Detallar los siguientes pasos prioritarios para el proyecto..."
                  onSave={val => updateProject(project.id, { nextSteps: val })}
                  style={{ color: '#1F4E79' }}
                />
              </div>

              {/* 3. BLOQUEADORES / RIESGOS ACTIVOS */}
              <div style={{ border: '1px solid #F8CBAD', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#FDF5F0' }}>
                <div style={{ background: '#FCE4D6', padding: '10px 16px', borderBottom: '1px solid #F8CBAD', display: 'flex', alignItems: 'center', gap: '8px', color: '#C65911', fontWeight: 800, fontSize: '0.85rem' }}>
                  <span>●</span> BLOQUEADORES / RIESGOS ACTIVOS
                </div>
                <PeriodStatusTextarea
                  initialValue={project.blockers}
                  placeholder="Detallar riesgos críticos, impedimentos o bloqueadores del proyecto..."
                  onSave={val => updateProject(project.id, { blockers: val })}
                  style={{ color: '#C65911' }}
                />
              </div>

              {/* 4. ESTADO DE COSTOS */}
              <div style={{ border: '1px solid #FFE699', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#FFFDF5' }}>
                <div style={{ background: '#FFF2CC', padding: '10px 16px', borderBottom: '1px solid #FFE699', display: 'flex', alignItems: 'center', gap: '8px', color: '#7F6000', fontWeight: 800, fontSize: '0.85rem' }}>
                  <span>⛃</span> ESTADO DE COSTOS
                </div>
                <PeriodStatusTextarea
                  initialValue={project.costStatusText}
                  placeholder="Describir breve resumen del control financiero y desviaciones de costos..."
                  onSave={val => updateProject(project.id, { costStatusText: val })}
                  style={{ color: '#7F6000' }}
                />
              </div>

            </div>
          </div>
        )}

        {/* TAB 1: EXECUTIVE DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s' }}>
            
            {/* Header / Title block */}
            <div style={{ background: '#0F2C59', color: '#FFFFFF', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 'var(--radius-sm)' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>CUADRO DE MANDO (DASHBOARD)</h2>
            </div>
            
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Visualización rápida del estado general, KPIs clave de control de proyecto y alertas
            </div>

            {/* Fila Principal de KPIs (6 Tarjetas Premium) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              
              {/* Card 1: Avance Consolidado */}
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', minHeight: '100px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avance Consolidado</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px' }}>{progress}%</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-success)', marginTop: '4px', fontWeight: 600 }}>PMBOK WBS Weighted</div>
                </div>
                <CircularProgressRing progress={progress} size={60} strokeWidth={5} color={areaColor} />
              </div>

              {/* Card 2: Tareas WBS */}
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '100px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
                  <CheckSquare size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{dashboardStats.completedTasks} / {dashboardStats.totalTasks}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>Tareas Completadas</div>
                  <div style={{ display: 'flex', gap: '6px', fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    <span>{dashboardStats.inProgressTasks} en curso</span>
                    <span style={{ color: 'var(--accent-danger)' }}>{dashboardStats.atRiskTasks} riesgo</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Hito Siguiente */}
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '100px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-warning)', flexShrink: 0 }}>
                  <Flag size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hito Siguiente</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={project.nextMilestone || 'No definido'}>
                    {project.nextMilestone || 'No definido'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {project.nextMilestoneDate ? format(new Date(project.nextMilestoneDate), 'dd MMM yyyy') : 'Sin fecha'}
                  </div>
                </div>
              </div>

              {/* Card 4: Fecha Go-Live */}
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '100px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-success)', flexShrink: 0 }}>
                  <Calendar size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha Go-Live</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {project.goLiveDate ? format(new Date(project.goLiveDate), 'dd MMM yyyy') : 'No definido'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Planificado
                  </div>
                </div>
              </div>

              {/* Card 5: Stakeholders Clave */}
              <div 
                className="glass-panel hover-card" 
                onClick={() => setActiveTab('stakeholders')}
                style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', minHeight: '100px' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', flexShrink: 0 }}>
                  <Users size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{projectStakeholders.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>Stakeholders Clave</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Ver matriz ➜
                  </div>
                </div>
              </div>

              {/* Card 6: Incidentes Activos */}
              <div 
                className="glass-panel hover-card" 
                onClick={() => setActiveTab('incidents')}
                style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', minHeight: '100px' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(225, 29, 72, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-danger)', flexShrink: 0 }}>
                  <AlertOctagon size={20} className={projectIncidents.some(i => i.estado !== 'Cerrado') ? "animate-pulse" : ""} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{projectIncidents.filter(i => i.estado !== 'Cerrado').length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>Incidentes Activos</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Ver log ➜
                  </div>
                </div>
              </div>

            </div>



            {/* METRICAS DE GESTION Y WBS (RESTORED) */}
            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)', marginTop: '12px' }}>
              <div style={{ background: '#008489', color: '#FFFFFF', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 800 }}>
                <span>▶</span> MONITOREO WBS Y MÉTRICAS COMPLEMENTARIAS
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

        {/* TAB 2: GESTOR DE DATOS (TABLA) */}
        {activeTab === 'gantt' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', animation: 'fadeIn 0.3s' }}>
            
            {/* Header Control panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                
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

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    className="btn" 
                    onClick={handleExportProjectToExcel} 
                    style={{ 
                      padding: '8px 16px', 
                      fontSize: '0.85rem', 
                      gap: '6px', 
                      background: '#10B981', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: 'var(--radius-sm)', 
                      fontWeight: 600, 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: 'pointer' 
                    }}
                  >
                    <FileSpreadsheet size={16} /> Exportar a Excel
                  </button>
                  <button className="btn btn-primary" onClick={handleCreatePhase} style={{ padding: '8px 16px', fontSize: '0.85rem', gap: '6px', display: 'flex', alignItems: 'center' }}>
                    <Plus size={16} /> Nueva Fase Clínica
                  </button>
                </div>
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

            {/* Gestor Grid Panel */}
            <div 
              className="glass-panel" 
              style={{ 
                overflow: 'auto', 
                padding: '0', 
                position: 'relative', 
                background: 'var(--bg-secondary)', 
                maxHeight: isHeaderCollapsed ? 'calc(100vh - 250px)' : 'calc(100vh - 440px)',
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0
              }} 
              ref={scrollContainerRef}
            >
              <div style={{ minWidth: '100%', width: 'max-content', position: 'relative' }}>
                
                {/* WBS Columns Header */}
                <div style={{ display: 'flex', borderBottom: '2px solid var(--border-light)', position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10, width: '100%', minWidth: `${totalWidth}px`, height: '44px', alignItems: 'center', fontWeight: 'bold', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <div style={{ width: `${colWidths.id}px`, flexShrink: 0, textAlign: 'center', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    ID
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('id', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.name}px`, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', paddingLeft: '8px', position: 'relative' }}>
                    Fase / Actividad
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('name', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.startDate}px`, flexShrink: 0, textAlign: 'center', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    Ini. Plan
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('startDate', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.endDate}px`, flexShrink: 0, textAlign: 'center', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    Fin Plan
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('endDate', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.realStartDate}px`, flexShrink: 0, textAlign: 'center', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    Ini. Real
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('realStartDate', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.realEndDate}px`, flexShrink: 0, textAlign: 'center', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    Fin Real
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('realEndDate', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.assignee}px`, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', paddingLeft: '4px', position: 'relative' }}>
                    PM/Resp
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('assignee', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.progress}px`, flexShrink: 0, textAlign: 'center', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    % Av.
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('progress', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.expectedProgress}px`, flexShrink: 0, textAlign: 'center', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    % Esp
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('expectedProgress', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.delay}px`, flexShrink: 0, textAlign: 'center', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    Desv
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('delay', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.semaphore}px`, flexShrink: 0, textAlign: 'center', borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    Sem
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('semaphore', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.status}px`, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', paddingLeft: '4px', position: 'relative' }}>
                    Estado
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('status', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.estimatedCost}px`, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px', position: 'relative' }}>
                    C. Est
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('estimatedCost', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.realCost}px`, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px', position: 'relative' }}>
                    C. Real
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('realCost', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.risk}px`, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', paddingLeft: '4px', position: 'relative' }}>
                    Riesgo
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('risk', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.notes}px`, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', height: '100%', display: 'flex', alignItems: 'center', paddingLeft: '4px', position: 'relative' }}>
                    Observación
                    <div 
                      onMouseDown={(e) => handleResizeMouseDown('notes', e)}
                      style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 11 }}
                      className="resize-handle"
                    />
                  </div>
                  <div style={{ width: `${colWidths.actions}px`, flexShrink: 0, textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Acc</div>
                </div>

                {/* Phases and Tasks renderer */}
                <div style={{ position: 'relative' }}>
                  {project.phases.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', width: '600px' }}>
                      Comienza agregando tu primera fase clínica utilizando el botón "Nueva Fase Clínica".
                    </div>
                  ) : (
                    project.phases.map((phase) => {
                      const isCollapsed = collapsedPhases[phase.id];
                      return (
                        <React.Fragment key={phase.id}>
                          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', width: '100%', minWidth: `${totalWidth}px`, height: '44px', alignItems: 'center' }}>
                            {/* Left content (spanning all except Actions) */}
                            <div style={{ flex: 1, minWidth: `${totalWidth - colWidths.actions}px`, padding: '0 16px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', width: '20px' }} onClick={() => setCollapsedPhases(prev => ({ ...prev, [phase.id]: !prev[phase.id] }))}>
                                {isCollapsed ? <ChevronRight size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
                              </div>
                              {phase.wbsId && <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', minWidth: '24px' }}>{phase.wbsId}.</span>}
                              <span style={{ cursor: 'pointer', fontWeight: 800, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} onClick={() => setCollapsedPhases(prev => ({ ...prev, [phase.id]: !prev[phase.id] }))}>{phase.name}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginLeft: '12px', minWidth: '40px' }}>{phase.progress}%</span>
                            </div>
                            {/* Right Actions column (aligned under ACC) */}
                            <div style={{ width: `${colWidths.actions}px`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <button className="icon-btn" style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Editar Fase" onClick={() => handleEditPhase(phase)}>
                                <Edit2 size={13} />
                              </button>
                              <button className="icon-btn" style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Añadir tarea a esta fase" onClick={() => handleCreateTask(phase.id)}>
                                <Plus size={15} color="var(--accent-primary)" />
                              </button>
                            </div>
                          </div>

                          {!isCollapsed && phase.tasks.filter(t => !t.parentId).map(task => renderGestorTaskRow(task, phase, 0))}
                        </React.Fragment>
                      );
                    })
                  )}
                </div>

              </div>
            </div>

            {/* Footer Summary Panel */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 24px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderTop: 'none',
              borderBottomLeftRadius: 'var(--radius-md)',
              borderBottomRightRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="var(--accent-primary)" />
                  <span>Fases: <strong style={{ color: 'var(--text-primary)' }}>{project.phases.length}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckSquare size={14} color="var(--accent-primary)" />
                  <span>Tareas: <strong style={{ color: 'var(--text-primary)' }}>{allTasks.length}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={14} color="var(--accent-warning)" />
                  <span>Hitos Clínicos: <strong style={{ color: 'var(--text-primary)' }}>{allTasks.filter(t => t.duration === 0).length}</strong></span>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🟢 Datos Sincronizados Localmente</span>
              </div>
            </div>

            {/* Task Edit Drawer */}
            <AnimatePresence>
              {editingTask && (
                <motion.div 
                  initial={{ x: '100%', opacity: 0.9 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0.9 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                  className="gantt-drawer"
                  style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '450px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-light)', boxShadow: '-10px 0 30px rgba(0,0,0,0.15)', zIndex: 150, display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
                      {editingTask.task.wbsId ? <span style={{ color: 'var(--accent-primary)', marginRight: '8px' }}>{editingTask.task.wbsId}</span> : null}
                      {editingTask.isNew ? (editingTask.task.parentId ? 'Nueva Subtarea' : 'Nueva Tarea') : 'Editar Tarea'}
                    </h2>
                    <motion.button whileTap={{ scale: 0.9 }} className="icon-btn" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => setEditingTask(null)}>
                      <X size={20} />
                    </motion.button>
                  </div>
                  
                  <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Nombre de la Tarea / Hito</label>
                        <input 
                          type="text" 
                          value={editingTask.task.name} 
                          onChange={e => setEditingTask({...editingTask, task: {...editingTask.task, name: e.target.value}})}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontWeight: 'bold', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>ID de Jira (Opcional)</label>
                        <input 
                          type="text" 
                          placeholder="Ej. BUPA-105"
                          value={editingTask.task.jiraCode || ''} 
                          onChange={e => setEditingTask({...editingTask, task: {...editingTask.task, jiraCode: e.target.value}})}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-primary)', fontWeight: 'bold', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Estado</label>
                        <select 
                          value={editingTask.task.status}
                          onChange={e => {
                            const newStatus = e.target.value as TaskStatus;
                            let newProgress = editingTask.task.progress;
                            if (newStatus === 'Completed') newProgress = 100;
                            else if (newStatus === 'Not Started') newProgress = 0;
                            else if (newStatus === 'In Progress' && newProgress === 0) newProgress = 10;
                            
                            setEditingTask({
                              ...editingTask,
                              task: {
                                ...editingTask.task,
                                status: newStatus,
                                progress: newProgress
                              }
                            });
                          }}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                        >
                          <option value="Not Started">No Iniciada</option>
                          <option value="In Progress">En Progreso</option>
                          <option value="Completed">Completada</option>
                          <option value="At Risk">En Riesgo</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Prioridad</label>
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
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Inicio Plan</label>
                        <input 
                          type="date" 
                          value={format(new Date(editingTask.task.startDate), 'yyyy-MM-dd')} 
                          onChange={e => handleTaskDateChange('start', e.target.value)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Término Plan</label>
                        <input 
                          type="date" 
                          value={format(new Date(editingTask.task.endDate), 'yyyy-MM-dd')} 
                          onChange={e => handleTaskDateChange('end', e.target.value)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Esfuerzo (Días)</label>
                        <input 
                          type="number" 
                          min="0"
                          value={editingTask.task.duration} 
                          onChange={e => handleTaskDateChange('duration', e.target.value)}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Inicio Real</label>
                        <input 
                          type="date" 
                          value={editingTask.task.realStartDate ? format(new Date(editingTask.task.realStartDate), 'yyyy-MM-dd') : ''} 
                          onChange={e => setEditingTask({
                            ...editingTask,
                            task: { ...editingTask.task, realStartDate: e.target.value ? new Date(e.target.value) : null }
                          })}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Término Real</label>
                        <input 
                          type="date" 
                          value={editingTask.task.realEndDate ? format(new Date(editingTask.task.realEndDate), 'yyyy-MM-dd') : ''} 
                          onChange={e => setEditingTask({
                            ...editingTask,
                            task: { ...editingTask.task, realEndDate: e.target.value ? new Date(e.target.value) : null }
                          })}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Costo Estimado</label>
                        <input 
                          type="number" 
                          value={editingTask.task.estimatedCost !== undefined && editingTask.task.estimatedCost !== null ? editingTask.task.estimatedCost : ''} 
                          onChange={e => setEditingTask({
                            ...editingTask,
                            task: { ...editingTask.task, estimatedCost: e.target.value !== '' ? Number(e.target.value) : null }
                          })}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Costo Real</label>
                        <input 
                          type="number" 
                          value={editingTask.task.realCost !== undefined && editingTask.task.realCost !== null ? editingTask.task.realCost : ''} 
                          onChange={e => setEditingTask({
                            ...editingTask,
                            task: { ...editingTask.task, realCost: e.target.value !== '' ? Number(e.target.value) : null }
                          })}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Riesgo</label>
                        <select 
                          value={editingTask.task.risk || 'Bajo'}
                          onChange={e => setEditingTask({
                            ...editingTask,
                            task: { ...editingTask.task, risk: e.target.value }
                          })}
                          style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="Bajo">Bajo</option>
                          <option value="Medio">Medio</option>
                          <option value="Alto">Alto</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                        Predecesoras (Dependencias)
                      </label>
                      
                      {/* List of active predecessors as premium removable cards */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        {editingTask.task.dependencies && editingTask.task.dependencies.length > 0 ? (
                          editingTask.task.dependencies.map(depId => {
                            const depTask = allTasks.find(t => t.id === depId);
                            if (!depTask) return null;
                            return (
                              <div 
                                key={depId} 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between', 
                                  background: 'var(--bg-primary)', 
                                  padding: '8px 12px', 
                                  borderRadius: 'var(--radius-sm)', 
                                  border: '1px solid var(--border-light)' 
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                  <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                    {depTask.wbsId || 'Task'}
                                  </span>
                                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                    {depTask.name}
                                  </span>
                                </div>
                                <motion.button 
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.85 }}
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    color: 'var(--accent-danger)', 
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  onClick={() => {
                                    const updatedDeps = (editingTask.task.dependencies || []).filter(id => id !== depId);
                                    setEditingTask({
                                      ...editingTask,
                                      task: { ...editingTask.task, dependencies: updatedDeps }
                                    });
                                  }}
                                  title="Eliminar dependencia"
                                >
                                  ✕
                                </motion.button>
                              </div>
                            );
                          })
                        ) : (
                          <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-light)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            Sin dependencias activas. Esta tarea puede iniciar libremente.
                          </div>
                        )}
                      </div>

                      {/* Searchable Combobox for adding new predecessors */}
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text" 
                          placeholder="🔍 Buscar tarea para añadir como predecesora..."
                          value={predecessorSearch}
                          onChange={e => {
                            setPredecessorSearch(e.target.value);
                            setPredecessorDropdownOpen(true);
                          }}
                          onFocus={() => setPredecessorDropdownOpen(true)}
                          style={{ 
                            width: '100%', 
                            padding: '10px 12px', 
                            background: 'var(--bg-primary)', 
                            border: '1px solid var(--border-light)', 
                            borderRadius: 'var(--radius-sm)', 
                            color: 'var(--text-primary)', 
                            fontSize: '0.85rem', 
                            outline: 'none' 
                          }}
                        />
                        
                        {predecessorDropdownOpen && (
                          <>
                            <div 
                              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 139 }} 
                              onClick={() => setPredecessorDropdownOpen(false)}
                            />
                            <div 
                              style={{ 
                                position: 'absolute', 
                                top: '100%', 
                                left: 0, 
                                right: 0, 
                                background: 'var(--bg-secondary)', 
                                border: '1px solid var(--border-strong)', 
                                borderRadius: 'var(--radius-sm)', 
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                                maxHeight: '200px', 
                                overflowY: 'auto', 
                                zIndex: 140,
                                marginTop: '4px'
                              }}
                            >
                              {filteredPredecessorOptions.length > 0 ? (
                                filteredPredecessorOptions.map(t => (
                                  <div 
                                    key={t.id} 
                                    onClick={() => {
                                      const currentDeps = editingTask.task.dependencies || [];
                                      if (!currentDeps.includes(t.id)) {
                                        setEditingTask({
                                          ...editingTask,
                                          task: { ...editingTask.task, dependencies: [...currentDeps, t.id] }
                                        });
                                      }
                                      setPredecessorSearch('');
                                      setPredecessorDropdownOpen(false);
                                    }}
                                    style={{ 
                                      padding: '8px 12px', 
                                      cursor: 'pointer', 
                                      borderBottom: '1px solid var(--border-subtle)',
                                      fontSize: '0.85rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      transition: 'background 0.2s'
                                    }}
                                    className="pred-option"
                                  >
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                      {t.wbsId || 'Task'}
                                    </span>
                                    <span style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                                  </div>
                                ))
                              ) : (
                                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                  No se encontraron tareas disponibles
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Progreso</label>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{editingTask.task.progress}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={editingTask.task.progress} 
                        onChange={e => {
                          const newProgress = parseInt(e.target.value);
                          let newStatus = editingTask.task.status;
                          if (newProgress === 100) newStatus = 'Completed';
                          else if (newProgress > 0 && newStatus === 'Not Started') newStatus = 'In Progress';
                          else if (newProgress === 0 && newStatus === 'Completed') newStatus = 'Not Started';
                          
                          setEditingTask({
                            ...editingTask,
                            task: {
                              ...editingTask.task,
                              progress: newProgress,
                              status: newStatus
                            }
                          });
                        }}
                        style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        disabled={editingTask.task.duration === 0} 
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Responsable</label>
                        <button 
                          type="button" 
                          onClick={() => setIsManageUsersOpen(true)}
                          style={{ border: 'none', background: 'transparent', color: '#004B87', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          ⚙️ Administrar
                        </button>
                      </div>
                      <input 
                        list="users-list"
                        type="text"
                        value={editingTask.task.assignee} 
                        onChange={e => {
                          setEditingTask(prev => prev ? {
                            ...prev,
                            task: { ...prev.task, assignee: e.target.value }
                          } : null);
                        }}
                        className="modal-input"
                        placeholder="Asignar o escribir nuevo..."
                        style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                      <datalist id="users-list">
                        {users.map(u => (
                          <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                        ))}
                      </datalist>
                    </div>

                    {editingTask.isNew ? (
                      <div 
                        style={{ 
                          background: 'var(--bg-tertiary)', 
                          border: '1px dashed var(--border-light)', 
                          borderRadius: 'var(--radius-md)', 
                          padding: '20px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          marginTop: '8px',
                          opacity: 0.7,
                          cursor: 'not-allowed'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '24px' }}>📄</span>
                          <span style={{ fontSize: '24px' }}>📊</span>
                          <span style={{ fontSize: '24px' }}>🖼️</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, margin: '0 0 4px 0', textAlign: 'center' }}>
                          ⚠️ Guarda la tarea primero para poder adjuntar archivos
                        </p>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleFileDrop}
                        style={{ 
                          background: 'rgba(2, 132, 199, 0.04)', 
                          border: '1px dashed var(--accent-primary)', 
                          borderRadius: 'var(--radius-md)', 
                          padding: '20px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          cursor: 'pointer', 
                          transition: 'all 0.2s', 
                          marginTop: '8px' 
                        }}
                        className="file-dropzone"
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          style={{ display: 'none' }} 
                        />
                        {isUploading ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Loader2 className="animate-spin" size={24} color="var(--accent-primary)" />
                            <p style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Subiendo archivo...</p>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                              <span style={{ fontSize: '24px' }}>📄</span>
                              <span style={{ fontSize: '24px' }}>📊</span>
                              <span style={{ fontSize: '24px' }}>🖼️</span>
                            </div>
                            <p style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 600, margin: '0 0 4px 0' }}>
                              Arrastra entregables o haz clic aquí
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0, textAlign: 'center' }}>
                              Archivos PDF, Word, Excel, Imágenes. (Almacenamiento Local Database)
                            </p>
                          </>
                        )}
                      </div>
                    )}
                    
                    {editingTask.task.attachments && editingTask.task.attachments.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Entregables Subidos:</label>
                        {editingTask.task.attachments.map(att => {
                          const getFileIcon = (type: string) => {
                            const t = type.toLowerCase();
                            if (t === 'pdf') return '📄';
                            if (['xlsx', 'xls', 'csv'].includes(t)) return '📊';
                            if (['doc', 'docx'].includes(t)) return '📝';
                            if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(t)) return '🖼️';
                            return '📎';
                          };
                          return (
                            <div key={att.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                              <a 
                                href={att.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit', flex: 1, marginRight: '8px' }}
                                title="Click para ver/descargar"
                                className="attachment-link"
                              >
                                <span style={{ fontSize: '1.2rem' }}>{getFileIcon(att.type)}</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                                  {att.name}
                                </span>
                              </a>
                              <motion.button 
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.85 }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)', padding: '4px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                                onClick={(e) => handleDeleteAttachment(e, att.id)}
                                title="Eliminar entregable"
                              >
                                ✕
                              </motion.button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Notas</label>
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
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn btn-secondary" 
                        style={{ color: 'var(--accent-danger)', borderColor: 'var(--border-light)', cursor: 'pointer' }} 
                        onClick={handleDeleteTask}
                      >
                        <Trash2 size={18} /> Eliminar
                      </motion.button>
                    ) : <div/>}
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn btn-primary" 
                      style={{ cursor: 'pointer' }}
                      onClick={handleSaveTask}
                    >
                      <Save size={18} /> Guardar
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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

        {/* TAB 3.5: RISKS */}
        {activeTab === 'risks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
            
            {/* Header / Title block */}
            <div style={{ background: '#0F2C59', color: '#FFFFFF', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 'var(--radius-sm)' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>REGISTRO DE RIESGOS Y PLAN DE MITIGACIÓN — {project?.name?.toUpperCase()}</h2>
            </div>
            
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <strong>Probabilidad:</strong> 1=Raro · 2=Poco Probable · 3=Posible · 4=Probable · 5=Casi Seguro
              </div>
              <div>
                <strong>Impacto:</strong> 1=Insignificante · 2=Menor · 3=Moderado · 4=Mayor · 5=Catastrófico
              </div>
            </div>

            {/* Heatmap & Interactive Filter */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              
              {/* Heatmap Card */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚡ Matriz de Calor (Heatmap PxI)</span>
                  {selectedRiskCell && (
                    <button 
                      onClick={() => setSelectedRiskCell(null)}
                      style={{ fontSize: '0.72rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '12px', cursor: 'pointer', marginLeft: 'auto' }}
                    >
                      Limpiar Filtro
                    </button>
                  )}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[5, 4, 3, 2, 1].map((prob) => (
                    <div key={prob} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '110px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right', paddingRight: '8px' }}>
                        {prob === 5 ? '5-Casi Seguro' : prob === 4 ? '4-Probable' : prob === 3 ? '3-Posible' : prob === 2 ? '2-Poco Probable' : '1-Raro'}
                      </div>
                      {[1, 2, 3, 4, 5].map((imp) => {
                        const level = getRiskLevel(prob, imp);
                        const colors = RISK_LEVEL_COLORS[level];
                        const count = (project?.risks || []).filter(r => r.probability === prob && r.impact === imp).length;
                        const isCellSelected = selectedRiskCell?.probability === prob && selectedRiskCell?.impact === imp;
                        return (
                          <div
                            key={imp}
                            onClick={() => {
                              if (isCellSelected) {
                                setSelectedRiskCell(null);
                              } else {
                                setSelectedRiskCell({ probability: prob, impact: imp });
                              }
                            }}
                            style={{
                              flex: 1,
                              aspectRatio: '2.4',
                              background: colors.bg,
                              color: colors.text,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.9rem',
                              fontWeight: 800,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              border: isCellSelected ? '3px solid #000' : `1px solid ${colors.border}`,
                              boxShadow: isCellSelected ? '0 0 8px rgba(0,0,0,0.4)' : 'none',
                              opacity: selectedRiskCell && !isCellSelected ? 0.35 : 1,
                              transition: 'all 0.15s ease',
                            }}
                            title={`Probabilidad: ${prob}, Impacto: ${imp} (${level}) - ${count} riesgos`}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  
                  {/* X-Axis labels */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <div style={{ width: '110px' }} />
                    {[1, 2, 3, 4, 5].map((imp) => (
                      <div key={imp} style={{ flex: 1, fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>
                        {imp === 1 ? '1-Insig.' : imp === 2 ? '2-Menor' : imp === 3 ? '3-Mod.' : imp === 4 ? '4-Mayor' : '5-Catast.'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Controls Card */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Filtros y Búsqueda</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Buscar por descripción, responsable, obs..."
                        value={searchTermRisks}
                        onChange={e => setSearchTermRisks(e.target.value)}
                        className="control-input"
                        style={{ width: '100%', padding: '10px 10px 10px 38px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select
                        value={filterLevelRisks}
                        onChange={e => setFilterLevelRisks(e.target.value)}
                        style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', outline: 'none', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      >
                        <option value="all">Todos los Niveles</option>
                        <option value="Bajo">Bajo</option>
                        <option value="Medio">Medio</option>
                        <option value="Alto">Alto</option>
                        <option value="Crítico">Crítico</option>
                      </select>
                      <select
                        value={filterStatusRisks}
                        onChange={e => setFilterStatusRisks(e.target.value)}
                        style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', outline: 'none', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      >
                        <option value="all">Todos los Estados</option>
                        <option value="Activo">Activo</option>
                        <option value="Mitigado">Mitigado</option>
                        <option value="Cerrado">Cerrado</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  {saveStatus !== 'idle' && (
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: saveStatus === 'saving' ? 'rgba(0, 75, 135, 0.08)' : 'rgba(13, 148, 136, 0.08)',
                        color: saveStatus === 'saving' ? '#004B87' : '#0d9488',
                        fontSize: '0.75rem',
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
                  <button 
                    className="btn btn-primary shadow-sm" 
                    onClick={handleCreateRisk}
                    style={{ padding: '8px 16px', background: '#0F2C59', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', marginLeft: 'auto' }}
                  >
                    + Registrar Riesgo
                  </button>
                </div>
              </div>
            </div>

            {/* Spreadsheet Table View */}
            <div className="table-container" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="incidents-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1700px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', width: '70px', textAlign: 'center', fontWeight: 'bold' }}>#</th>
                      <th style={{ padding: '12px 16px', minWidth: '260px' }}>Descripción del Riesgo</th>
                      <th style={{ padding: '12px 16px', minWidth: '140px' }}>Categoría</th>
                      <th style={{ padding: '12px 16px', width: '90px', textAlign: 'center' }}>Prob (1-5)</th>
                      <th style={{ padding: '12px 16px', width: '90px', textAlign: 'center' }}>Imp (1-5)</th>
                      <th style={{ padding: '12px 16px', width: '90px', textAlign: 'center' }}>Score PxI</th>
                      <th style={{ padding: '12px 16px', width: '110px', textAlign: 'center' }}>Nivel</th>
                      <th style={{ padding: '12px 16px', minWidth: '260px' }}>Plan de Mitigación</th>
                      <th style={{ padding: '12px 16px', minWidth: '150px' }}>Responsable</th>
                      <th style={{ padding: '12px 16px', width: '130px' }}>Fecha Límite</th>
                      <th style={{ padding: '12px 16px', width: '110px', textAlign: 'center' }}>Estado</th>
                      <th style={{ padding: '12px 16px', minWidth: '160px' }}>Actividad Asociada</th>
                      <th style={{ padding: '12px 16px', width: '120px' }}>Costo Mit.</th>
                      <th style={{ padding: '12px 16px', minWidth: '160px' }}>Obs.</th>
                      <th style={{ padding: '12px 16px', width: '60px', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRisks.length === 0 ? (
                      <tr>
                        <td colSpan={15} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          <AlertTriangle size={32} style={{ opacity: 0.2, marginBottom: '8px', display: 'inline-block' }} />
                          <p style={{ margin: 0 }}>Cero riesgos registrados o filtrados en este proyecto.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRisks.map(risk => {
                        const riskLevel = getRiskLevel(risk.probability, risk.impact);
                        const levelColor = RISK_LEVEL_COLORS[riskLevel];
                        return (
                          <tr key={risk.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="table-row-interactive">
                            
                            {/* indexId */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <InlineInput
                                value={risk.indexId}
                                onSave={val => handleUpdateRisk(risk.id, { indexId: val })}
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--accent-primary)', outline: 'none', textAlign: 'center', fontWeight: 'bold' }}
                              />
                            </td>

                            {/* Description */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineTextarea
                                value={risk.description}
                                onSave={val => handleUpdateRisk(risk.id, { description: val })}
                                placeholder="Descripción del riesgo..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                              />
                            </td>

                            {/* Category */}
                            <td style={{ padding: '8px 12px' }}>
                              <select
                                value={risk.category || 'Sistema LIS'}
                                onChange={e => handleUpdateRisk(risk.id, { category: e.target.value })}
                                style={{ width: '100%', padding: '6px', border: '1px solid transparent', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }}
                              >
                                {RISK_CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </td>

                            {/* Probability */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <select
                                value={risk.probability}
                                onChange={e => handleUpdateRisk(risk.id, { probability: Number(e.target.value) })}
                                style={{ width: '100%', padding: '6px', border: '1px solid transparent', background: 'transparent', outline: 'none', color: 'var(--text-primary)', textAlignLast: 'center', fontWeight: 700 }}
                              >
                                {[1, 2, 3, 4, 5].map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </td>

                            {/* Impact */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <select
                                value={risk.impact}
                                onChange={e => handleUpdateRisk(risk.id, { impact: Number(e.target.value) })}
                                style={{ width: '100%', padding: '6px', border: '1px solid transparent', background: 'transparent', outline: 'none', color: 'var(--text-primary)', textAlignLast: 'center', fontWeight: 700 }}
                              >
                                {[1, 2, 3, 4, 5].map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </td>

                            {/* Score */}
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.95rem' }}>
                              {risk.probability * risk.impact}
                            </td>

                            {/* Level */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <span style={{
                                background: levelColor.bg,
                                color: levelColor.text,
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 'bold',
                                display: 'inline-block',
                                width: '80px',
                                border: `1px solid ${levelColor.border}`,
                                textShadow: riskLevel === 'Medio' ? 'none' : '0 1px 2px rgba(0,0,0,0.15)'
                              }}>
                                {riskLevel}
                              </span>
                            </td>

                            {/* Mitigation Plan */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineTextarea
                                value={risk.mitigationPlan || ''}
                                onSave={val => handleUpdateRisk(risk.id, { mitigationPlan: val })}
                                placeholder="Medidas de mitigación..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                              />
                            </td>

                            {/* Responsible */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineInput
                                value={risk.responsible || ''}
                                onSave={val => handleUpdateRisk(risk.id, { responsible: val })}
                                placeholder="Responsable..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
                              />
                            </td>

                            {/* Limit Date */}
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                type="date"
                                value={formatDateForInput(risk.limitDate)}
                                onChange={e => handleUpdateRisk(risk.id, { limitDate: e.target.value ? new Date(e.target.value) : null })}
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', outline: 'none', color: 'var(--text-primary)' }}
                              />
                            </td>

                            {/* Status */}
                            <td style={{ padding: '8px 12px' }}>
                              <select
                                value={risk.status || 'Activo'}
                                onChange={e => handleUpdateRisk(risk.id, { status: e.target.value })}
                                style={{ width: '100%', padding: '6px', border: '1px solid transparent', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }}
                              >
                                {RISK_STATUSES.map(st => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </td>

                            {/* Associated Activity */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineInput
                                value={risk.associatedActivity || ''}
                                onSave={val => handleUpdateRisk(risk.id, { associatedActivity: val })}
                                placeholder="WBS / Hito..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
                              />
                            </td>

                            {/* Mitigation Cost */}
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                type="number"
                                value={risk.mitigationCost || 0}
                                onChange={e => handleUpdateRisk(risk.id, { mitigationCost: Number(e.target.value) })}
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', outline: 'none', color: 'var(--text-primary)' }}
                              />
                            </td>

                            {/* Observations */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineTextarea
                                value={risk.observations || ''}
                                onSave={val => handleUpdateRisk(risk.id, { observations: val })}
                                placeholder="Comentarios..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                              />
                            </td>

                            {/* Delete Action */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleDeleteRisk(risk.id)}
                                style={{ border: 'none', background: 'transparent', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}
                                title="Eliminar Riesgo"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>

                          </tr>
                        );
                      })
                    )}
                    
                    {/* Sum/Totals bottom row */}
                    {filteredRisks.length > 0 && (
                      <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 'bold', borderTop: '2px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>-</td>
                        <td style={{ padding: '12px 16px' }}>Total / Promedio Filtrado</td>
                        <td style={{ padding: '12px 16px' }}>-</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {Math.round((filteredRisks.reduce((sum, r) => sum + r.probability, 0) / filteredRisks.length) * 10) / 10}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {Math.round((filteredRisks.reduce((sum, r) => sum + r.impact, 0) / filteredRisks.length) * 10) / 10}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          0
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>-</td>
                        <td style={{ padding: '12px 16px' }}>-</td>
                        <td style={{ padding: '12px 16px' }}>-</td>
                        <td style={{ padding: '12px 16px' }}>-</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>-</td>
                        <td style={{ padding: '12px 16px' }}>-</td>
                        <td style={{ padding: '12px 16px' }}>
                          ${filteredRisks.reduce((sum, r) => sum + (r.mitigationCost || 0), 0).toLocaleString('es-CL')}
                        </td>
                        <td style={{ padding: '12px 16px' }}>-</td>
                        <td style={{ padding: '12px 16px' }}>-</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3.75: COSTS */}
        {activeTab === 'costs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
            
            {/* Header / Title block */}
            <div style={{ background: '#0F2C59', color: '#FFFFFF', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 'var(--radius-sm)' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>CONTROL DE COSTOS — {project?.name?.toUpperCase()}</h2>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)', gap: '16px', flexWrap: 'wrap' }}>
              <span>Registrar todos los ítems de costo asociados al proyecto. Los totales se calculan automáticamente.</span>
              {exchangeRates ? (
                <span style={{ fontSize: '0.78rem', fontWeight: 600, background: 'rgba(2, 132, 199, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(2, 132, 199, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  Divisas Hoy ({exchangeRates.date}): UF: <strong>${new Intl.NumberFormat('es-CL').format(exchangeRates.uf)}</strong> | USD: <strong>${new Intl.NumberFormat('es-CL').format(exchangeRates.usd)}</strong>
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cargando divisas...</span>
              )}
            </div>

            {/* Summary Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1px', background: '#0F2C59', border: '1px solid #0F2C59', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <div style={{ background: '#0F2C59', color: '#FFFFFF', padding: '10px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800 }}>PRESUPUESTO (NETO/IVA INC.)</div>
              <div style={{ background: '#0F2C59', color: '#FFFFFF', padding: '10px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800 }}>COSTO COMPROMETIDO</div>
              <div style={{ background: '#0F2C59', color: '#FFFFFF', padding: '10px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800 }}>COSTO EJECUTADO</div>
              <div style={{ background: '#0F2C59', color: '#FFFFFF', padding: '10px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800 }}>SALDO DISPONIBLE</div>
              <div style={{ background: '#0F2C59', color: '#FFFFFF', padding: '10px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800 }}>% EJECUCIÓN (NETO)</div>
              
              <div style={{ background: '#F4F7F6', color: '#1A1A1A', padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>N: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(financialTotals.totalBudgetNet)}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>IVA Inc: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(financialTotals.totalBudgetGross)}</span>
              </div>
              <div style={{ background: '#F4F7F6', color: '#1A1A1A', padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>N: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(financialTotals.totalCommittedNet)}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>IVA Inc: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(financialTotals.totalCommittedGross)}</span>
              </div>
              <div style={{ background: '#F4F7F6', color: '#1A1A1A', padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>N: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(financialTotals.totalExecutedNet)}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>IVA Inc: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(financialTotals.totalExecutedGross)}</span>
              </div>
              <div style={{ 
                background: financialTotals.availableBalanceNet < 0 ? 'rgba(239, 68, 68, 0.08)' : '#E8F1F5', 
                color: financialTotals.availableBalanceNet < 0 ? '#dc2626' : '#0F2C59', 
                padding: '8px 10px', 
                textAlign: 'center', 
                fontFamily: 'monospace',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                justifyContent: 'center',
                border: financialTotals.availableBalanceNet < 0 ? '1px solid rgba(239, 68, 68, 0.15)' : 'none'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>N: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(financialTotals.availableBalanceNet)}</span>
                <span style={{ fontSize: '0.72rem', color: financialTotals.availableBalanceNet < 0 ? '#f43f5e' : 'var(--text-secondary)', fontWeight: 600 }}>IVA Inc: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(financialTotals.availableBalanceGross)}</span>
              </div>
              <div style={{ background: '#E8F1F5', color: '#0F2C59', padding: '12px 10px', textAlign: 'center', fontSize: '1rem', fontWeight: 800, fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {financialTotals.executionPercentage.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </div>
            </div>

            {/* Controls Bar */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Buscar por descripción, proveedor, OC..."
                    value={searchTermCosts}
                    onChange={e => setSearchTermCosts(e.target.value)}
                    className="control-input"
                    style={{ width: '100%', padding: '10px 10px 10px 38px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
                <select
                  value={filterCategoryCosts}
                  onChange={e => setFilterCategoryCosts(e.target.value)}
                  style={{ width: '180px', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', outline: 'none', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                >
                  <option value="all">Todas las Categorías</option>
                  {COST_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={filterStatusCosts}
                  onChange={e => setFilterStatusCosts(e.target.value)}
                  style={{ width: '180px', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', outline: 'none', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                >
                  <option value="all">Todos los Estados OC</option>
                  {OC_STATUSES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {saveStatus !== 'idle' && (
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: saveStatus === 'saving' ? 'rgba(0, 75, 135, 0.08)' : 'rgba(13, 148, 136, 0.08)',
                      color: saveStatus === 'saving' ? '#004B87' : '#0d9488',
                      fontSize: '0.75rem',
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
                <button 
                  className="btn btn-primary shadow-sm" 
                  onClick={handleCreateCostItem}
                  style={{ padding: '8px 16px', background: '#0F2C59', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  + Registrar Costo
                </button>
              </div>
            </div>

            {/* Spreadsheet Table View */}
            <div className="table-container" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="incidents-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1500px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', width: '70px', textAlign: 'center', fontWeight: 'bold' }}>#</th>
                      <th style={{ padding: '12px 16px', minWidth: '280px' }}>Ítem / Descripción</th>
                      <th style={{ padding: '12px 16px', minWidth: '160px' }}>Categoría</th>
                      <th style={{ padding: '12px 16px', minWidth: '160px' }}>Proveedor / Resp.</th>
                      <th style={{ padding: '12px 16px', width: '220px', textAlign: 'right' }}>Presupuesto Aprobado</th>
                      <th style={{ padding: '12px 16px', width: '100px', textAlign: 'center' }}>Adjuntos</th>
                      <th style={{ padding: '12px 16px', width: '180px', textAlign: 'right' }}>OC Emitida</th>
                      <th style={{ padding: '12px 16px', width: '160px' }}>N° OC / Referencia</th>
                      <th style={{ padding: '12px 16px', width: '200px', textAlign: 'right' }}>Costo Real Ejecutado</th>
                      <th style={{ padding: '12px 16px', width: '130px', textAlign: 'center' }}>Estado OC</th>
                      <th style={{ padding: '12px 16px', minWidth: '220px' }}>Observación</th>
                      <th style={{ padding: '12px 16px', width: '60px', textAlign: 'center' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCostItems.length === 0 ? (
                      <tr>
                        <td colSpan={12} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          <AlertTriangle size={32} style={{ opacity: 0.2, marginBottom: '8px', display: 'inline-block' }} />
                          <p style={{ margin: 0 }}>Cero ítems de costo registrados o filtrados en este proyecto.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredCostItems.map(item => {
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="table-row-interactive">
                            
                            {/* indexId */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <InlineInput
                                value={item.indexId}
                                onSave={val => handleUpdateCostItem(item.id, { indexId: val })}
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--accent-primary)', outline: 'none', textAlign: 'center', fontWeight: 'bold' }}
                              />
                            </td>

                            {/* Description */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineTextarea
                                value={item.description}
                                onSave={val => handleUpdateCostItem(item.id, { description: val })}
                                placeholder="Descripción del ítem..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                              />
                            </td>

                            {/* Category */}
                            <td style={{ padding: '8px 12px' }}>
                              {customCategoryEditing[item.id] ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    type="text"
                                    value={customCategoryInput[item.id] ?? ''}
                                    onChange={e => setCustomCategoryInput({ ...customCategoryInput, [item.id]: e.target.value })}
                                    style={{ flex: 1, padding: '4px 6px', fontSize: '0.8rem', border: '1px solid var(--accent-primary)', borderRadius: '4px', background: 'white', color: 'var(--text-primary)', outline: 'none' }}
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        handleUpdateCostItem(item.id, { category: customCategoryInput[item.id] });
                                        setCustomCategoryEditing({ ...customCategoryEditing, [item.id]: false });
                                      } else if (e.key === 'Escape') {
                                        setCustomCategoryEditing({ ...customCategoryEditing, [item.id]: false });
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      handleUpdateCostItem(item.id, { category: customCategoryInput[item.id] });
                                      setCustomCategoryEditing({ ...customCategoryEditing, [item.id]: false });
                                    }}
                                    style={{ border: 'none', background: 'transparent', color: '#10b981', cursor: 'pointer', display: 'flex', padding: '4px' }}
                                    title="Guardar"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setCustomCategoryEditing({ ...customCategoryEditing, [item.id]: false })}
                                    style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                                    title="Cancelar"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <select
                                  value={item.category || 'Licencia Software'}
                                  onChange={e => {
                                    if (e.target.value === '__CUSTOM__') {
                                      setCustomCategoryInput({ ...customCategoryInput, [item.id]: item.category || '' });
                                      setCustomCategoryEditing({ ...customCategoryEditing, [item.id]: true });
                                    } else {
                                      handleUpdateCostItem(item.id, { category: e.target.value });
                                    }
                                  }}
                                  style={{ width: '100%', padding: '6px', border: '1px solid transparent', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }}
                                >
                                  {item.category && !COST_CATEGORIES.includes(item.category) && (
                                    <option value={item.category}>{item.category} (Personalizado)</option>
                                  )}
                                  {COST_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                  <option value="__CUSTOM__">+ Personalizar...</option>
                                </select>
                              )}
                            </td>

                            {/* Provider */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineInput
                                value={item.provider || ''}
                                onSave={val => handleUpdateCostItem(item.id, { provider: val })}
                                placeholder="Proveedor o responsable..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
                              />
                            </td>

                            {/* Approved Budget */}
                            <td style={{ padding: '8px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                              <InlineMoneyInput
                                amount={item.originalBudget !== undefined && item.originalBudget !== null ? item.originalBudget : item.approvedBudget}
                                currency={item.currency || 'CLP'}
                                taxType={item.taxType || 'NETO'}
                                exchangeRates={exchangeRates}
                                onSave={(amt, curr, tax) => {
                                  let rate = 1.0;
                                  if (curr === 'USD') rate = exchangeRates?.usd || 885.0;
                                  if (curr === 'UF') rate = exchangeRates?.uf || 40787.7;
                                  handleUpdateCostItem(item.id, {
                                    originalBudget: amt,
                                    currency: curr,
                                    taxType: tax,
                                    exchangeRate: rate
                                  });
                                }}
                              />
                            </td>

                            {/* Attachments */}
                            <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <button
                                onClick={() => {
                                  setActiveCostItemForFiles(item);
                                  setCostItemAttachmentsOpen(true);
                                }}
                                style={{
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  color: (item.attachments || []).length > 0 ? '#004B87' : 'var(--text-secondary)',
                                  background: (item.attachments || []).length > 0 ? 'rgba(0, 75, 135, 0.08)' : 'transparent',
                                  border: `1px solid ${(item.attachments || []).length > 0 ? 'rgba(0, 75, 135, 0.15)' : 'var(--border-subtle)'}`,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  transition: 'all 0.2s'
                                }}
                                title="Administrar cotizaciones y documentos adjuntos"
                              >
                                <Paperclip size={14} />
                                <span>{(item.attachments || []).length}</span>
                              </button>
                            </td>

                            {/* OC Emitted (Committed) */}
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', width: '100%' }}>
                                  <InlineNumberInput
                                    value={parseFloat(item.ocEmitted || '') || 0}
                                    formatType="number"
                                    onSave={val => handleUpdateCostItem(item.id, { ocEmitted: String(val || 0) })}
                                    style={{ textAlign: 'right', fontWeight: 'bold', width: '90px', padding: '4px 6px', border: '1px solid transparent', background: 'transparent' }}
                                  />
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', padding: '2px 4px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                                    {item.currency || 'CLP'}
                                  </span>
                                </div>
                                {item.currency && item.currency !== 'CLP' && (() => {
                                  const val = parseFloat(item.ocEmitted || '') || 0;
                                  const r = item.exchangeRate || 1.0;
                                  const tax = item.taxType || 'NETO';
                                  let net = val * r;
                                  let gross = val * r;
                                  if (tax === 'BRUTO') {
                                    gross = val * r;
                                    net = (val / 1.19) * r;
                                  } else if (tax === 'NETO') {
                                    gross = val * r * 1.19;
                                  }
                                  return (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontFamily: 'monospace' }}>
                                      <span>Neto: ≈ {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(net)}</span>
                                      {tax === 'NETO' && (
                                        <span>IVA Inc: ≈ {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(gross)}</span>
                                      )}
                                    </div>
                                  );
                                })()}
                                {item.currency === 'CLP' && item.taxType === 'NETO' && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                    IVA Inc: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format((parseFloat(item.ocEmitted || '') || 0) * 1.19)}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* OC Number / Reference */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineInput
                                value={item.ocNumber || ''}
                                onSave={val => handleUpdateCostItem(item.id, { ocNumber: val })}
                                placeholder="N° OC / ref..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
                              />
                            </td>

                            {/* Real Cost Executed */}
                            <td style={{ padding: '8px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                              <InlineMoneyInput
                                amount={item.originalRealCost !== undefined && item.originalRealCost !== null ? item.originalRealCost : item.realCost}
                                currency={item.currency || 'CLP'}
                                taxType={item.taxType || 'NETO'}
                                exchangeRates={exchangeRates}
                                onSave={(amt, curr, tax) => {
                                  let rate = 1.0;
                                  if (curr === 'USD') rate = exchangeRates?.usd || 885.0;
                                  if (curr === 'UF') rate = exchangeRates?.uf || 40787.7;
                                  handleUpdateCostItem(item.id, {
                                    originalRealCost: amt,
                                    currency: curr,
                                    taxType: tax,
                                    exchangeRate: rate
                                  });
                                }}
                              />
                            </td>

                            {/* OC Status */}
                            <td style={{ padding: '8px 12px' }}>
                              <select
                                value={item.ocStatus || 'Pendiente'}
                                onChange={e => handleUpdateCostItem(item.id, { ocStatus: e.target.value })}
                                style={{ width: '100%', padding: '6px', border: '1px solid transparent', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }}
                              >
                                {OC_STATUSES.map(st => (
                                  <option key={st} value={st}>{st}</option>
                                ))}
                              </select>
                            </td>

                            {/* Observations */}
                            <td style={{ padding: '8px 12px' }}>
                              <InlineTextarea
                                value={item.observations || ''}
                                onSave={val => handleUpdateCostItem(item.id, { observations: val })}
                                placeholder="Comentarios..."
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                              />
                            </td>

                            {/* Delete Action */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleDeleteCostItem(item.id)}
                                style={{ border: 'none', background: 'transparent', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}
                                title="Eliminar ítem de costo"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>

                          </tr>
                        );
                      })
                    )}
                    
                     {/* Sum/Totals bottom row */}
                     {filteredCostItems.length > 0 && (
                       <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 'bold', borderTop: '2px solid var(--border-subtle)' }}>
                         {/* 1. # */}
                         <td style={{ padding: '12px 16px', textAlign: 'center' }}>-</td>
                         
                         {/* 2. Ítem / Descripción */}
                         <td style={{ padding: '12px 16px' }}>TOTAL</td>
                         
                         {/* 3. Categoría */}
                         <td style={{ padding: '12px 16px' }}>-</td>
                         
                         {/* 4. Proveedor / Resp. */}
                         <td style={{ padding: '12px 16px' }}>-</td>
                         
                         {/* 5. Presupuesto Aprobado */}
                         <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.74rem', gap: '1px' }}>
                             <span style={{ color: 'var(--text-primary)' }}>N: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(filteredFinancialSums.budgetNet)}</span>
                             <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>IVA Inc: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(filteredFinancialSums.budgetGross)}</span>
                           </div>
                         </td>
                         
                         {/* 6. Adjuntos */}
                         <td style={{ padding: '12px 16px', textAlign: 'center' }}>-</td>
                         
                         {/* 7. OC Emitida */}
                         <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.74rem', gap: '1px' }}>
                             <span style={{ color: 'var(--text-primary)' }}>N: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(filteredFinancialSums.committedNet)}</span>
                             <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>IVA Inc: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(filteredFinancialSums.committedGross)}</span>
                           </div>
                         </td>
                         
                         {/* 8. N° OC / Referencia */}
                         <td style={{ padding: '12px 16px', textAlign: 'center' }}>-</td>
                         
                         {/* 9. Costo Real Ejecutado */}
                         <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.74rem', gap: '1px' }}>
                             <span style={{ color: 'var(--text-primary)' }}>N: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(filteredFinancialSums.executedNet)}</span>
                             <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>IVA Inc: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(filteredFinancialSums.executedGross)}</span>
                           </div>
                         </td>
                         
                         {/* 10. Estado OC */}
                         <td style={{ padding: '12px 16px', textAlign: 'center' }}>-</td>
                         
                         {/* 11. Observación */}
                         <td style={{ padding: '12px 16px' }}>-</td>
                         
                         {/* 12. Acción */}
                         <td style={{ padding: '12px 16px', textAlign: 'center' }}>-</td>
                       </tr>
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
                                onChange={e => {
                                  if (e.target.value === "ADD_NEW_USER") {
                                    handleOpenInlineAddUser((name) => {
                                      handleUpdateIncident(inc.id, { responsable: name });
                                    });
                                  } else {
                                    handleUpdateIncident(inc.id, { responsable: e.target.value });
                                  }
                                }}
                                style={{ width: '100%', padding: '6px', border: '1px solid transparent', background: 'transparent', outline: 'none' }}
                              >
                                {users.map(u => (
                                  <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                                <option value="PMO Admin">PMO Admin</option>
                                <option value="ADD_NEW_USER" style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>+ Agregar Nuevo...</option>
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
                        maxHeight: isCollapsed ? '0px' : 'none', 
                        opacity: isCollapsed ? 0 : 1,
                        overflow: isCollapsed ? 'hidden' : 'visible',
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
                    <input
                      list="users-list"
                      type="text"
                      value={editProjectManager}
                      onChange={e => setEditProjectManager(e.target.value)}
                      className="modal-input"
                      placeholder="Escribir nombre o seleccionar..."
                      style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                    />
                      <datalist id="users-list">
                      {users.map(u => (
                        <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                      ))}
                      </datalist>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Área de Negocio</label>
                    {isCustomArea ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          value={editProjectArea}
                          onChange={e => setEditProjectArea(e.target.value)}
                          placeholder="Ej: Innovación Clínica"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') setIsCustomArea(false); }}
                          style={{ flex: 1, padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => setIsCustomArea(false)}
                          style={{ padding: '8px 12px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700 }}
                        >✔</button>
                      </div>
                    ) : (
                      <select
                        value={editProjectArea}
                        onChange={e => {
                          if (e.target.value === '__CUSTOM__') {
                            setEditProjectArea('');
                            setIsCustomArea(true);
                          } else {
                            setEditProjectArea(e.target.value);
                          }
                        }}
                        style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="">-- Sin Área --</option>
                        <option value="Salud Digital">Salud Digital</option>
                        <option value="Tecnología">Tecnología</option>
                        <option value="Operaciones">Operaciones</option>
                        <option value="Clínico">Clínico</option>
                        <option value="Administración">Administración</option>
                        <option value="Finanzas">Finanzas</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Legal">Legal</option>
                        {editProjectArea && !['', 'Salud Digital', 'Tecnología', 'Operaciones', 'Clínico', 'Administración', 'Finanzas', 'Marketing', 'Legal'].includes(editProjectArea) && (
                          <option value={editProjectArea}>{editProjectArea}</option>
                        )}
                        <option value="__CUSTOM__">+ Personalizar...</option>
                      </select>
                    )}
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

      {/* MODAL ADJUNTOS CONTROL DE COSTOS */}
      {costItemAttachmentsOpen && currentActiveCostItem && (
        <div className="custom-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1010, backdropFilter: 'blur(4px)' }}>
          <div className="custom-modal-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', width: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#004B87', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Paperclip size={18} />
                Documentos y Cotizaciones Adjuntas
              </h3>
              <button onClick={() => { setCostItemAttachmentsOpen(false); setActiveCostItemForFiles(null); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <div style={{ fontSize: '0.85rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              Ítem: <strong style={{ color: 'var(--text-primary)' }}>{currentActiveCostItem.indexId} - {currentActiveCostItem.description}</strong>
            </div>

            {/* Subir archivo */}
            <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '20px', textAlign: 'center' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#004B87' }}>SUBIR DOCUMENTO (PDF, EXCEL, IMAGEN)</label>
              <input
                type="file"
                id="cost-file-upload-input"
                onChange={handleUploadCostFile}
                disabled={isUploadingCostFile}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => document.getElementById('cost-file-upload-input')?.click()}
                disabled={isUploadingCostFile}
                className="btn btn-primary"
                style={{
                  background: '#0F2C59',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isUploadingCostFile ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Seleccionar Archivo</span>
                  </>
                )}
              </button>
            </div>

            {/* Lista de adjuntos */}
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', display: 'block', marginBottom: '8px' }}>
                Archivos Cargados ({(currentActiveCostItem.attachments || []).length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                {(currentActiveCostItem.attachments || []).length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    No hay documentos adjuntos para este ítem.
                  </div>
                ) : (
                  (currentActiveCostItem.attachments || []).map(att => (
                    <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.85rem', fontWeight: 600, color: '#004B87', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title="Click para ver documento"
                        >
                          {att.name}
                        </a>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {att.type.toUpperCase()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCostFile(att.id)}
                        style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', padding: '4px' }}
                        title="Eliminar archivo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button type="button" onClick={() => { setCostItemAttachmentsOpen(false); setActiveCostItemForFiles(null); }} className="btn btn-secondary" style={{ background: '#004B87', color: 'white', border: 'none' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal para agregar un nuevo responsable desde cualquier campo */}
      {isInlineAddUserOpen && (
        <div className="custom-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
          <div className="custom-modal-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', width: '450px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#004B87', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                👤 Registrar y Asignar Nuevo Actor
              </h3>
              <button onClick={() => setIsInlineAddUserOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Nombre Completo</label>
                <input 
                  type="text" 
                  value={inlineUserName}
                  onChange={e => {
                    const name = e.target.value;
                    setInlineUserName(name);
                    // Generar correo dinámico limpio sin acentos
                    const generatedEmail = name.trim().toLowerCase()
                      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                      .replace(/\s+/g, '.') + '@bupa.cl';
                    setInlineUserEmail(generatedEmail);
                  }}
                  placeholder="Ej: Juan Pérez"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '4px', outline: 'none', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Email Corporativo</label>
                <input 
                  type="email" 
                  value={inlineUserEmail}
                  onChange={e => setInlineUserEmail(e.target.value)}
                  placeholder="juan.perez@bupa.cl"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '4px', outline: 'none', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Rol / Cargo</label>
                  <select
                    value={inlineUserRole}
                    onChange={e => setInlineUserRole(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '4px', outline: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                  >
                    <option value="Project Manager">Project Manager</option>
                    <option value="Ingeniero Biomédico">Ingeniero Biomédico</option>
                    <option value="Físico Médico">Físico Médico</option>
                    <option value="Técnico de TI">Técnico de TI</option>
                    <option value="Mantenimiento Climatización">Mantenimiento Climatización</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Límite Tareas</label>
                  <input 
                    type="number" 
                    min="1" max="50"
                    value={inlineUserMaxTasks}
                    onChange={e => setInlineUserMaxTasks(parseInt(e.target.value) || 5)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '4px', outline: 'none', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => setIsInlineAddUserOpen(false)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ background: '#004B87', color: 'white', border: 'none', padding: '6px 16px', fontSize: '0.8rem', fontWeight: 700 }}
                onClick={async () => {
                  if (!inlineUserName.trim() || !inlineUserEmail.trim()) {
                    alert("Nombre y Email son obligatorios.");
                    return;
                  }
                  try {
                    const { addUser } = useUserStore.getState();
                    const newUserId = `usr-${Date.now()}`;
                    const nameTrimmed = inlineUserName.trim();
                    await addUser({
                      id: newUserId,
                      name: nameTrimmed,
                      email: inlineUserEmail.trim(),
                      role: inlineUserRole,
                      maxTasksLimit: inlineUserMaxTasks
                    });
                    
                    if (inlineUserSuccessCallback) {
                      inlineUserSuccessCallback(nameTrimmed);
                    }
                    setIsInlineAddUserOpen(false);
                  } catch (err) {
                    console.error(err);
                    alert("Error al crear el nuevo responsable.");
                  }
                }}
              >
                Crear y Asignar
              </button>
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
      {/* Global Datalist for users */}
      <datalist id="users-list">
        {users.map(u => (
          <option key={u.id} value={u.name} />
        ))}
      </datalist>

    </div>
  );
}
