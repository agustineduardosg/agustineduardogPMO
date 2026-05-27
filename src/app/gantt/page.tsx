"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useProjectStore, Project, Task, Phase, TaskStatus, TaskPriority } from '@/store/projectStore';
import { useUserStore } from '@/store/userStore';
import { format, differenceInDays, addDays, eachDayOfInterval, startOfWeek, addWeeks, startOfMonth, addMonths, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Save, X, Trash2, Plus, ChevronDown, ChevronRight, AlertTriangle, Edit2, FolderPlus, Loader2, Paperclip } from 'lucide-react';
import { addBusinessDays, differenceInBusinessDays } from '@/utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';

type ViewMode = 'day' | 'week' | 'month';

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

export default function GanttPage() {
  const projects = useProjectStore(state => state.projects);
  const activeProjectId = useProjectStore(state => state.activeProjectId);
  const updateTask = useProjectStore(state => state.updateTask);
  const deleteTask = useProjectStore(state => state.deleteTask);
  const addTask = useProjectStore(state => state.addTask);
  const addPhase = useProjectStore(state => state.addPhase);
  const updatePhase = useProjectStore(state => state.updatePhase);
  const deletePhase = useProjectStore(state => state.deletePhase);
  const addProject = useProjectStore(state => state.addProject);
  const fetchProjects = useProjectStore(state => state.fetchProjects);
  const setActiveProject = useProjectStore(state => state.setActiveProject);

  const users = useUserStore(state => state.users);
  const fetchUsers = useUserStore(state => state.fetchUsers);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const project = projects.find(p => p.id === activeProjectId);

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  
  const [editingTask, setEditingTask] = useState<{task: Task, phaseId: string, isNew: boolean} | null>(null);
  const [editingPhase, setEditingPhase] = useState<{phase: Phase, isNew: boolean} | null>(null);
  const [draggedTask, setDraggedTask] = useState<{ id: string, startOffsetDays: number } | null>(null);
  
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
  const [collapsedTasks, setCollapsedTasks] = useState<Record<string, boolean>>({});
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  
  const toggleTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar abrir drawer de edición
    setCollapsedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [wbsWidth, setWbsWidth] = useState(380);
  const [isResizingWbs, setIsResizingWbs] = useState(false);
  const [predecessorSearch, setPredecessorSearch] = useState('');
  const [predecessorDropdownOpen, setPredecessorDropdownOpen] = useState(false);
  const hasAutoScrolled = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const allTasks = useMemo(() => {
    return project?.phases.flatMap(ph => ph.tasks) || [];
  }, [project]);

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

  const { startDate, endDate, periods, totalDays } = useMemo(() => {
    if (!project) return { startDate: new Date(), endDate: new Date(), periods: [], totalDays: 0 };
    
    const safeDate = (d: any) => {
      if (!d) return null;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    let minDate = safeDate(project.startDate) || new Date();
    let maxDate = safeDate(project.endDate) || new Date();

    project.phases.forEach(ph => {
      const phStart = safeDate(ph.startDate);
      const phEnd = safeDate(ph.endDate);
      if (phStart && phStart < minDate) minDate = phStart;
      if (phEnd && phEnd > maxDate) maxDate = phEnd;

      ph.tasks.forEach(t => {
        const tStart = safeDate(t.startDate);
        const tEnd = safeDate(t.endDate);
        if (tStart && tStart < minDate) minDate = tStart;
        if (tEnd && tEnd > maxDate) maxDate = tEnd;
      });
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
    const container = scrollContainerRef.current;
    const containerWidth = container.clientWidth || 1000;
    const todayOffset = getOffsetAndWidth(new Date(), new Date()).offset;
    
    // Center today line inside the visible timeline viewport
    const scrollLeft = todayOffset - (containerWidth - wbsWidth) / 2;
    
    container.scrollTo({
      left: Math.max(0, scrollLeft),
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    if (project && !hasAutoScrolled.current) {
      const timeout = setTimeout(() => {
        scrollToToday();
        hasAutoScrolled.current = true;
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [project?.id]);

  useEffect(() => {
    if (project) {
      scrollToToday();
    }
  }, [viewMode]);

  const togglePhase = (phaseId: string) => {
    setCollapsedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

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
      const savedTask = { ...editingTask.task };
      if (editingTask.isNew) {
        addTask(project.id, editingTask.phaseId, savedTask);
      } else {
        updateTask(project.id, editingTask.phaseId, savedTask.id, savedTask);
      }

      // Smooth scroll viewport to focus exactly on the saved task's bar
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const s = new Date(savedTask.startDate);
          let offset = 0;
          if (viewMode === 'day') {
            offset = differenceInDays(s, startDate) * colWidth;
          } else if (viewMode === 'week') {
            offset = (differenceInDays(s, startDate) / 7) * colWidth;
          } else {
            offset = (differenceInDays(s, startDate) / 30) * colWidth;
          }
          scrollContainerRef.current.scrollTo({
            left: Math.max(0, offset - 300),
            behavior: 'smooth'
          });
        }
      }, 400);

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

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingWbs(true);
    const startX = e.clientX;
    const initialWidth = wbsWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(250, Math.min(600, initialWidth + deltaX));
      setWbsWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingWbs(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const getOffsetAndWidth = (start: Date, end: Date) => {
    let offset = 0;
    let width = 0;
    const s = new Date(start);
    const e = new Date(end);
    if (viewMode === 'day') {
      offset = differenceInDays(s, startDate) * colWidth;
      width = (differenceInDays(e, s) + 1) * colWidth;
    } else if (viewMode === 'week') {
      offset = (differenceInDays(s, startDate) / 7) * colWidth;
      width = (differenceInDays(e, s) / 7) * colWidth;
    } else {
      offset = (differenceInDays(s, startDate) / 30) * colWidth;
      width = (differenceInDays(e, s) / 30) * colWidth;
    }
    return { offset: Math.max(0, offset), width: Math.max(colWidth/4, width) };
  };

  const todayOffset = getOffsetAndWidth(new Date(), new Date()).offset;

  const renderTaskRow = (task: Task, phase: Phase, depth: number = 0) => {
    const isAtRisk = task.status === 'At Risk';
    const isCompleted = task.status === 'Completed';
    const isMilestone = task.duration === 0;
    const barColor = isAtRisk ? 'var(--accent-danger)' : isCompleted ? 'var(--accent-success)' : 'var(--accent-primary)';
    
    const isDragged = draggedTask?.id === task.id;
    const dragOffsetPx = isDragged ? draggedTask.startOffsetDays * colWidth : 0;
    
    const subtasks = phase.tasks.filter(t => t.parentId === task.id);
    const isTaskCollapsed = collapsedTasks[task.id];
    const hasSubtasks = subtasks.length > 0;

    return (
      <React.Fragment key={task.id}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.2s', background: 'transparent', position: 'relative', zIndex: 3 }} onClick={() => handleTaskClick(task, phase.id)} className="task-row">
          <div style={{ width: `${wbsWidth}px`, flexShrink: 0, padding: `12px 16px 12px ${16 + (depth * 24)}px`, fontSize: '0.9rem', borderRight: '1px solid var(--border-light)', position: 'sticky', left: 0, background: isDragged ? 'var(--bg-tertiary)' : 'var(--bg-secondary)', zIndex: 5, borderLeft: depth > 0 ? '4px solid var(--border-light)' : 'none' }}>
            <div style={{ fontWeight: depth === 0 ? '600' : '500', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              
              {/* Chevron botón de colapso de subtareas */}
              {hasSubtasks ? (
                <button 
                  onClick={(e) => {
                    toggleTask(task.id, e);
                  }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', marginRight: '2px', outline: 'none' }}
                >
                  {isTaskCollapsed ? <ChevronRight size={14} color="var(--text-secondary)" /> : <ChevronDown size={14} color="var(--text-secondary)" />}
                </button>
              ) : (
                depth > 0 && <div style={{ width: '16px' }} />
              )}

              {isAtRisk && <AlertTriangle size={14} color="var(--accent-danger)" />}
              {task.wbsId && <span style={{ color: depth === 0 ? 'var(--text-secondary)' : 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{task.wbsId}</span>}
              <span style={{ flex: 1, whiteSpace: 'normal', lineHeight: '1.2' }}>{task.name}</span>
              
              {/* Botón Añadir Subtarea */}
              <motion.button 
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.88 }}
                className="icon-btn subtask-btn" 
                style={{ width: '22px', height: '22px', border: 'none', background: 'var(--bg-tertiary)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} 
                title="Añadir Subtarea" 
                onClick={(e) => handleCreateSubtask(e, task.id, phase.id)}
              >
                <Plus size={14} color="var(--accent-primary)" />
              </motion.button>
            </div>
            
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>👤 {task.assignee}</span>
                <StatusBadge status={task.status} />
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                {format(new Date(task.startDate), 'dd/MM')} - {isMilestone ? 'Hito' : format(new Date(task.endDate), 'dd/MM')}
              </span>
            </div>
          </div>
          
          <div style={{ position: 'relative', width: `${gridWidth}px` }}>
            {(() => {
              const { offset, width } = getOffsetAndWidth(task.startDate, task.endDate);
              
              if (isMilestone) {
                return (
                  <div 
                    onMouseDown={(e) => handleTaskDragStart(e, task, phase.id)}
                    onDoubleClick={() => handleTaskClick(task, phase.id)}
                    style={{ 
                      position: 'absolute', 
                      top: '15px', 
                      left: `${offset + dragOffsetPx - 10}px`, 
                      width: '20px', 
                      height: '20px', 
                      background: barColor, 
                      transform: isDragged ? 'rotate(45deg) scale(1.15)' : 'rotate(45deg)', 
                      boxShadow: isDragged 
                        ? '0 0 15px rgba(2, 132, 199, 0.6), 0 4px 12px rgba(0,0,0,0.2)' 
                        : '0 2px 4px rgba(0,0,0,0.2)',
                      cursor: 'ew-resize',
                      zIndex: isDragged ? 10 : 1,
                      transition: isDragged ? 'none' : 'left 0.2s, transform 0.2s, box-shadow 0.2s'
                    }} 
                  />
                );
              }

              return (
                <div 
                  onMouseDown={(e) => handleTaskDragStart(e, task, phase.id)}
                  onDoubleClick={() => handleTaskClick(task, phase.id)}
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
                    boxShadow: isDragged 
                      ? '0 0 15px rgba(2, 132, 199, 0.6), 0 4px 12px rgba(0, 0, 0, 0.2)' 
                      : '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: 'ew-resize',
                    zIndex: isDragged ? 10 : 1,
                    transition: isDragged ? 'none' : 'left 0.2s, transform 0.2s, box-shadow 0.2s',
                    marginTop: depth > 0 ? '3px' : '0',
                    transform: isDragged ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${task.progress}%`, background: 'rgba(255,255,255,0.25)' }} />
                  {width > 40 && <span style={{ position: 'relative', zIndex: 1, whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{task.progress}%</span>}
                  
                  {/* Predecesores visuales al final de la barra */}
                  {task.dependencies && task.dependencies.length > 0 && (
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.85)', marginLeft: '6px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '2px', position: 'absolute', right: '8px', zIndex: 2 }}>
                      🔗 {task.dependencies.map(depId => allTasks.find(t => t.id === depId)?.wbsId).filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
        
        {/* Renderizar subtareas recursivamente con animación de acordeón y solución a bug de altura 0 inicial */}
        <AnimatePresence initial={false}>
          {!isTaskCollapsed && subtasks.length > 0 && (
            <motion.div
              initial={false} // EVITA EL BUG DE ALTURA 0 AL MONTAR
              animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
              exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              style={{ minWidth: '100%', width: 'max-content' }}
            >
              {subtasks.map(sub => renderTaskRow(sub, phase, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </React.Fragment>
    );
  };

  if (!project) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg-secondary)', padding: '40px' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid var(--border-light)' }}>
        <FolderPlus size={40} color="var(--accent-primary)" />
      </div>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '12px', color: 'var(--text-primary)' }}>No hay un proyecto activo</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', textAlign: 'center', maxWidth: '450px', fontSize: '1.1rem', lineHeight: '1.5' }}>
        Parece que aún no tienes proyectos en este espacio de trabajo.
      </p>
      <div style={{ display: 'flex', gap: '16px' }}>
        <button className="btn btn-primary" onClick={() => {
          const newProj: Project = {
            id: `proj-${Date.now()}`,
            name: 'Nuevo Proyecto',
            startDate: new Date(),
            endDate: addBusinessDays(new Date(), 10),
            phases: []
          };
          addProject(newProj);
        }}>+ Crear Proyecto</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Gantt Enterprise</h1>
          
          {/* Selector Dinámico de Proyectos con Estilo Glassmorphism */}
          <div style={{ position: 'relative', marginTop: '6px' }}>
            <button 
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)',
                outline: 'none'
              }}
            >
              <FolderPlus size={14} color="var(--accent-primary)" />
              <span>{project.name}</span>
              <ChevronDown size={14} style={{ transform: isProjectDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            
            {isProjectDropdownOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setIsProjectDropdownOpen(false)} />
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  backdropFilter: 'blur(12px)',
                  marginTop: '6px',
                  width: '320px',
                  zIndex: 100,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.15s ease'
                }}>
                  <div style={{ padding: '8px 12px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-tertiary)' }}>
                    Seleccionar Proyecto Activo
                  </div>
                  {projects.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => {
                        setActiveProject(p.id);
                        setIsProjectDropdownOpen(false);
                      }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        background: p.id === activeProjectId ? 'rgba(0,121,193,0.08)' : 'transparent',
                        color: p.id === activeProjectId ? 'var(--accent-primary)' : 'var(--text-primary)',
                        fontWeight: p.id === activeProjectId ? 700 : 500,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.2s'
                      }}
                      className="proj-select-option"
                    >
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.id === activeProjectId ? 'var(--accent-primary)' : 'transparent' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <motion.button 
            whileHover={{ scale: 1.03, translateY: -1 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-primary" 
            onClick={handleCreatePhase}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <FolderPlus size={18} /> Nueva Fase
          </motion.button>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-strong)', margin: '0 4px' }} />
          
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-secondary" 
            onClick={() => setViewMode('day')} 
            style={{ opacity: viewMode === 'day' ? 1 : 0.6, background: viewMode === 'day' ? 'var(--bg-tertiary)' : 'transparent', border: viewMode === 'day' ? '1px solid var(--border-strong)' : '1px solid var(--border-light)', cursor: 'pointer' }}
          >
            Días
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-secondary" 
            onClick={() => setViewMode('week')} 
            style={{ opacity: viewMode === 'week' ? 1 : 0.6, background: viewMode === 'week' ? 'var(--bg-tertiary)' : 'transparent', border: viewMode === 'week' ? '1px solid var(--border-strong)' : '1px solid var(--border-light)', cursor: 'pointer' }}
          >
            Semanas
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-secondary" 
            onClick={() => setViewMode('month')} 
            style={{ opacity: viewMode === 'month' ? 1 : 0.6, background: viewMode === 'month' ? 'var(--bg-tertiary)' : 'transparent', border: viewMode === 'month' ? '1px solid var(--border-strong)' : '1px solid var(--border-light)', cursor: 'pointer' }}
          >
            Meses
          </motion.button>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--border-strong)', margin: '0 4px' }} />
          
          <motion.button 
            whileHover={{ scale: 1.03, translateY: -1 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-secondary" 
            onClick={scrollToToday}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <Calendar size={18} /> Hoy
          </motion.button>
        </div>
      </header>

      <div className="glass-panel" style={{ flex: 1, overflow: 'auto', padding: '0', position: 'relative', background: 'var(--bg-secondary)' }} ref={scrollContainerRef}>
        <div style={{ minWidth: '100%', width: 'max-content', position: 'relative' }}>
          
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10 }}>
            <div style={{ width: `${wbsWidth}px`, flexShrink: 0, padding: '16px', fontWeight: 'bold', borderRight: '1px solid var(--border-light)', position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 11, color: 'var(--text-primary)' }}>
              Estructura del Proyecto (WBS)
              {/* Drag Handle Overlay */}
              <div 
                onMouseDown={handleResizeStart}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: '-4px',
                  bottom: 0,
                  width: '8px',
                  cursor: 'col-resize',
                  zIndex: 20,
                  background: 'transparent',
                  transition: 'background 0.2s'
                }}
                className="wbs-header-resizer"
              />
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

          {/* Grid lines and today line */}
          <div style={{ position: 'absolute', top: '64px', bottom: 0, left: `${wbsWidth}px`, width: `${gridWidth}px`, backgroundImage: `repeating-linear-gradient(to right, transparent, transparent ${colWidth - 1}px, var(--border-subtle) ${colWidth - 1}px, var(--border-subtle) ${colWidth}px)`, pointerEvents: 'none', zIndex: 0 }} />
          {todayOffset > 0 && todayOffset < gridWidth && (
            <div style={{ position: 'absolute', top: '64px', bottom: 0, left: `calc(${wbsWidth}px + ${todayOffset + (colWidth/2)}px)`, width: '2px', background: 'rgba(239, 68, 68, 0.4)', zIndex: 2, pointerEvents: 'none' }} />
          )}

          {/* Resizing Guideline */}
          {isResizingWbs && (
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${wbsWidth}px`,
              width: '2px',
              background: 'var(--accent-primary)',
              zIndex: 100,
              pointerEvents: 'none',
              boxShadow: '0 0 8px var(--accent-primary)',
            }} />
          )}

          <div style={{ position: 'relative', zIndex: 3 }}>
            {project.phases.map((phase) => {
              const isCollapsed = collapsedPhases[phase.id];
              return (
              <React.Fragment key={phase.id}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'transparent', position: 'relative', zIndex: 3 }}>
                  <div style={{ width: `${wbsWidth}px`, flexShrink: 0, padding: '12px 16px', fontWeight: 'bold', color: 'var(--text-primary)', borderRight: '1px solid var(--border-light)', position: 'sticky', left: 0, background: 'var(--bg-tertiary)', zIndex: 5, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', width: '20px' }} onClick={() => togglePhase(phase.id)}>
                      {isCollapsed ? <ChevronRight size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
                    </div>
                    {phase.wbsId && <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', minWidth: '24px' }}>{phase.wbsId}.</span>}
                    <span style={{ flex: 1, cursor: 'pointer' }} onClick={() => togglePhase(phase.id)}>{phase.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginRight: '8px', minWidth: '40px', textAlign: 'right' }}>{phase.progress}%</span>
                    
                    <motion.button 
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      className="icon-btn" 
                      style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                      title="Editar Fase" 
                      onClick={() => handleEditPhase(phase)}
                    >
                      <Edit2 size={14} />
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      className="icon-btn" 
                      style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                      title="Añadir tarea a esta fase" 
                      onClick={() => handleCreateTask(phase.id)}
                    >
                      <Plus size={16} color="var(--accent-primary)" />
                    </motion.button>
                  </div>
                  <div style={{ position: 'relative', width: `${gridWidth}px` }}>
                    {(() => {
                      if (phase.tasks.length === 0) return null;
                      const { offset, width } = getOffsetAndWidth(phase.startDate, phase.endDate);
                      const isPhaseCompleted = phase.progress === 100;
                      const progressGradient = isPhaseCompleted
                        ? 'linear-gradient(90deg, #0D9488, #14B8A6)'
                        : 'linear-gradient(90deg, var(--accent-primary), var(--accent-info))';

                      return (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            top: '14px', 
                            left: `${offset}px`, 
                            width: `${width}px`, 
                            height: '14px', 
                            background: 'rgba(148, 163, 184, 0.12)', 
                            borderRadius: '9999px', 
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                            overflow: 'hidden',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center'
                          }} 
                        >
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${phase.progress}%` }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                            style={{ 
                              height: '100%', 
                              background: progressGradient, 
                              borderRadius: '9999px',
                              boxShadow: isPhaseCompleted ? '0 0 10px rgba(13, 148, 136, 0.3)' : '0 0 10px rgba(0, 121, 193, 0.3)'
                            }} 
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={false} // Evita el bug de altura 0 al cargar la página
                      animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                      exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                      transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                      style={{ minWidth: '100%', width: 'max-content' }}
                    >
                      {phase.tasks.filter(t => !t.parentId).map(task => renderTaskRow(task, phase, 0))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            )})}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editingTask && (
          <motion.div 
            initial={{ x: '100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '450px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-light)', boxShadow: '-10px 0 30px rgba(0,0,0,0.05)', zIndex: 50, display: 'flex', flexDirection: 'column' }}
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
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Inicio</label>
                  <input 
                    type="date" 
                    value={format(new Date(editingTask.task.startDate), 'yyyy-MM-dd')} 
                    onChange={e => handleTaskDateChange('start', e.target.value)}
                    style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Término</label>
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
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 39 }} 
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
                          zIndex: 40,
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
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Responsable</label>
                <select 
                  value={editingTask.task.assignee} 
                  onChange={e => setEditingTask({...editingTask, task: {...editingTask.task, assignee: e.target.value}})}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="Sin Asignar">Sin Asignar</option>
                  {users.map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                  ))}
                </select>
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

      <AnimatePresence>
        {editingPhase && (
          <motion.div 
            initial={{ x: '100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '400px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-light)', boxShadow: '-10px 0 30px rgba(0,0,0,0.05)', zIndex: 60, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
                {editingPhase.phase.wbsId ? <span style={{ color: 'var(--accent-primary)', marginRight: '8px' }}>{editingPhase.phase.wbsId}.</span> : null}
                {editingPhase.isNew ? 'Nueva Fase' : 'Editar Fase'}
              </h2>
              <motion.button whileTap={{ scale: 0.9 }} className="icon-btn" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => setEditingPhase(null)}>
                <X size={20} />
              </motion.button>
            </div>
            
            <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Nombre de la Fase / Etapa</label>
                <input 
                  type="text" 
                  value={editingPhase.phase.name} 
                  onChange={e => setEditingPhase({...editingPhase, phase: {...editingPhase.phase, name: e.target.value}})}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontWeight: 'bold', outline: 'none' }}
                />
              </div>
              
              <div style={{ padding: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}><strong>Nota PMBOK:</strong> Las fechas de inicio y fin de esta fase, así como su progreso, se calculan automáticamente basándose en las tareas que contiene.</p>
              </div>
            </div>

            <div style={{ padding: '24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-primary)' }}>
              {!editingPhase.isNew ? (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn btn-secondary" 
                  style={{ color: 'var(--accent-danger)', borderColor: 'var(--border-light)', cursor: 'pointer' }} 
                  onClick={handleDeletePhase}
                >
                  <Trash2 size={18} /> Eliminar Fase
                </motion.button>
              ) : <div/>}
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn btn-primary" 
                style={{ cursor: 'pointer' }}
                onClick={handleSavePhase}
              >
                <Save size={18} /> Guardar
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .task-row:hover { background: rgba(241, 245, 249, 0.8) !important; }
        .subtask-btn:hover { background: var(--bg-primary) !important; box-shadow: 0 0 0 1px var(--border-light); }
        .file-dropzone:hover { background: rgba(2, 132, 199, 0.08) !important; border-color: var(--accent-secondary) !important; }
        .attachment-link:hover span { text-decoration: underline; color: var(--accent-secondary) !important; }
        .wbs-header-resizer:hover { background: rgba(2, 132, 199, 0.15) !important; }
        .pred-option:hover { background: var(--bg-tertiary) !important; }
        .proj-select-option:hover { background: var(--bg-tertiary) !important; }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}} />
    </div>
  );
}
