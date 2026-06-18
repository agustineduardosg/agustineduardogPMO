"use client";

import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useIncidentStore, Incident, IncidentImpact, IncidentStatus } from '@/store/incidentStore';
import { useEquipmentStore } from '@/store/equipmentStore';
import { useUserStore } from '@/store/userStore';
import { useProjectStore, Project, ParentProject } from '@/store/projectStore';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Trash2, 
  Search, 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle, 
  Hourglass,
  Sliders,
  Filter,
  FileSpreadsheet,
  X,
  Loader2,
  Check,
  Edit2,
  User,
  Layers,
  Building2,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  UploadCloud,
  ArrowLeft,
  Database
} from 'lucide-react';
import { InlineInput, InlineTextarea } from '@/components/InlineInput';
import { Drawer } from '@/components/Drawer';

// Modularized components imports
import { ParentProjectsModal } from '@/components/incidents/ParentProjectsModal';
import { ProjectEditModal } from '@/components/incidents/ProjectEditModal';
import { AssociateGlobalModal } from '@/components/incidents/AssociateGlobalModal';
import { ProjectLandingCard } from '@/components/incidents/ProjectLandingCard';
import { IndependentLandingCard } from '@/components/incidents/IndependentLandingCard';
import { 
  ColumnManagerModal, 
  COLUMN_CONFIG, 
  DEFAULT_COLUMN_ORDER, 
  DEFAULT_COLUMN_WIDTHS 
} from '@/components/incidents/ColumnManagerModal';

// Estilos de impacto
const IMPACT_STYLE: Record<IncidentImpact, { bg: string; color: string; border: string }> = {
  'Crítico': { bg: 'rgba(225, 29, 72, 0.1)', color: '#e11d48', border: 'rgba(225, 29, 72, 0.2)' },
  'Medio': { bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: 'rgba(245, 158, 11, 0.2)' },
  'Bajo': { bg: 'rgba(14, 165, 233, 0.1)', color: '#0284c7', border: 'rgba(14, 165, 233, 0.2)' }
};

// Estilos de estado
const STATUS_STYLE: Record<IncidentStatus, { bg: string; color: string; border: string }> = {
  'Abierto': { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748b', border: 'rgba(100, 116, 139, 0.2)' },
  'En proceso': { bg: 'rgba(245, 158, 11, 0.1)', color: '#b45309', border: 'rgba(245, 158, 11, 0.2)' },
  'Cerrado': { bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: 'rgba(13, 148, 136, 0.2)' }
};

// 6 Fases estándar de calibración clínica
const FASES_CLINICAS = [
  'General',
  'Levantamiento',
  'Parametrización',
  'Pruebas',
  'Capacitación',
  'Validación',
  'Go-live'
];

type ProjectStatus = 'Planificación' | 'Ejecución' | 'Pausado' | 'Completado';

const STATUS_CONFIG: Record<ProjectStatus, { color: string; bg: string; label: string }> = {
  'Planificación': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Planificación' },
  'Ejecución':     { color: '#0079C1', bg: 'rgba(0,121,193,0.1)',  label: 'En Ejecución' },
  'Pausado':       { color: '#6b7280', bg: 'rgba(107,114,128,0.1)',label: 'Pausado' },
  'Completado':    { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Completado' },
};

const AREA_COLORS: Record<string, string> = {
  'Tecnología': '#6366f1', 'Operaciones': '#f59e0b', 'Salud Digital': '#0079C1',
  'Clínico': '#10b981', 'Administración': '#8b5cf6', 'Finanzas': '#ef4444',
  'Marketing': '#ec4899', 'Legal': '#14b8a6',
};

export default function IncidentsPage() {
  const incidents = useIncidentStore(state => state.incidents);
  const fetchIncidents = useIncidentStore(state => state.fetchIncidents);
  const addIncident = useIncidentStore(state => state.addIncident);
  const updateIncident = useIncidentStore(state => state.updateIncident);
  const deleteIncident = useIncidentStore(state => state.deleteIncident);

  const recintos = useEquipmentStore(state => state.recintos);
  const fetchEquipmentData = useEquipmentStore(state => state.fetchEquipmentData);

  const users = useUserStore(state => state.users);
  const fetchUsers = useUserStore(state => state.fetchUsers);

  const projects = useProjectStore(state => state.projects);
  const parentProjects = useProjectStore(state => state.parentProjects);
  const fetchProjects = useProjectStore(state => state.fetchProjects);
  const fetchParentProjects = useProjectStore(state => state.fetchParentProjects);

  const updateProject = useProjectStore(state => state.updateProject);
  const addProject = useProjectStore(state => state.addProject);
  const addParentProject = useProjectStore(state => state.addParentProject);
  const updateParentProject = useProjectStore(state => state.updateParentProject);
  const deleteParentProject = useProjectStore(state => state.deleteParentProject);

  const router = useRouter();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [landingSearch, setLandingSearch] = useState('');
  const [landingAreaFilter, setLandingAreaFilter] = useState('Todos');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const getProjectStats = (projId: string | null) => {
    const projectIncidents = incidents.filter(i => i.projectId === projId);
    const totalCount = projectIncidents.length;
    const openCount = projectIncidents.filter(i => i.estado === 'Abierto').length;
    const inProcessCount = projectIncidents.filter(i => i.estado === 'En proceso').length;
    const closedCount = projectIncidents.filter(i => i.estado === 'Cerrado').length;
    const progress = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;
    return { totalCount, openCount, inProcessCount, closedCount, progress };
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setFilterProject(projectId === 'independent' ? 'none' : projectId);
    const newUrl = `/incidents?projectId=${projectId}`;
    window.history.pushState({ projectId }, '', newUrl);
  };

  const handleClearProject = () => {
    setSelectedProjectId(null);
    setFilterProject('all');
    window.history.pushState(null, '', '/incidents');
  };

  const groupedProjectsForLanding = useMemo(() => {
    const filtered = projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(landingSearch.toLowerCase()) ||
        (p.manager || '').toLowerCase().includes(landingSearch.toLowerCase());
      const matchesArea = landingAreaFilter === 'Todos' || p.area === landingAreaFilter;
      return matchesSearch && matchesArea;
    });

    const groups: Record<string, { parent: ParentProject | null; projects: Project[] }> = {
      'independent': { parent: null, projects: [] }
    };

    parentProjects.forEach(pp => {
      groups[pp.id] = { parent: pp, projects: [] };
    });

    filtered.forEach(p => {
      if (p.parentProjectId && groups[p.parentProjectId]) {
        groups[p.parentProjectId].projects.push(p);
      } else {
        groups['independent'].projects.push(p);
      }
    });

    return groups;
  }, [projects, parentProjects, landingSearch, landingAreaFilter]);

  // Auto-save Feedback State
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Estados para control del Drawer lateral (Master-Detail)
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Estado para colapsar banner y KPIs para ganar espacio vertical
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(true);

  // Incidente seleccionado actualmente de forma reactiva
  const selectedIncident = useMemo(() => {
    if (!selectedIncidentId) return null;
    return incidents.find(i => i.id === selectedIncidentId) || null;
  }, [selectedIncidentId, incidents]);

  // Estados locales para los campos del Drawer (evita lag al escribir en global store)
  const [drawerFecha, setDrawerFecha] = useState('');
  const [drawerFechaCierre, setDrawerFechaCierre] = useState('');
  const [drawerRecintoName, setDrawerRecintoName] = useState('');
  const [drawerProjectId, setDrawerProjectId] = useState<string | null>('');
  const [drawerEquipmentName, setDrawerEquipmentName] = useState('');
  const [drawerFaseAfectada, setDrawerFaseAfectada] = useState('');
  const [drawerResponsable, setDrawerResponsable] = useState('');
  const [drawerImpacto, setDrawerImpacto] = useState('');
  const [drawerEstado, setDrawerEstado] = useState('');
  const [drawerDescripcion, setDrawerDescripcion] = useState('');
  const [drawerPlanDeAccion, setDrawerPlanDeAccion] = useState('');
  const [drawerCustomFields, setDrawerCustomFields] = useState<Record<string, string>>({});

  // Sincronizar estados locales cuando cambie el incidente seleccionado
  useEffect(() => {
    if (selectedIncident) {
      setDrawerFecha(selectedIncident.fecha || '');
      setDrawerFechaCierre(selectedIncident.fechaCierre || '');
      setDrawerRecintoName(selectedIncident.recintoName || '');
      setDrawerProjectId(selectedIncident.projectId || null);
      setDrawerEquipmentName(selectedIncident.equipmentName || '');
      setDrawerFaseAfectada(selectedIncident.faseAfectada || '');
      setDrawerResponsable(selectedIncident.responsable || '');
      setDrawerImpacto(selectedIncident.impacto || '');
      setDrawerEstado(selectedIncident.estado || '');
      setDrawerDescripcion(selectedIncident.descripcion || '');
      setDrawerPlanDeAccion(selectedIncident.planDeAccion || '');
      
      try {
        setDrawerCustomFields(selectedIncident.customFields ? JSON.parse(selectedIncident.customFields) : {});
      } catch (e) {
        setDrawerCustomFields({});
      }
    }
  }, [selectedIncidentId, selectedIncident?.id]);

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

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadFile = async (file: File) => {
    if (!selectedIncident) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/incidents/${selectedIncident.id}/attachments`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Fallo al subir el archivo');
      const newAttachment = await response.json();

      const updatedAttachments = [...(selectedIncident.attachments || []), newAttachment];
      await updateIncident(selectedIncident.id, { attachments: updatedAttachments });
    } catch (err: any) {
      console.error(err);
      alert(`Error al subir archivo: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selectedIncident) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo de respaldo?')) return;
    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Fallo al eliminar el archivo');
      
      const updatedAttachments = (selectedIncident.attachments || []).filter(
        a => a.id !== attachmentId
      );
      await updateIncident(selectedIncident.id, { attachments: updatedAttachments });
    } catch (err: any) {
      console.error(err);
      alert(`Error al eliminar archivo: ${err.message || 'Error desconocido'}`);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchEquipmentData();
    fetchUsers();
    fetchProjects();
    fetchParentProjects();

    const saved = localStorage.getItem('incidents_dashboard_collapsed');
    if (saved !== null) {
      setIsDashboardCollapsed(saved === 'true');
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const projId = params.get('projectId');
      if (projId) {
        setSelectedProjectId(projId);
        setFilterProject(projId === 'independent' ? 'none' : projId);
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const projId = params.get('projectId');
      setSelectedProjectId(projId || null);
      setFilterProject(projId === 'independent' ? 'none' : (projId || 'all'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Estados de filtrado y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterImpact, setFilterImpact] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRecinto, setFilterRecinto] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');

  // Estado para columnas dinámicas y orden
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [editingColIndex, setEditingColIndex] = useState<number | null>(null);
  const [editingColName, setEditingColName] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // Cargar columnas dinámicas y su orden desde base de datos / localStorage
  React.useEffect(() => {
    setIsMounted(true);

    const loadConfig = async () => {
      let loadedCustoms: string[] = [];
      let parsedOrder: string[] = [];
      let loadedWidths: Record<string, number> = {};

      try {
        const response = await fetch('/api/config', { cache: 'no-store' });
        if (response.ok) {
          const configMap = await response.json();
          if (configMap.incidents_custom_columns) {
            loadedCustoms = configMap.incidents_custom_columns;
          }
          if (configMap.incidents_column_order) {
            parsedOrder = configMap.incidents_column_order;
          }
          if (configMap.incidents_column_widths) {
            loadedWidths = configMap.incidents_column_widths;
          }
        }
      } catch (err) {
        console.error('Error loading config from API:', err);
      }

      // Fallback a localStorage si no está en la base de datos
      if (loadedCustoms.length === 0) {
        const savedCols = localStorage.getItem('custom_cols_incidents');
        if (savedCols) {
          try { loadedCustoms = JSON.parse(savedCols); } catch (e) {}
        }
      }
      if (parsedOrder.length === 0) {
        const savedOrder = localStorage.getItem('incidents_column_order');
        if (savedOrder) {
          try { parsedOrder = JSON.parse(savedOrder); } catch (e) {}
        }
      }
      if (Object.keys(loadedWidths).length === 0) {
        const savedWidths = localStorage.getItem('incidents_column_widths');
        if (savedWidths) {
          try { loadedWidths = JSON.parse(savedWidths); } catch (e) {}
        }
      }

      setCustomColumns(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(loadedCustoms)) {
          return loadedCustoms;
        }
        return prev;
      });

      setColumnWidths(prev => {
        const merged = { ...DEFAULT_COLUMN_WIDTHS, ...prev, ...loadedWidths };
        if (JSON.stringify(prev) !== JSON.stringify(merged)) {
          return merged;
        }
        return prev;
      });

      let baseOrder = parsedOrder.length > 0 ? parsedOrder : [...DEFAULT_COLUMN_ORDER];

      DEFAULT_COLUMN_ORDER.forEach(col => {
        if (!baseOrder.includes(col)) {
          // Si estamos usando visibilidad selectiva, no forzar las columnas estándar ocultas de vuelta
          // pero para la primera carga o si no se ha configurado el orden, sí las mostramos.
          if (parsedOrder.length === 0) {
            baseOrder.push(col);
          }
        }
      });

      loadedCustoms.forEach(c => {
        if (!baseOrder.includes(c)) {
          // Si es personalizada y no estaba en el orden, la añadimos por defecto si no hay un orden guardado
          if (parsedOrder.length === 0) {
            baseOrder.push(c);
          }
        }
      });

      baseOrder = baseOrder.filter(c => DEFAULT_COLUMN_ORDER.includes(c) || loadedCustoms.includes(c));
      
      setColumnOrder(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(baseOrder)) {
          return baseOrder;
        }
        return prev;
      });
    };

    // Carga inicial
    loadConfig();
    fetchIncidents();
    fetchEquipmentData();
    fetchUsers();
    fetchProjects();
    fetchParentProjects();

    // Sincronización en tiempo real periódica (cada 4 segundos)
    const intervalId = setInterval(() => {
      loadConfig();
      fetchIncidents();
    }, 4000);

    const saved = localStorage.getItem('incidents_dashboard_collapsed');
    if (saved !== null) {
      setIsDashboardCollapsed(saved === 'true');
    }

    return () => clearInterval(intervalId);
  }, []);

  // Auto-descubrimiento y sincronización de columnas desde la base de datos
  useEffect(() => {
    if (incidents && incidents.length > 0 && isMounted) {
      const dbKeys = new Set<string>();
      incidents.forEach(inc => {
        if (inc.customFields) {
          try {
            const parsed = JSON.parse(inc.customFields);
            Object.keys(parsed).forEach(k => {
              if (k.trim()) dbKeys.add(k.trim());
            });
          } catch (e) {
            console.error('Error parsing customFields for incident ' + inc.id, e);
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
        localStorage.setItem('custom_cols_incidents', JSON.stringify(updated));

        // Sincronizar en PostgreSQL
        fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'incidents_custom_columns', value: updated })
        }).catch(err => console.error(err));

        // Sincronizar el columnOrder para agregar las nuevas columnas descubiertas
        setColumnOrder(prevOrder => {
          const newOrder = [...prevOrder];
          updated.forEach(c => {
            if (!newOrder.includes(c)) {
              newOrder.push(c);
            }
          });
          localStorage.setItem('incidents_column_order', JSON.stringify(newOrder));

          fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'incidents_column_order', value: newOrder })
          }).catch(err => console.error(err));

          return newOrder;
        });
      }
    }
  }, [incidents, customColumns, isMounted]);

  // Guardar columnas dinámicas
  const saveCustomColumns = async (cols: string[]) => {
    setCustomColumns(cols);
    localStorage.setItem('custom_cols_incidents', JSON.stringify(cols));
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'incidents_custom_columns', value: cols })
      });
    } catch (e) {
      console.error('Error saving columns to DB:', e);
    }
  };

  // Mover columna (arriba/abajo o izquierda/derecha)
  const handleMoveColumn = async (idx: number, direction: 'up' | 'down') => {
    const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= columnOrder.length) return;

    const updated = [...columnOrder];
    const temp = updated[idx];
    updated[idx] = updated[nextIdx];
    updated[nextIdx] = temp;

    setColumnOrder(updated);
    localStorage.setItem('incidents_column_order', JSON.stringify(updated));

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'incidents_column_order', value: updated })
      });
    } catch (e) {
      console.error('Error saving column order to DB:', e);
    }
  };

  // Agregar nueva columna dinámica
  const handleAddColumn = async (colName: string) => {
    const cleanName = colName.trim();
    if (!cleanName) return;
    if (customColumns.includes(cleanName) || DEFAULT_COLUMN_ORDER.includes(cleanName)) {
      alert('Ya existe una columna con ese nombre.');
      return;
    }

    const updatedCols = [...customColumns, cleanName];
    await saveCustomColumns(updatedCols);

    const updatedOrder = [...columnOrder, cleanName];
    setColumnOrder(updatedOrder);
    localStorage.setItem('incidents_column_order', JSON.stringify(updatedOrder));

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'incidents_column_order', value: updatedOrder })
      });
    } catch (e) {
      console.error('Error saving column order to DB:', e);
    }
  };

  // Eliminar columna dinámica
  const handleDeleteColumn = async (colName: string) => {
    if (confirm(`¿Está seguro de eliminar la columna "${colName}"? Se borrarán sus datos asociados.`)) {
      const updatedCols = customColumns.filter(c => c !== colName);
      await saveCustomColumns(updatedCols);

      const updatedOrder = columnOrder.filter(c => c !== colName);
      setColumnOrder(updatedOrder);
      localStorage.setItem('incidents_column_order', JSON.stringify(updatedOrder));

      try {
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'incidents_column_order', value: updatedOrder })
        });
      } catch (e) {
        console.error('Error saving column order to DB:', e);
      }
      
      // Limpiar los datos de los incidentes asociados a esa columna
      incidents.forEach(inc => {
        if (inc.customFields) {
          try {
            const customFields = JSON.parse(inc.customFields);
            if (customFields[colName] !== undefined) {
              delete customFields[colName];
              updateIncident(inc.id, { customFields: JSON.stringify(customFields) });
            }
          } catch(e) {}
        }
      });
      if (editingColIndex !== null) setEditingColIndex(null);
    }
  };

  // Renombrar columna dinámica (CRUD)
  const handleRenameColumnDirect = async (oldName: string, newName: string) => {
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const cleanName = newName.trim();
    if ((customColumns.includes(cleanName) || DEFAULT_COLUMN_ORDER.includes(cleanName)) && cleanName !== oldName) {
      alert('Ya existe una columna con ese nombre.');
      return;
    }
    
    // 1. Renombrar en el array customColumns
    const updatedCols = customColumns.map(c => c === oldName ? cleanName : c);
    await saveCustomColumns(updatedCols);

    // 2. Renombrar en el columnOrder
    const updatedOrder = columnOrder.map(c => c === oldName ? cleanName : c);
    setColumnOrder(updatedOrder);
    localStorage.setItem('incidents_column_order', JSON.stringify(updatedOrder));

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'incidents_column_order', value: updatedOrder })
      });
    } catch (e) {
      console.error('Error saving column order to DB:', e);
    }
    
    // 3. Renombrar la llave en el JSON customFields de cada incidente
    incidents.forEach(inc => {
      if (inc.customFields) {
        try {
          const fields = JSON.parse(inc.customFields);
          if (fields[oldName] !== undefined) {
            fields[cleanName] = fields[oldName];
            delete fields[oldName];
            handleUpdateIncident(inc.id, { customFields: JSON.stringify(fields) });
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  // Toggle de visibilidad de cualquier columna
  const handleToggleColumnVisibility = async (colKey: string) => {
    let updated: string[];
    if (columnOrder.includes(colKey)) {
      // Ocultar: quitar de columnOrder
      updated = columnOrder.filter(c => c !== colKey);
    } else {
      // Mostrar: agregar a columnOrder
      const isStandard = DEFAULT_COLUMN_ORDER.includes(colKey);
      if (isStandard) {
        // Encontrar posición original relativa a otras columnas estándar
        const nextOrder: string[] = [];
        let added = false;
        
        DEFAULT_COLUMN_ORDER.forEach(col => {
          if (col === colKey) {
            nextOrder.push(col);
            added = true;
          } else if (columnOrder.includes(col)) {
            nextOrder.push(col);
          }
        });
        
        columnOrder.forEach(col => {
          if (!DEFAULT_COLUMN_ORDER.includes(col)) {
            nextOrder.push(col);
          }
        });
        
        if (!added) {
          nextOrder.push(colKey);
        }
        updated = nextOrder;
      } else {
        updated = [...columnOrder, colKey];
      }
    }
    
    setColumnOrder(updated);
    localStorage.setItem('incidents_column_order', JSON.stringify(updated));
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'incidents_column_order', value: updated })
      });
    } catch (e) {
      console.error('Error saving column order to DB:', e);
    }
  };

  // Ajustar ancho de columna desde botones +/-
  const handleAdjustColumnWidth = async (colKey: string, delta: number) => {
    const currentWidth = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 150;
    const newWidth = Math.max(50, currentWidth + delta);
    const updated = { ...columnWidths, [colKey]: newWidth };
    setColumnWidths(updated);
    localStorage.setItem('incidents_column_widths', JSON.stringify(updated));
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'incidents_column_widths', value: updated })
      });
    } catch (e) {
      console.error('Error saving column widths to DB:', e);
    }
  };

  // Ajustar ancho de columna directo (input numérico)
  const handleSetColumnWidthDirect = async (colKey: string, width: number) => {
    const newWidth = Math.max(50, width);
    const updated = { ...columnWidths, [colKey]: newWidth };
    setColumnWidths(updated);
    localStorage.setItem('incidents_column_widths', JSON.stringify(updated));
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'incidents_column_widths', value: updated })
      });
    } catch (e) {
      console.error('Error saving column widths to DB:', e);
    }
  };

  // Manejador de redimensionamiento de columnas por arrastre (Drag-to-Resize)
  const handleResizeStart = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 150;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (moveEvent.clientX - startX));
      setColumnWidths(prev => {
        const next = { ...prev, [colKey]: newWidth };
        localStorage.setItem('incidents_column_widths', JSON.stringify(next));
        return next;
      });
    };

    const handleMouseUp = async () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Sincronizar el ancho final con la base de datos
      try {
        const saved = localStorage.getItem('incidents_column_widths');
        if (saved) {
          const currentWidths = JSON.parse(saved);
          await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'incidents_column_widths', value: currentWidths })
          });
        }
      } catch (err) {
        console.error('Error saving resized column widths to DB:', err);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Cálculos estadísticos para KPIs
  const stats = useMemo(() => {
    const scopedIncidents = incidents.filter(incident => {
      if (selectedProjectId !== null) {
        if (selectedProjectId === 'independent') {
          return !incident.projectId;
        } else {
          return incident.projectId === selectedProjectId;
        }
      }
      return true;
    });

    const total = scopedIncidents.length;
    const criticos = scopedIncidents.filter(i => i.impacto === 'Crítico').length;
    const enProceso = scopedIncidents.filter(i => i.estado === 'En proceso').length;
    const cerrados = scopedIncidents.filter(i => i.estado === 'Cerrado').length;

    return { total, criticos, enProceso, cerrados };
  }, [incidents, selectedProjectId]);

  // Filtrado de incidentes
  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      const matchesSearch = 
        incident.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.planDeAccion.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesImpact = filterImpact === 'all' || incident.impacto === filterImpact;
      const matchesStatus = filterStatus === 'all' || incident.estado === filterStatus;
      const matchesRecinto = filterRecinto === 'all' || incident.recintoName === filterRecinto;

      // Project Scoping
      let matchesProject = true;
      if (selectedProjectId !== null) {
        if (selectedProjectId === 'independent') {
          matchesProject = !incident.projectId;
        } else {
          matchesProject = incident.projectId === selectedProjectId;
        }
      } else {
        matchesProject = 
          filterProject === 'all' || 
          (filterProject === 'none' && !incident.projectId) || 
          incident.projectId === filterProject;
      }

      return matchesSearch && matchesImpact && matchesStatus && matchesRecinto && matchesProject;
    });
  }, [incidents, searchTerm, filterImpact, filterStatus, filterRecinto, filterProject, selectedProjectId]);

  // Obtener lista única de recintos y responsables cargados del store para los filtros
  const uniqueRecintosInIncidents = useMemo(() => {
    const list = new Set(incidents.map(i => i.recintoName));
    return Array.from(list).filter(Boolean);
  }, [incidents]);

  // Obtener opciones dinámicas personalizadas ingresadas
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

  const totalWidth = useMemo(() => {
    return columnOrder.reduce((acc, colKey) => {
      const w = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 150;
      return acc + w;
    }, 0) + 70; // +70 para la columna de acciones
  }, [columnOrder, columnWidths]);

  // Handler para agregar un nuevo incidente vacío alineado con el modelo de datos
  const handleCreateIncident = () => {
    const nextIndexId = incidents.reduce((max, i) => Math.max(max, i.indexId), 0) + 1;
    const todayStr = new Date().toISOString().split('T')[0];

    // Recinto por defecto
    const defaultRecinto = recintos.length > 0 ? recintos[0].name : 'BUPA CLA';
    const defaultUser = users.length > 0 ? users[0].name : 'Equipo técnico';

    const newIncident: Incident = {
      id: `inc-${Date.now()}`,
      indexId: nextIndexId,
      fecha: todayStr,
      recintoName: defaultRecinto,
      equipmentName: '',
      faseAfectada: 'General',
      descripcion: '',
      impacto: 'Bajo',
      responsable: defaultUser,
      estado: 'Abierto',
      planDeAccion: '',
      fechaCierre: '',
      customFields: '{}'
    };

    addIncident(newIncident);
  };

  // Resetear filtros
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterImpact('all');
    setFilterStatus('all');
    setFilterRecinto('all');
    setFilterProject('all');
  };

  // Exportar incidentes filtrados a Excel
  const handleExportToExcel = () => {
    try {
      // Cabeceras de columnas usando labels legibles
      const headers = columnOrder.map(colKey => {
        const isStandard = DEFAULT_COLUMN_ORDER.includes(colKey);
        return isStandard ? COLUMN_CONFIG[colKey].label : colKey;
      });

      const rows = [headers];

      filteredIncidents.forEach(inc => {
        let customFieldsData: Record<string, string> = {};
        if (inc.customFields) {
          try {
            customFieldsData = JSON.parse(inc.customFields);
          } catch (e) {
            customFieldsData = {};
          }
        }

        const rowData = columnOrder.map(colKey => {
          switch (colKey) {
            case 'id':
              return `#${inc.indexId}`;
            case 'fecha':
              return inc.fecha || '';
            case 'recintoName':
              return inc.recintoName || '';
            case 'equipmentName':
              return inc.equipmentName || '';
            case 'faseAfectada':
              return inc.faseAfectada || '';
            case 'descripcion':
              return inc.descripcion || '';
            case 'impacto':
              return inc.impacto || '';
            case 'responsable':
              return inc.responsable || '';
            case 'estado':
              return inc.estado || '';
            case 'planDeAccion':
              return inc.planDeAccion || '';
            case 'fechaCierre':
              return inc.fechaCierre || '';
            case 'projectId': {
              const proj = projects.find(p => p.id === inc.projectId);
              return proj ? proj.name : (inc.projectId === 'none' ? 'Sin Proyecto' : 'No Asignado');
            }
            default:
              return customFieldsData[colKey] || '';
          }
        });
        rows.push(rowData);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Autoajustar ancho de columnas para mejor visualización
      const maxColWidths = rows[0].map((_, colIdx) => {
        return Math.max(...rows.map(row => String(row[colIdx] || '').length)) + 3;
      });
      ws['!cols'] = maxColWidths.map(w => ({ wch: w > 50 ? 50 : (w < 10 ? 10 : w) }));

      XLSX.utils.book_append_sheet(wb, ws, "Incidentes");
      XLSX.writeFile(wb, `Registro_Incidentes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error al exportar a Excel. Por favor intente nuevamente.");
    }
  };

  if (selectedProjectId === null) {
    const landingStats = {
      totalIncidents: incidents.length,
      openIncidents: incidents.filter(i => i.estado !== 'Cerrado').length,
      activeProjectsCount: projects.length
    };

    const landingAreas = ['Todos', ...Array.from(new Set(projects.map(p => p.area).filter(Boolean) as string[]))];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px', paddingBottom: '48px', animation: 'fadeIn 0.25s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: 800 }}>Gestión de Incidentes y Desviaciones</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>Portafolio de Proyectos y Seguimiento de Calidad / Continuidad Operacional</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-secondary shadow-sm"
              onClick={() => router.push('/import?type=incident')}
              style={{ background: 'transparent', color: '#10b981', border: '1px dashed #10b981', padding: '10px 18px', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
            >
              <UploadCloud size={16} /> Importar Incidentes
            </button>
            <button 
              className="btn btn-secondary shadow-sm"
              onClick={() => setIsParentModalOpen(true)}
              style={{ background: 'transparent', color: '#0079C1', border: '1px solid #0079C1', padding: '10px 18px', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
            >
              <FolderPlus size={16} /> Gestionar Agrupadores
            </button>
            <button 
              className="btn btn-primary shadow-sm"
              onClick={() => router.push('/projects')}
              style={{ padding: '10px 18px', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
            >
              <Plus size={16} /> Gestionar Proyectos (PMO)
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="kpi-grid">
          {[
            { label: 'Proyectos PMO Activos', value: landingStats.activeProjectsCount, color: '#0079C1', icon: <Layers size={22} /> },
            { label: 'Incidentes Registrados', value: landingStats.totalIncidents, color: '#10b981', icon: <Building2 size={22} /> },
            { label: 'Incidentes Abiertos / Proceso', value: landingStats.openIncidents, color: '#7c3aed', icon: <Database size={22} /> }
          ].map(kpi => (
            <div key={kpi.label} className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-primary)' }}>
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
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar proyecto por nombre o PM..." 
              value={landingSearch} 
              onChange={e => setLandingSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 42px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} 
            />
          </div>
          <select 
            value={landingAreaFilter} 
            onChange={e => setLandingAreaFilter(e.target.value)}
            style={{ padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
          >
            {landingAreas.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>

        {/* Grid and Parent Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Render Parent Project Groups */}
          {parentProjects.map(pp => {
            const groupData = groupedProjectsForLanding[pp.id];
            const subProjects = groupData?.projects || [];
            const isCollapsed = !!collapsedGroups[pp.id];
            
            if (subProjects.length === 0) return null;

            return (
              <div 
                key={pp.id} 
                style={{ 
                  background: 'rgba(248, 250, 252, 0.4)', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: '12px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Accordion Header */}
                <div 
                  onClick={() => toggleGroup(pp.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', background: 'rgba(0, 75, 135, 0.06)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#004B87' }}>
                      <Layers size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#003B64' }}>{pp.name}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(0,75,135,0.06)', color: '#004B87' }}>
                          {subProjects.length} Proyecto{subProjects.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {pp.description && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{pp.description}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                    {isCollapsed ? <ChevronRight size={20} style={{ transform: 'rotate(90deg)', transition: 'transform 0.2s' }} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Subprojects cards */}
                {!isCollapsed && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '20px', animation: 'fadeIn 0.2s ease' }}>
                    {subProjects.map(p => (
                      <ProjectLandingCard
                        key={p.id}
                        project={p}
                        stats={getProjectStats(p.id)}
                        parentProjects={parentProjects}
                        onSelect={handleSelectProject}
                        onEdit={setEditingProject}
                        onUpdateParent={async (projectId, parentProjectId) => {
                          await updateProject(projectId, { parentProjectId });
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Render Independent Projects and Global/Independent Card */}
          {(() => {
            const independentData = groupedProjectsForLanding['independent'];
            const subProjects = independentData?.projects || [];
            
            if (subProjects.length === 0 && (landingSearch || landingAreaFilter !== 'Todos')) return null;

            return (
              <div 
                style={{ 
                  background: 'rgba(241, 245, 249, 0.3)', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: '12px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', background: 'rgba(100, 116, 139, 0.06)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#334155' }}>Proyectos e Incidentes Independientes</span>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Proyectos no agrupados e incidentes globales</p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '20px' }}>
                  {!landingSearch && landingAreaFilter === 'Todos' && (
                    <IndependentLandingCard
                      stats={getProjectStats(null)}
                      onSelect={() => handleSelectProject('independent')}
                      onAssociateClick={() => setIsAssociateModalOpen(true)}
                    />
                  )}
                  {subProjects.map(p => (
                    <ProjectLandingCard
                      key={p.id}
                      project={p}
                      stats={getProjectStats(p.id)}
                      parentProjects={parentProjects}
                      onSelect={handleSelectProject}
                      onEdit={setEditingProject}
                      onUpdateParent={async (projectId, parentProjectId) => {
                        await updateProject(projectId, { parentProjectId });
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
          {isParentModalOpen && (
            <ParentProjectsModal
              onClose={() => setIsParentModalOpen(false)}
              parentProjects={parentProjects}
              onAdd={addParentProject}
              onUpdate={updateParentProject}
              onDelete={deleteParentProject}
            />
          )}
          {editingProject && (
            <ProjectEditModal
              project={editingProject}
              onClose={() => setEditingProject(null)}
              onSave={updateProject}
            />
          )}
          {isAssociateModalOpen && (
            <AssociateGlobalModal
              onClose={() => setIsAssociateModalOpen(false)}
              onSave={async (targetProjectId) => {
                const response = await fetch('/api/incidents', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ targetProjectId })
                });
                if (response.ok) {
                  await fetchIncidents();
                  await fetchProjects();
                }
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px', overflow: 'hidden' }}>
      
      {/* Scoped Workspace Header Breadcrumbs */}
      <div style={{ padding: '0 24px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <span 
            style={{ cursor: 'pointer', transition: 'color 0.2s', fontWeight: 600 }} 
            onClick={handleClearProject}
            onMouseEnter={e => e.currentTarget.style.color = '#0079C1'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            Gestión de Incidentes
          </span>
          <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            {selectedProjectId === 'independent' ? 'Incidentes sin Proyecto' : (projects.find(p => p.id === selectedProjectId)?.name || 'Proyecto')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={handleClearProject}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 700 }}
          >
            <ArrowLeft size={14} /> Volver
          </button>
        </div>
      </div>
      
      {/* 1. Header Banner - Bupa Corporate style */}
      <div 
        className="incident-header-banner"
        style={{
          padding: isDashboardCollapsed ? '12px 24px' : '24px 32px',
          gap: isDashboardCollapsed ? '16px' : '24px',
          transition: 'all 0.25s ease-in-out'
        }}
      >
        <div className="incident-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertOctagon size={isDashboardCollapsed ? 22 : 32} color="#FFFFFF" className="pulse-icon" style={{ transition: 'all 0.25s' }} />
            <h1 style={{ fontSize: isDashboardCollapsed ? '1.25rem' : '2rem', color: '#FFFFFF', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', transition: 'all 0.25s' }}>
              Registro de Incidentes y Puntos de Alerta
            </h1>
          </div>
          {!isDashboardCollapsed && (
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.98rem', margin: '8px 0 0', fontWeight: 400, maxWidth: '800px' }}>
              Registre todo evento que pueda representar un riesgo, bloqueo o desviación del plan de implementación corporativo. 
              Permite la corrección preventiva y la trazabilidad de planes de acción inmediatos.
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary shadow-sm"
            onClick={() => {
              const nextVal = !isDashboardCollapsed;
              setIsDashboardCollapsed(nextVal);
              localStorage.setItem('incidents_dashboard_collapsed', String(nextVal));
            }}
            style={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              color: '#FFFFFF', 
              border: '1px solid rgba(255, 255, 255, 0.3)', 
              padding: isDashboardCollapsed ? '6px 14px' : '10px 18px', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isDashboardCollapsed ? 'Ver Panel Completo' : 'Minimizar Resumen'}
          </button>
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
              padding: isDashboardCollapsed ? '6px 14px' : '10px 18px', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Sliders size={16} strokeWidth={2} />
            Columnas
          </button>
          <button 
            className="btn btn-secondary shadow-sm"
            onClick={handleExportToExcel}
            style={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              color: '#FFFFFF', 
              border: '1px solid rgba(255, 255, 255, 0.3)', 
              padding: isDashboardCollapsed ? '6px 14px' : '10px 18px', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <FileSpreadsheet size={16} strokeWidth={2} />
            Exportar a Excel
          </button>
          <button 
            className="btn btn-secondary shadow-sm"
            onClick={handleCreateIncident}
            style={{ 
              background: '#FFFFFF', 
              color: '#004B87', 
              border: 'none', 
              padding: isDashboardCollapsed ? '6px 14px' : '10px 18px', 
              fontSize: '0.88rem', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              borderRadius: 'var(--radius-md)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={16} strokeWidth={3} />
            Registrar Incidente
          </button>
        </div>
      </div>

      {/* Modal de Administración de Columnas */}
      {isAddingCol && (
        <ColumnManagerModal
          onClose={() => setIsAddingCol(false)}
          customColumns={customColumns}
          columnOrder={columnOrder}
          columnWidths={columnWidths}
          onToggleColumnVisibility={handleToggleColumnVisibility}
          onAdjustColumnWidth={handleAdjustColumnWidth}
          onSetColumnWidthDirect={handleSetColumnWidthDirect}
          onMoveColumn={handleMoveColumn}
          onAddColumn={handleAddColumn}
          onRenameColumn={handleRenameColumnDirect}
          onDeleteColumn={handleDeleteColumn}
          editingColIndex={editingColIndex}
          setEditingColIndex={setEditingColIndex}
          editingColName={editingColName}
          setEditingColName={setEditingColName}
        />
      )}

      {/* 2. Faja de KPIs en grid de 4 columnas */}
      {!isDashboardCollapsed && (
        <div className="kpi-grid">
          {/* KPI Total */}
          <div className="kpi-card total-incidents">
            <div className="kpi-card-inner">
              <div>
                <div className="kpi-label">TOTAL INCIDENTES</div>
                <div className="kpi-value">{stats.total}</div>
              </div>
              <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(3, 105, 161, 0.12)', color: '#0369a1' }}>
                <FileSpreadsheet size={20} />
              </div>
            </div>
          </div>

          {/* KPI Críticos */}
          <div className="kpi-card critical-incidents">
            <div className="kpi-card-inner">
              <div>
                <div className="kpi-label">CRÍTICOS</div>
                <div className="kpi-value">{stats.criticos}</div>
              </div>
              <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(185, 28, 28, 0.12)', color: '#b91c1c' }}>
                <AlertTriangle size={20} className="shake-icon" />
              </div>
            </div>
          </div>

          {/* KPI En Proceso */}
          <div className="kpi-card process-incidents">
            <div className="kpi-card-inner">
              <div>
                <div className="kpi-label">EN PROCESO</div>
                <div className="kpi-value">{stats.enProceso}</div>
              </div>
              <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(180, 83, 9, 0.12)', color: '#b45309' }}>
                <Hourglass size={20} className="spin-slow" />
              </div>
            </div>
          </div>

          {/* KPI Cerrados */}
          <div className="kpi-card closed-incidents">
            <div className="kpi-card-inner">
              <div>
                <div className="kpi-label">CERRADOS</div>
                <div className="kpi-value">{stats.cerrados}</div>
              </div>
              <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(15, 118, 110, 0.12)', color: '#0f766e' }}>
                <CheckCircle size={20} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Barra de Controles y Filtros */}
      <div className="controls-panel">
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', width: '100%' }}>
          
          {/* Búsqueda */}
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar por descripción, equipo, responsable o plan..." 
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

          {/* Filtro Recinto */}
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
              {uniqueRecintosInIncidents.map(name => {
                if (recintos.some(r => r.name === name)) return null;
                return <option key={name} value={name}>{name}</option>;
              })}
            </select>
          </div>

          {/* Filtro Impacto */}
          <div className="filter-wrapper">
            <span className="filter-label"><Sliders size={12} /> Impacto</span>
            <select 
              value={filterImpact} 
              onChange={e => setFilterImpact(e.target.value)}
              className="control-select"
            >
              <option value="all">Todos los Impactos</option>
              <option value="Crítico">Crítico</option>
              <option value="Medio">Medio</option>
              <option value="Bajo">Bajo</option>
            </select>
          </div>

          {/* Filtro Estado */}
          <div className="filter-wrapper">
            <span className="filter-label"><Hourglass size={12} /> Estado</span>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="control-select"
            >
              <option value="all">Todos los Estados</option>
              <option value="Abierto">Abierto</option>
              <option value="En proceso">En proceso</option>
              <option value="Cerrado">Cerrado</option>
            </select>
          </div>

          {/* Filtro Proyecto */}
          <div className="filter-wrapper">
            <span className="filter-label"><Sliders size={12} /> Proyecto</span>
            <select 
              value={filterProject} 
              onChange={e => setFilterProject(e.target.value)}
              className="control-select"
            >
              <option value="all">Todos los Proyectos</option>
              <option value="none">Sin Proyecto Asociado</option>
              {parentProjects.map(pp => {
                const subProjs = projects.filter(p => p.parentProjectId === pp.id);
                if (subProjs.length === 0) return null;
                return (
                  <optgroup key={pp.id} label={`📁 ${pp.name}`}>
                    {subProjs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                );
              })}
              {(() => {
                const indeps = projects.filter(p => !p.parentProjectId || !parentProjects.some(pp => pp.id === p.parentProjectId));
                if (indeps.length === 0) return null;
                return (
                  <optgroup label="⚙️ Proyectos Independientes">
                    {indeps.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                );
              })()}
            </select>
          </div>

          {/* Botón de Limpieza */}
          {(searchTerm || filterImpact !== 'all' || filterStatus !== 'all' || filterRecinto !== 'all' || filterProject !== 'all') && (
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

      {/* 4. Tabla de Incidentes - Píxel perfect Excel de Bupa */}
      <div className="table-container shadow-sm" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {!isMounted ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', flex: 1 }}>
            <Loader2 className="spin" size={24} color="#0079C1" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cargando tabla de incidentes...</span>
          </div>
        ) : (
          <div style={{ overflow: 'auto', width: '100%', height: '100%' }}>
            <table className="incidents-table" style={{ width: `${totalWidth}px`, tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  {columnOrder.map((colKey) => {
                    const isStandard = DEFAULT_COLUMN_ORDER.includes(colKey);
                    const label = isStandard ? COLUMN_CONFIG[colKey].label : colKey;
                    const width = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 150;
                    
                    return (
                      <th 
                        key={colKey} 
                        style={{ 
                          width: `${width}px`, 
                          minWidth: `${width}px`,
                          maxWidth: `${width}px`,
                          textAlign: colKey === 'id' || colKey === 'impacto' || colKey === 'estado' ? 'center' : 'left',
                          position: 'relative',
                          paddingRight: '10px',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span 
                            style={{ 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap',
                              cursor: isStandard ? 'default' : 'pointer'
                            }}
                            onClick={() => {
                              if (!isStandard) {
                                setIsAddingCol(true);
                                const cIdx = customColumns.indexOf(colKey);
                                setEditingColIndex(cIdx !== -1 ? cIdx : null);
                                setEditingColName(colKey);
                              }
                            }}
                            title={isStandard ? undefined : "Administrar columna"}
                          >
                            {label}
                          </span>
                          
                          {!isStandard && (
                            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                              <button 
                                onClick={() => {
                                  setIsAddingCol(true);
                                  const cIdx = customColumns.indexOf(colKey);
                                  setEditingColIndex(cIdx !== -1 ? cIdx : null);
                                  setEditingColName(colKey);
                                }} 
                                style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: '1px' }}
                                title={`Renombrar columna "${colKey}"`}
                              >
                                <Edit2 size={10} />
                              </button>
                              <button 
                                onClick={() => handleDeleteColumn(colKey)} 
                                style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', padding: '1px' }}
                                title={`Eliminar columna "${colKey}"`}
                              >
                                <X size={10} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Drag-to-Resize Handle */}
                        <div
                          onMouseDown={(e) => handleResizeStart(e, colKey)}
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '4px',
                            height: '100%',
                            cursor: 'col-resize',
                            zIndex: 15,
                            background: 'transparent'
                          }}
                          className="col-resize-handle"
                          title="Arrastra para cambiar el ancho"
                        />
                      </th>
                    );
                  })}
                  <th style={{ width: '70px', minWidth: '70px', maxWidth: '70px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={columnOrder.length + 1} className="no-data-cell">
                      <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <AlertOctagon size={36} color="var(--text-muted)" />
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No se encontraron incidentes registrados</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {incidents.length === 0 
                            ? 'Comience registrando un incidente clínico con el botón superior.' 
                            : 'Pruebe a limpiar los filtros activos.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc) => {
                    const impactColor = IMPACT_STYLE[inc.impacto] || { bg: 'rgba(0, 121, 193, 0.08)', color: '#0079C1', border: 'rgba(0, 121, 193, 0.15)' };
                    const statusColor = STATUS_STYLE[inc.estado] || { bg: 'rgba(0, 121, 193, 0.08)', color: '#0079C1', border: 'rgba(0, 121, 193, 0.15)' };
                    const customFieldsData = inc.customFields ? JSON.parse(inc.customFields) : {};

                    return (
                      <tr 
                        key={inc.id} 
                        className={`incident-row ${selectedIncidentId === inc.id && isDrawerOpen ? 'active' : ''}`}
                        onDoubleClick={() => {
                          setSelectedIncidentId(inc.id);
                          setIsDrawerOpen(true);
                        }}
                      >
                        {columnOrder.map(colKey => {
                          const width = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 150;
                          const cellStyle: React.CSSProperties = {
                            width: `${width}px`,
                            minWidth: `${width}px`,
                            maxWidth: `${width}px`,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          };

                          switch (colKey) {
                            case 'id':
                              return (
                                <td key={colKey} style={{ ...cellStyle, textAlign: 'center', fontWeight: 800, color: '#004B87', backgroundColor: '#F8FAFC' }}>
                                  #{inc.indexId}
                                </td>
                              );
                            
                            case 'fecha':
                              return (
                                <td key={colKey} style={cellStyle}>
                                  <input
                                    type="date"
                                    value={inc.fecha || ''}
                                    onChange={(e) => handleUpdateIncident(inc.id, { fecha: e.target.value })}
                                    className="table-cell-input"
                                    style={{ fontSize: '0.8rem', padding: '4px' }}
                                  />
                                </td>
                              );
                              
                            case 'recintoName':
                              return (
                                <td key={colKey} style={cellStyle}>
                                  <select
                                    value={inc.recintoName}
                                    onChange={(e) => handleUpdateIncident(inc.id, { recintoName: e.target.value })}
                                    className="table-cell-select"
                                    style={{ fontWeight: 700, color: '#004B87', padding: '4px' }}
                                  >
                                    {recintos.map(r => (
                                      <option key={r.id} value={r.name}>{r.name}</option>
                                    ))}
                                    {uniqueRecintosInIncidents.map(name => {
                                      if (recintos.some(r => r.name === name)) return null;
                                      return <option key={name} value={name}>{name}</option>;
                                    })}
                                  </select>
                                </td>
                              );
                              
                            case 'equipmentName':
                              return (
                                <td key={colKey} style={cellStyle}>
                                  <InlineInput
                                    value={inc.equipmentName}
                                    onSave={(val) => handleUpdateIncident(inc.id, { equipmentName: val })}
                                    placeholder="General"
                                    className="table-cell-input"
                                    style={{ padding: '4px' }}
                                  />
                                </td>
                              );
                              
                            case 'faseAfectada':
                              return (
                                <td key={colKey} style={cellStyle}>
                                  <select
                                    value={inc.faseAfectada}
                                    onChange={(e) => handleUpdateIncident(inc.id, { faseAfectada: e.target.value })}
                                    className="table-cell-select"
                                    style={{ padding: '4px' }}
                                  >
                                    {FASES_CLINICAS.map(fase => (
                                      <option key={fase} value={fase}>{fase}</option>
                                    ))}
                                  </select>
                                </td>
                              );
                              
                            case 'descripcion':
                              return (
                                <td key={colKey} style={{ ...cellStyle, whiteSpace: 'normal' }}>
                                  <InlineTextarea
                                    value={inc.descripcion}
                                    onSave={(val) => handleUpdateIncident(inc.id, { descripcion: val })}
                                    placeholder="Detallar incidente..."
                                    className="table-cell-textarea"
                                    style={{ 
                                      padding: '4px', 
                                      fontSize: '0.8rem', 
                                      minHeight: '32px',
                                      maxHeight: '42px',
                                      overflow: 'hidden',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      textOverflow: 'ellipsis'
                                    }}
                                  />
                                </td>
                              );
                              
                            case 'impacto':
                              return (
                                <td key={colKey} style={cellStyle}>
                                  <select
                                    value={inc.impacto}
                                    onChange={(e) => handleUpdateIncident(inc.id, { impacto: e.target.value })}
                                    className="table-cell-select table-cell-select-badge"
                                    style={{
                                      background: impactColor.bg,
                                      color: impactColor.color,
                                      border: `1px solid ${impactColor.border}`,
                                      borderRadius: '20px',
                                      fontWeight: 'bold',
                                      fontSize: '0.75rem',
                                      padding: '4px 8px',
                                      width: '100%',
                                      minWidth: '95px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="Crítico">Crítico</option>
                                    <option value="Medio">Medio</option>
                                    <option value="Bajo">Bajo</option>
                                  </select>
                                </td>
                              );
                              
                            case 'responsable':
                              return (
                                <td key={colKey} style={cellStyle}>
                                  <select
                                    value={inc.responsable}
                                    onChange={(e) => handleUpdateIncident(inc.id, { responsable: e.target.value })}
                                    className="table-cell-select"
                                    style={{ padding: '4px' }}
                                  >
                                    <optgroup label="Equipo de Proyecto">
                                      {users.map(u => (
                                        <option key={u.id} value={u.name}>{u.name}</option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Equipos de Apoyo">
                                      <option value="Equipo técnico">Equipo técnico</option>
                                      <option value="Laboratorio">Laboratorio</option>
                                      <option value="Usuario / Clínica">Usuario / Clínica</option>
                                      <option value="Proveedor Siemens">Proveedor Siemens</option>
                                      <option value="Sistemas TI Bupa">Sistemas TI Bupa</option>
                                    </optgroup>
                                  </select>
                                </td>
                              );
                              
                            case 'estado':
                              return (
                                <td key={colKey} style={cellStyle}>
                                  <select
                                    value={inc.estado}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const closureDate = val === 'Cerrado' ? new Date().toISOString().split('T')[0] : '';
                                      handleUpdateIncident(inc.id, { 
                                        estado: val,
                                        fechaCierre: closureDate
                                      });
                                    }}
                                    className="table-cell-select table-cell-select-badge"
                                    style={{
                                      background: statusColor.bg,
                                      color: statusColor.color,
                                      border: `1px solid ${statusColor.border}`,
                                      borderRadius: '20px',
                                      fontWeight: 'bold',
                                      fontSize: '0.75rem',
                                      padding: '4px 8px',
                                      width: '100%',
                                      minWidth: '95px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="Abierto">Abierto</option>
                                    <option value="En proceso">En proceso</option>
                                    <option value="Cerrado">Cerrado</option>
                                  </select>
                                </td>
                              );
                              
                            case 'planDeAccion':
                              return (
                                <td key={colKey} style={{ ...cellStyle, whiteSpace: 'normal' }}>
                                  <InlineTextarea
                                    value={inc.planDeAccion}
                                    onSave={(val) => handleUpdateIncident(inc.id, { planDeAccion: val })}
                                    placeholder="Ingresar plan..."
                                    className="table-cell-textarea"
                                    style={{ 
                                      padding: '4px', 
                                      fontSize: '0.8rem', 
                                      minHeight: '32px',
                                      maxHeight: '42px',
                                      overflow: 'hidden',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      textOverflow: 'ellipsis'
                                    }}
                                  />
                                </td>
                              );
                              
                            case 'fechaCierre':
                              return (
                                <td key={colKey} style={cellStyle}>
                                  <input
                                    type="date"
                                    value={inc.fechaCierre || ''}
                                    onChange={(e) => handleUpdateIncident(inc.id, { fechaCierre: e.target.value })}
                                    className="table-cell-input"
                                    style={{ fontSize: '0.8rem', padding: '4px' }}
                                  />
                                </td>
                              );
                              
                            case 'projectId':
                              return (
                                <td key={colKey} style={cellStyle}>
                                  <select
                                    value={inc.projectId || ''}
                                    onChange={(e) => handleUpdateIncident(inc.id, { projectId: e.target.value || null })}
                                    className="table-cell-select"
                                    style={{ padding: '4px', fontWeight: 600, color: '#0079C1' }}
                                  >
                                    <option value="">-- Sin Proyecto --</option>
                                    {parentProjects.map(pp => {
                                      const subProjs = projects.filter(p => p.parentProjectId === pp.id);
                                      if (subProjs.length === 0) return null;
                                      return (
                                        <optgroup key={pp.id} label={`📁 ${pp.name}`}>
                                          {subProjs.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                          ))}
                                        </optgroup>
                                      );
                                    })}
                                    {(() => {
                                      const indeps = projects.filter(p => !p.parentProjectId || !parentProjects.some(pp => pp.id === p.parentProjectId));
                                      if (indeps.length === 0) return null;
                                      return (
                                        <optgroup label="⚙️ Proyectos Independientes">
                                          {indeps.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                          ))}
                                        </optgroup>
                                      );
                                    })()}
                                  </select>
                                </td>
                              );
                              
                            default: {
                              const cellValue = customFieldsData[colKey] || '';
                              return (
                                <td key={colKey} style={cellStyle}>
                                  <InlineInput
                                    value={cellValue}
                                    onSave={(val) => {
                                      const updatedFields = { ...customFieldsData, [colKey]: val };
                                      handleUpdateIncident(inc.id, { customFields: JSON.stringify(updatedFields) });
                                    }}
                                    placeholder="--"
                                    className="table-cell-input"
                                    style={{ padding: '4px' }}
                                  />
                                </td>
                              );
                            }
                          }
                        })}

                        {/* Botón de acción */}
                        <td style={{ textAlign: 'center', width: '70px', minWidth: '70px', maxWidth: '70px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIncidentId(inc.id);
                                setIsDrawerOpen(true);
                              }}
                              className="edit-row-btn"
                              title="Editar / Ver Detalle"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`¿Está seguro de eliminar el incidente #${inc.indexId}?`)) {
                                  deleteIncident(inc.id);
                                }
                              }}
                              className="delete-row-btn"
                              title="Eliminar Incidente"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer Deslizante de Edición Detallada (Master-Detail UX) */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedIncidentId(null);
        }}
        title={selectedIncident ? `Detalle del Incidente #${selectedIncident.indexId}` : "Detalle del Incidente"}
      >
        {selectedIncident ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Cabecera / Estado dentro del Drawer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-tertiary)',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>ID Incidente</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#004B87' }}>#{selectedIncident.indexId}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{
                  background: (IMPACT_STYLE[selectedIncident.impacto as IncidentImpact] || IMPACT_STYLE['Bajo']).bg,
                  color: (IMPACT_STYLE[selectedIncident.impacto as IncidentImpact] || IMPACT_STYLE['Bajo']).color,
                  border: `1px solid ${(IMPACT_STYLE[selectedIncident.impacto as IncidentImpact] || IMPACT_STYLE['Bajo']).border}`,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold'
                }}>
                  {selectedIncident.impacto}
                </span>
                <span style={{
                  background: (STATUS_STYLE[selectedIncident.estado as IncidentStatus] || STATUS_STYLE['Abierto']).bg,
                  color: (STATUS_STYLE[selectedIncident.estado as IncidentStatus] || STATUS_STYLE['Abierto']).color,
                  border: `1px solid ${(STATUS_STYLE[selectedIncident.estado as IncidentStatus] || STATUS_STYLE['Abierto']).border}`,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold'
                }}>
                  {selectedIncident.estado}
                </span>
              </div>
            </div>

            {/* Fila 1: Fechas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="drawer-label">Fecha Registro</label>
                <input 
                  type="date" 
                  value={drawerFecha}
                  onChange={(e) => setDrawerFecha(e.target.value)}
                  onBlur={() => handleUpdateIncident(selectedIncident.id, { fecha: drawerFecha })}
                  className="drawer-input"
                />
              </div>
              <div>
                <label className="drawer-label">Fecha Cierre</label>
                <input 
                  type="date" 
                  value={drawerFechaCierre}
                  onChange={(e) => setDrawerFechaCierre(e.target.value)}
                  onBlur={() => handleUpdateIncident(selectedIncident.id, { fechaCierre: drawerFechaCierre })}
                  className="drawer-input"
                />
              </div>
            </div>

            {/* Fila 2: Sede y Proyecto */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="drawer-label">Sede / Clínica</label>
                <select
                  value={drawerRecintoName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDrawerRecintoName(val);
                    handleUpdateIncident(selectedIncident.id, { recintoName: val });
                  }}
                  className="drawer-select"
                >
                  {recintos.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                  {uniqueRecintosInIncidents.map(name => {
                    if (recintos.some(r => r.name === name)) return null;
                    return <option key={name} value={name}>{name}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="drawer-label">Proyecto Asociado</label>
                <select
                  value={drawerProjectId || ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setDrawerProjectId(val);
                    handleUpdateIncident(selectedIncident.id, { projectId: val });
                  }}
                  className="drawer-select"
                >
                  <option value="">-- Sin Proyecto --</option>
                  {parentProjects.map(pp => {
                    const subProjs = projects.filter(p => p.parentProjectId === pp.id);
                    if (subProjs.length === 0) return null;
                    return (
                      <optgroup key={pp.id} label={`📁 ${pp.name}`}>
                        {subProjs.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {(() => {
                    const indeps = projects.filter(p => !p.parentProjectId || !parentProjects.some(pp => pp.id === p.parentProjectId));
                    if (indeps.length === 0) return null;
                    return (
                      <optgroup label="⚙️ Proyectos Independientes">
                        {indeps.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </optgroup>
                    );
                  })()}
                </select>
              </div>
            </div>

            {/* Fila 3: Equipo y Fase */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="drawer-label">Equipo Afectado</label>
                <input
                  type="text"
                  value={drawerEquipmentName}
                  onChange={(e) => setDrawerEquipmentName(e.target.value)}
                  onBlur={() => handleUpdateIncident(selectedIncident.id, { equipmentName: drawerEquipmentName })}
                  placeholder="Ej: CA 600"
                  className="drawer-input"
                />
              </div>
              <div>
                <label className="drawer-label">Fase Afectada</label>
                <select
                  value={drawerFaseAfectada}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDrawerFaseAfectada(val);
                    handleUpdateIncident(selectedIncident.id, { faseAfectada: val });
                  }}
                  className="drawer-select"
                >
                  {FASES_CLINICAS.map(fase => (
                    <option key={fase} value={fase}>{fase}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fila 4: Responsable */}
            <div>
              <label className="drawer-label">Responsable</label>
              <select
                value={drawerResponsable}
                onChange={(e) => {
                  const val = e.target.value;
                  setDrawerResponsable(val);
                  handleUpdateIncident(selectedIncident.id, { responsable: val });
                }}
                className="drawer-select"
              >
                <optgroup label="Equipo de Proyecto">
                  {users.map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                  ))}
                </optgroup>
                <optgroup label="Equipos de Apoyo">
                  <option value="Equipo técnico">Equipo técnico</option>
                  <option value="Laboratorio">Laboratorio</option>
                  <option value="Usuario / Clínica">Usuario / Clínica</option>
                  <option value="Proveedor Siemens">Proveedor Siemens</option>
                  <option value="Sistemas TI Bupa">Sistemas TI Bupa</option>
                </optgroup>
              </select>
            </div>

            {/* Fila 5: Impacto y Estado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="drawer-label">Impacto</label>
                <select
                  value={drawerImpacto}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom__') {
                      const customVal = prompt("Ingrese el impacto de incidente personalizado:");
                      if (customVal && customVal.trim()) {
                        const cleanVal = customVal.trim();
                        setDrawerImpacto(cleanVal);
                        handleUpdateIncident(selectedIncident.id, { impacto: cleanVal });
                      }
                    } else {
                      setDrawerImpacto(val);
                      handleUpdateIncident(selectedIncident.id, { impacto: val });
                    }
                  }}
                  className="drawer-select"
                >
                  <option value="Crítico">Crítico</option>
                  <option value="Medio">Medio</option>
                  <option value="Bajo">Bajo</option>
                  {uniqueIncidentImpact.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="__custom__">➕ Otro...</option>
                </select>
              </div>
              <div>
                <label className="drawer-label">Estado</label>
                <select
                  value={drawerEstado}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__custom__') {
                      const customVal = prompt("Ingrese el estado de incidente personalizado:");
                      if (customVal && customVal.trim()) {
                        const cleanVal = customVal.trim();
                        const closureDate = cleanVal === 'Cerrado' ? new Date().toISOString().split('T')[0] : '';
                        setDrawerEstado(cleanVal);
                        if (closureDate) setDrawerFechaCierre(closureDate);
                        handleUpdateIncident(selectedIncident.id, { 
                          estado: cleanVal,
                          fechaCierre: closureDate
                        });
                      }
                    } else {
                      const closureDate = val === 'Cerrado' ? new Date().toISOString().split('T')[0] : '';
                      setDrawerEstado(val);
                      if (closureDate) setDrawerFechaCierre(closureDate);
                      handleUpdateIncident(selectedIncident.id, { 
                        estado: val,
                        fechaCierre: closureDate
                      });
                    }
                  }}
                  className="drawer-select"
                >
                  <option value="Abierto">Abierto</option>
                  <option value="En proceso">En proceso</option>
                  <option value="Cerrado">Cerrado</option>
                  {uniqueIncidentStatus.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="__custom__">➕ Otro...</option>
                </select>
              </div>
            </div>

            {/* Editores Amplios */}
            <div>
              <label className="drawer-label">Descripción del Incidente / Desviación</label>
              <textarea
                value={drawerDescripcion}
                onChange={(e) => setDrawerDescripcion(e.target.value)}
                onBlur={() => handleUpdateIncident(selectedIncident.id, { descripcion: drawerDescripcion })}
                placeholder="Detallar el incidente, anomalía técnica o bloqueo con el proveedor..."
                className="drawer-textarea"
                rows={4}
              />
            </div>

            <div>
              <label className="drawer-label">Plan de Acción Inmediato / Mitigación</label>
              <textarea
                value={drawerPlanDeAccion}
                onChange={(e) => setDrawerPlanDeAccion(e.target.value)}
                onBlur={() => handleUpdateIncident(selectedIncident.id, { planDeAccion: drawerPlanDeAccion })}
                placeholder="Ingresar plan inmediato, ticket soporte, acuerdos con proveedor..."
                className="drawer-textarea"
                rows={4}
              />
            </div>

            {/* Campos Personalizados Dinámicos */}
            {customColumns.length > 0 && (
              <div style={{
                marginTop: '10px',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '16px'
              }}>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '12px'
                }}>
                  Campos Personalizados
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {customColumns.map(col => {
                    const cellValue = drawerCustomFields[col] || '';
                    return (
                      <div key={col}>
                        <label className="drawer-label">{col}</label>
                        <input
                          type="text"
                          value={cellValue}
                          onChange={(e) => {
                            const updatedFields = { ...drawerCustomFields, [col]: e.target.value };
                            setDrawerCustomFields(updatedFields);
                          }}
                          onBlur={() => {
                            handleUpdateIncident(selectedIncident.id, { customFields: JSON.stringify(drawerCustomFields) });
                          }}
                          placeholder={`Ingresar ${col.toLowerCase()}...`}
                          className="drawer-input"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Respaldos y Archivos Adjuntos */}
            <div style={{
              marginTop: '16px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px'
            }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '12px',
                letterSpacing: '0.03em'
              }}>
                Respaldos y Archivos Adjuntos
              </span>

              {/* Drag and Drop Zone */}
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{ 
                  border: '2.5px dashed var(--border-strong)', 
                  borderRadius: '8px', 
                  padding: '24px', 
                  textAlign: 'center', 
                  cursor: 'pointer', 
                  background: 'var(--bg-tertiary)', 
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                    <Loader2 className="animate-spin" size={24} color="var(--accent-primary)" />
                    <p style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Subiendo archivo...</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '24px' }}>📄</span>
                      <span style={{ fontSize: '24px' }}>📊</span>
                      <span style={{ fontSize: '24px' }}>🖼️</span>
                    </div>
                    <p style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 600, margin: '0 0 4px 0' }}>
                      Arrastra respaldos o haz clic aquí
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0, textAlign: 'center' }}>
                      Archivos PDF, Word, Excel, Imágenes.
                    </p>
                  </>
                )}
              </div>

              {/* List of uploaded attachments */}
              {selectedIncident.attachments && selectedIncident.attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Archivos cargados:</label>
                  {selectedIncident.attachments.map(att => {
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
                          <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                            {att.name}
                          </span>
                        </a>
                        <button 
                          onClick={() => handleDeleteAttachment(att.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          className="delete-attachment-btn"
                          title="Eliminar archivo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No hay ningún incidente seleccionado.
          </div>
        )}
      </Drawer>

      {/* Estilos CSS Scoped para lograr la estética World-Class */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Banner Bupa */
        .incident-header-banner {
          background: linear-gradient(135deg, #004B87 0%, #0079C1 100%);
          border-radius: var(--radius-lg);
          padding: 24px 32px;
          color: #FFFFFF;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 10px 25px -5px rgba(0, 75, 135, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          position: relative;
          overflow: hidden;
          animation: slideIn 0.5s ease-out;
        }

        .incident-header-banner::before {
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

        /* KPIs Estilo Premium */
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
        .total-incidents {
          background: #E0F2FE; /* Celeste */
          border-color: #BAE6FD;
        }
        .total-incidents .kpi-label { color: #0369A1; }
        .total-incidents .kpi-value { color: #0C4A6E; }

        .critical-incidents {
          background: #FFE4E6; /* Rosado */
          border-color: #FECDD3;
        }
        .critical-incidents .kpi-label { color: #B91C1C; }
        .critical-incidents .kpi-value { color: #881337; }

        .process-incidents {
          background: #FEF3C7; /* Amarillo Claro */
          border-color: #FDE68A;
        }
        .process-incidents .kpi-label { color: #B45309; }
        .process-incidents .kpi-value { color: #78350F; }

        .closed-incidents {
          background: #D1FAE5; /* Verde Claro */
          border-color: #A7F3D0;
        }
        .closed-incidents .kpi-label { color: #0F766E; }
        .closed-incidents .kpi-value { color: #115E59; }

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

        .incidents-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.82rem;
          text-align: left;
        }

        .incidents-table th {
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

        /* Col-resize handle premium styles */
        .col-resize-handle {
          opacity: 0;
          background: var(--accent-primary) !important;
          transition: opacity 0.15s ease, width 0.15s ease;
        }
        .col-resize-handle:hover,
        th:hover .col-resize-handle {
          opacity: 0.4;
        }
        .col-resize-handle:active {
          opacity: 1 !important;
          width: 6px !important;
        }

        .incident-row {
          border-bottom: 1px solid var(--border-subtle);
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        .incident-row:hover {
          background-color: #F8FAFC !important;
        }

        .incident-row.active {
          background-color: rgba(0, 75, 135, 0.05) !important;
          border-left: 4px solid var(--accent-primary);
        }

        .incident-row td {
          padding: 8px 10px;
          vertical-align: middle;
          border-bottom: 1px solid #E2E8F0;
        }

        /* Inputs y Selects dentro de la tabla */
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

        .table-cell-input:hover {
          border: 1px dashed rgba(0, 75, 135, 0.3);
          background: rgba(0, 75, 135, 0.02);
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
          color: var(--text-secondary);
          font-family: inherit;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          appearance: none;
          -webkit-appearance: none;
        }

        .table-cell-select:hover {
          border: 1px dashed rgba(0, 75, 135, 0.3);
          background: rgba(0, 75, 135, 0.02);
        }

        .table-cell-select:focus {
          border: 1px solid var(--accent-primary);
          background: var(--bg-secondary);
          box-shadow: 0 0 0 2px rgba(0, 121, 193, 0.1);
        }

        .table-cell-select-badge {
          text-align: center;
          text-align-last: center;
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
          font-size: 0.8rem;
          resize: vertical;
          line-height: 1.4;
          transition: all 0.15s ease;
        }

        .table-cell-textarea:hover {
          border: 1px dashed rgba(0, 75, 135, 0.3);
          background: rgba(0, 75, 135, 0.02);
        }

        .table-cell-textarea:focus {
          border: 1px solid var(--accent-primary);
          background: var(--bg-secondary);
          box-shadow: 0 0 0 2px rgba(0, 121, 193, 0.1);
        }

        .table-cell-select-badge {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          text-align: center;
          text-align-last: center;
        }

        /* Botón de borrado de fila */
        .delete-row-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }

        .delete-row-btn:hover {
          color: var(--accent-danger);
          background: rgba(225, 29, 72, 0.08);
        }

        /* Botón de edición rápida */
        .edit-row-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }

        .edit-row-btn:hover {
          color: var(--accent-primary);
          background: rgba(0, 75, 135, 0.08);
        }

        /* Vista scannable de celdas de texto */
        .clickable-preview-cell {
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }

        .clickable-preview-cell:hover {
          background-color: rgba(0, 75, 135, 0.02) !important;
        }

        .preview-text {
          font-size: 0.8rem;
          color: var(--text-primary);
          line-height: 1.4;
          white-space: normal;
          word-break: break-word;
          transition: color 0.15s ease, text-decoration 0.15s ease;
        }

        .clickable-preview-cell:hover .preview-text {
          color: var(--accent-primary);
          text-decoration: underline dotted 1.5px;
        }

        .placeholder-text {
          color: var(--text-muted);
          font-style: italic;
        }

        /* Formulario premium del Drawer lateral */
        .drawer-label {
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--text-secondary);
          text-transform: uppercase;
          display: block;
          margin-bottom: 6px;
          letter-spacing: 0.03em;
        }

        .drawer-input,
        .drawer-select,
        .drawer-textarea {
          width: 100%;
          padding: 10px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .drawer-input:focus,
        .drawer-select:focus,
        .drawer-textarea:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(0, 75, 135, 0.08);
        }

        .drawer-textarea {
          resize: vertical;
          line-height: 1.4;
          min-height: 120px;
        }

        .file-dropzone:hover {
          background: rgba(0, 121, 193, 0.05) !important;
          border-color: var(--accent-primary) !important;
        }

        .attachment-link:hover span {
          text-decoration: underline;
          color: var(--accent-secondary) !important;
        }

        .delete-attachment-btn {
          transition: color 0.15s ease;
        }

        .delete-attachment-btn:hover {
          color: var(--accent-danger) !important;
        }

        .no-data-cell {
          text-align: center;
          background: #FCFDFE;
        }

        /* Animaciones */
        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .pulse-icon {
          animation: pulse 3s infinite ease-in-out;
        }

        .spin-slow {
          animation: spin 6s linear infinite;
        }

        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }

        .shake-icon:hover {
          animation: shake 0.4s ease-in-out infinite;
        }

        /* Responsive KPIs */
        @media (max-width: 1200px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
          .incident-header-banner {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
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
