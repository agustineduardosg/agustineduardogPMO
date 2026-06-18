import { create } from 'zustand';
import { addBusinessDays, differenceInBusinessDays } from '@/utils/dateUtils';
import { compareWbs } from '@/utils/wbs';


// Algoritmo DFS para detectar dependencias circulares y bucles infinitos en Gantt
const hasCircularDependency = (
  taskId: string,
  newDependencies: string[],
  allTasks: Task[]
): boolean => {
  const depMap = new Map<string, string[]>();
  
  allTasks.forEach(t => {
    if (t.id === taskId) {
      depMap.set(t.id, newDependencies || []);
    } else {
      depMap.set(t.id, t.dependencies || []);
    }
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();

  const detectCycleDFS = (currId: string): boolean => {
    if (recStack.has(currId)) return true;
    if (visited.has(currId)) return false;

    visited.add(currId);
    recStack.add(currId);

    const neighbors = depMap.get(currId) || [];
    for (const neighbor of neighbors) {
      if (detectCycleDFS(neighbor)) {
        return true;
      }
    }

    recStack.delete(currId);
    return false;
  };

  for (const t of allTasks) {
    if (detectCycleDFS(t.id)) {
      return true;
    }
  }

  return false;
};

export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'At Risk';
export type TaskPriority = 'Baja' | 'Media' | 'Alta';

export interface Task {
  id: string;
  wbsId?: string; 
  parentId?: string; // Para subtareas infinitas
  name: string;
  startDate: Date;
  endDate: Date;
  duration: number; 
  progress: number; 
  assignee: string;
  status: TaskStatus;
  priority?: TaskPriority;
  notes?: string;
  jiraCode?: string;
  attachments?: { id: string, name: string, type: string, url: string }[];
  phaseId?: string;
  dependencies?: string[];

  // Nuevos Campos de Planificación y Control Bupa
  realStartDate?: Date | null;
  realEndDate?: Date | null;
  expectedProgress?: number | null;
  delayDays?: number | null;
  semaphore?: string | null;
  estimatedCost?: number | null;
  realCost?: number | null;
  risk?: string | null;
  customFields?: string;
}

export interface Phase {
  id: string;
  wbsId?: string; 
  name: string;
  tasks: Task[];
  startDate: Date;
  endDate: Date;
  progress: number;
}

export interface Risk {
  id: string;
  indexId: string;
  description: string;
  category?: string | null;
  probability: number;
  impact: number;
  score: number;
  level: string;
  mitigationPlan?: string | null;
  responsible?: string | null;
  limitDate?: Date | null;
  status: string;
  associatedActivity?: string | null;
  mitigationCost?: number | null;
  observations?: string | null;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CostItem {
  id: string;
  indexId: string;
  description: string;
  category?: string | null;
  provider?: string | null;
  approvedBudget: number;
  currency: string;
  originalBudget: number;
  exchangeRate: number;
  taxType: string;
  ocEmitted?: string | null;
  ocNumber?: string | null;
  realCost: number;
  originalRealCost: number;
  ocStatus: string;
  observations?: string | null;
  attachments?: { id: string; name: string; type: string; url: string }[];
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  manager?: string;
  sponsor?: string;
  responsible?: string;
  area?: string;
  status?: 'Planificación' | 'Ejecución' | 'Pausado' | 'Completado';
  hasEquipment?: boolean;
  phases: Phase[];
  startDate: Date;
  endDate: Date;
  parentProjectId?: string | null;
  updatedAt?: Date | string | null;

  // Nuevos Metadatos de Proyecto Bupa
  type?: string | null;
  methodology?: string | null;
  pmo?: string | null;
  budget?: number | null;
  jiraId?: string | null;
  cutoffDate?: Date | null;
  goLiveDate?: Date | string | null;
  statusTime?: string | null;
  statusQuality?: string | null;
  statusCost?: string | null;
  nextMilestone?: string | null;
  nextMilestoneDate?: Date | null;
  achievements?: string | null;
  nextSteps?: string | null;
  blockers?: string | null;
  expectedProgress?: number | null;
  delayDays?: number | null;
  consolidatedRisk?: string | null;
  costStatusText?: string | null;

  risks?: Risk[];
  costItems?: CostItem[];
}

export interface ParentProject {
  id: string;
  name: string;
  description?: string | null;
  projects?: Project[];
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectState {
  projects: Project[];
  parentProjects: ParentProject[];
  activeProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  setActiveProject: (id: string) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  updateTask: (projectId: string, phaseId: string, taskId: string, updates: Partial<Task>) => Promise<void>;
  addTask: (projectId: string, phaseId: string, task: Task) => Promise<void>;
  deleteTask: (projectId: string, phaseId: string, taskId: string) => Promise<void>;
  addPhase: (projectId: string, phase: Phase) => Promise<void>;
  updatePhase: (projectId: string, phaseId: string, updates: Partial<Phase>) => Promise<void>;
  deletePhase: (projectId: string, phaseId: string) => Promise<void>;
  fetchParentProjects: () => Promise<void>;
  addParentProject: (name: string, description?: string) => Promise<void>;
  updateParentProject: (id: string, name: string, description?: string) => Promise<void>;
  deleteParentProject: (id: string) => Promise<void>;

  // Acciones de Riesgo
  addRisk: (projectId: string, risk: Omit<Risk, 'id' | 'createdAt' | 'updatedAt' | 'projectId' | 'score' | 'level'>) => Promise<void>;
  updateRisk: (projectId: string, riskId: string, updates: Partial<Risk>) => Promise<void>;
  deleteRisk: (projectId: string, riskId: string) => Promise<void>;

  // Acciones de Costo
  addCostItem: (projectId: string, item: Omit<CostItem, 'id' | 'createdAt' | 'updatedAt' | 'projectId'>) => Promise<void>;
  updateCostItem: (projectId: string, itemId: string, updates: Partial<CostItem>) => Promise<void>;
  deleteCostItem: (projectId: string, itemId: string) => Promise<void>;
}

const recalculatePhase = (phase: Phase): Phase => {
  if (phase.tasks.length === 0) return phase;

  // 1. Build parent-child relationships and map of tasks
  const tasksMap = new Map<string, Task>();
  const childrenMap = new Map<string, Task[]>();

  // Initialize maps and ensure dates are Date objects
  phase.tasks.forEach(t => {
    t.startDate = new Date(t.startDate);
    t.endDate = new Date(t.endDate);
    tasksMap.set(t.id, t);
    if (t.parentId) {
      const list = childrenMap.get(t.parentId) || [];
      list.push(t);
      childrenMap.set(t.parentId, list);
    }
  });

  // Recursive helper to calculate dates and progress bottom-up (MS Project / PMBOK style)
  const processTask = (taskId: string): Task => {
    const task = tasksMap.get(taskId)!;
    const children = childrenMap.get(taskId);

    if (children && children.length > 0) {
      // Summary / Parent task
      // Process all child tasks recursively first
      const processedChildren = children.map(child => processTask(child.id));

      // Parent startDate = min(children.startDate), parent endDate = max(children.endDate)
      let minDate = new Date(processedChildren[0].startDate);
      let maxDate = new Date(processedChildren[0].endDate);
      let totalWeightedProgress = 0;
      let totalDuration = 0;

      processedChildren.forEach(child => {
        if (child.startDate < minDate) minDate = new Date(child.startDate);
        if (child.endDate > maxDate) maxDate = new Date(child.endDate);
        totalDuration += child.duration;
        totalWeightedProgress += child.progress * child.duration;
      });

      task.startDate = minDate;
      task.endDate = maxDate;
      task.duration = differenceInBusinessDays(minDate, maxDate);
      task.progress = totalDuration > 0 ? Math.round(totalWeightedProgress / totalDuration) : 0;
      
      // Auto-status based on computed progress
      if (task.progress === 100) task.status = 'Completed';
      else if (task.progress > 0) task.status = 'In Progress';
      else task.status = 'Not Started';
    }

    return task;
  };

  // Process all tasks in the WBS tree
  phase.tasks.forEach(t => {
    processTask(t.id);
  });

  // Calculate phase-level bounds and progress using ONLY root-level tasks in the phase (no double counting)
  const rootTasks = phase.tasks.filter(t => !t.parentId);
  if (rootTasks.length === 0) return phase;

  let minPhaseDate = new Date(rootTasks[0].startDate);
  let maxPhaseDate = new Date(rootTasks[0].endDate);
  let totalPhaseWeightedProgress = 0;
  let totalPhaseDuration = 0;

  rootTasks.forEach(t => {
    if (t.startDate < minPhaseDate) minPhaseDate = new Date(t.startDate);
    if (t.endDate > maxPhaseDate) maxPhaseDate = new Date(t.endDate);
    totalPhaseDuration += t.duration;
    totalPhaseWeightedProgress += t.progress * t.duration;
  });

  const progress = totalPhaseDuration > 0 ? Math.round(totalPhaseWeightedProgress / totalPhaseDuration) : 0;

  return {
    ...phase,
    startDate: minPhaseDate,
    endDate: maxPhaseDate,
    progress
  };
};

const recalculateProject = (project: Project): Project => {
  if (project.phases.length === 0) return project;

  let minDate = new Date(project.phases[0].startDate);
  let maxDate = new Date(project.phases[0].endDate);

  project.phases.forEach(ph => {
    const phStart = new Date(ph.startDate);
    const phEnd = new Date(ph.endDate);
    if (phStart < minDate) minDate = phStart;
    if (phEnd > maxDate) maxDate = phEnd;
  });

  return {
    ...project,
    startDate: minDate,
    endDate: maxDate
  };
};

export const calculateDelayDays = (endDate: Date | null | undefined, realEndDate: Date | null | undefined): number | null => {
  if (!endDate || !realEndDate) return null;
  const planDate = new Date(endDate);
  const realDate = new Date(realEndDate);
  planDate.setHours(0, 0, 0, 0);
  realDate.setHours(0, 0, 0, 0);

  if (planDate.getTime() === realDate.getTime()) {
    return 0;
  }
  const diff = differenceInBusinessDays(planDate, realDate);
  const days = Math.max(0, diff - 1);
  return realDate > planDate ? days : -days;
};

const isDatesEqual = (d1: any, d2: any): boolean => {
  if (d1 === d2) return true;
  if (!d1 || !d2) return false;
  return new Date(d1).getTime() === new Date(d2).getTime();
};

const mapProjectFromApi = (p: any): Project => ({
  ...p,
  startDate: new Date(p.startDate),
  endDate: new Date(p.endDate),
  cutoffDate: p.cutoffDate ? new Date(p.cutoffDate) : null,
  goLiveDate: p.goLiveDate ? new Date(p.goLiveDate) : null,
  nextMilestoneDate: p.nextMilestoneDate ? new Date(p.nextMilestoneDate) : null,
  risks: (p.risks || []).map((r: any) => ({
    ...r,
    limitDate: r.limitDate ? new Date(r.limitDate) : null,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt)
  })),
  costItems: (p.costItems || []).map((c: any) => ({
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt)
  })).sort((a: any, b: any) => (a.indexId || '').localeCompare(b.indexId || '')),
  phases: (p.phases || [])
    .map((ph: any) => ({
      ...ph,
      startDate: new Date(ph.startDate),
      endDate: new Date(ph.endDate),
      tasks: (ph.tasks || [])
        .map((t: any) => {
          const taskObj = {
            ...t,
            startDate: new Date(t.startDate),
            endDate: new Date(t.endDate),
            realStartDate: t.realStartDate ? new Date(t.realStartDate) : null,
            realEndDate: t.realEndDate ? new Date(t.realEndDate) : null,
            dependencies: typeof t.dependencies === 'string' 
              ? JSON.parse(t.dependencies) 
              : (Array.isArray(t.dependencies) ? t.dependencies : [])
          };
          const refDate = taskObj.realEndDate || (taskObj.progress < 100 && new Date() > taskObj.endDate ? new Date() : null);
          const delay = calculateDelayDays(taskObj.endDate, refDate);
          taskObj.delayDays = delay;
          if (delay === null || delay <= 0) {
            taskObj.semaphore = 'Verde';
          } else if (delay <= 5) {
            taskObj.semaphore = 'Amarillo';
          } else {
            taskObj.semaphore = 'Rojo';
          }
          return taskObj;
        })
        .sort((t1: any, t2: any) => compareWbs(t1.wbsId, t2.wbsId))
    }))
    .sort((ph1: any, ph2: any) => compareWbs(ph1.wbsId, ph2.wbsId))
});

let syncTimeout: NodeJS.Timeout | null = null;
let initialProjectState: Project | undefined = undefined;

export const useProjectStore = create<ProjectState>()((set, get) => {
  const reloadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        const projects = data.map(mapProjectFromApi);
        set({ projects });
      }

      const ppResponse = await fetch('/api/parent-projects');
      if (ppResponse.ok) {
        const ppData = await ppResponse.json();
        const parentProjects = ppData.map((pp: any) => ({
          ...pp,
          createdAt: new Date(pp.createdAt),
          updatedAt: new Date(pp.updatedAt),
          projects: (pp.projects || []).map((p: any) => ({
            ...p,
            startDate: new Date(p.startDate),
            endDate: new Date(p.endDate)
          }))
        }));
        set({ parentProjects });
      }
    } catch (reloadErr) {
      console.error('Error reloading projects:', reloadErr);
    }
  };

  const syncProjectChanges = async (oldProject: Project | undefined, newProject: Project | undefined) => {
    if (!newProject || !oldProject) return;

    if (!initialProjectState) {
      initialProjectState = oldProject;
    }

    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }

    syncTimeout = setTimeout(async () => {
      const baseProject = initialProjectState;
      initialProjectState = undefined;
      syncTimeout = null;

      const latestProject = get().projects.find(p => p.id === newProject.id);
      if (!latestProject || !baseProject) return;

      try {
        const oldProject = baseProject;
        const newProject = latestProject;
        let projectPayload: any = null;
      const phasesPayload: any[] = [];
      const tasksPayload: any[] = [];

      // 1. Check if Project fields changed
      if (
        oldProject.name !== newProject.name ||
        !isDatesEqual(oldProject.startDate, newProject.startDate) ||
        !isDatesEqual(oldProject.endDate, newProject.endDate) ||
        oldProject.type !== newProject.type ||
        oldProject.methodology !== newProject.methodology ||
        oldProject.pmo !== newProject.pmo ||
        oldProject.budget !== newProject.budget ||
        oldProject.jiraId !== newProject.jiraId ||
        !isDatesEqual(oldProject.cutoffDate, newProject.cutoffDate) ||
        oldProject.statusTime !== newProject.statusTime ||
        oldProject.statusQuality !== newProject.statusQuality ||
        oldProject.statusCost !== newProject.statusCost ||
        oldProject.nextMilestone !== newProject.nextMilestone ||
        !isDatesEqual(oldProject.nextMilestoneDate, newProject.nextMilestoneDate) ||
        oldProject.achievements !== newProject.achievements ||
        oldProject.nextSteps !== newProject.nextSteps ||
        oldProject.blockers !== newProject.blockers ||
        oldProject.expectedProgress !== newProject.expectedProgress ||
        oldProject.delayDays !== newProject.delayDays ||
        oldProject.consolidatedRisk !== newProject.consolidatedRisk ||
        oldProject.costStatusText !== newProject.costStatusText
      ) {
        projectPayload = {
          name: newProject.name,
          startDate: newProject.startDate.toISOString(),
          endDate: newProject.endDate.toISOString(),
          type: newProject.type,
          methodology: newProject.methodology,
          pmo: newProject.pmo,
          budget: newProject.budget,
          jiraId: newProject.jiraId,
          cutoffDate: newProject.cutoffDate ? newProject.cutoffDate.toISOString() : null,
          statusTime: newProject.statusTime,
          statusQuality: newProject.statusQuality,
          statusCost: newProject.statusCost,
          nextMilestone: newProject.nextMilestone,
          nextMilestoneDate: newProject.nextMilestoneDate ? newProject.nextMilestoneDate.toISOString() : null,
          achievements: newProject.achievements,
          nextSteps: newProject.nextSteps,
          blockers: newProject.blockers,
          expectedProgress: newProject.expectedProgress,
          delayDays: newProject.delayDays,
          consolidatedRisk: newProject.consolidatedRisk,
          costStatusText: newProject.costStatusText
        };
      }

      // 2. Check each Phase
      newProject.phases.forEach(newPh => {
        const oldPh = oldProject.phases.find(p => p.id === newPh.id);
        if (!oldPh) return;

        if (
          oldPh.name !== newPh.name ||
          oldPh.progress !== newPh.progress ||
          !isDatesEqual(oldPh.startDate, newPh.startDate) ||
          !isDatesEqual(oldPh.endDate, newPh.endDate)
        ) {
          phasesPayload.push({
            id: newPh.id,
            name: newPh.name,
            progress: newPh.progress,
            startDate: newPh.startDate.toISOString(),
            endDate: newPh.endDate.toISOString()
          });
        }

        // 3. Check each Task inside the Phase
        newPh.tasks.forEach(newT => {
          const oldT = oldPh.tasks.find(t => t.id === newT.id);
          if (!oldT) return;

          if (
            oldT.name !== newT.name ||
            !isDatesEqual(oldT.startDate, newT.startDate) ||
            !isDatesEqual(oldT.endDate, newT.endDate) ||
            oldT.duration !== newT.duration ||
            oldT.progress !== newT.progress ||
            oldT.assignee !== newT.assignee ||
            oldT.status !== newT.status ||
            oldT.priority !== newT.priority ||
            oldT.notes !== newT.notes ||
            oldT.jiraCode !== newT.jiraCode ||
            JSON.stringify(oldT.dependencies) !== JSON.stringify(newT.dependencies) ||
            !isDatesEqual(oldT.realStartDate, newT.realStartDate) ||
            !isDatesEqual(oldT.realEndDate, newT.realEndDate) ||
            oldT.expectedProgress !== newT.expectedProgress ||
            oldT.delayDays !== newT.delayDays ||
            oldT.semaphore !== newT.semaphore ||
            oldT.estimatedCost !== newT.estimatedCost ||
            oldT.realCost !== newT.realCost ||
            oldT.risk !== newT.risk ||
            oldT.customFields !== newT.customFields
          ) {
            tasksPayload.push({
              id: newT.id,
              name: newT.name,
              startDate: newT.startDate.toISOString(),
              endDate: newT.endDate.toISOString(),
              duration: newT.duration,
              progress: newT.progress,
              assignee: newT.assignee,
              status: newT.status,
              priority: newT.priority,
              notes: newT.notes,
              jiraCode: newT.jiraCode,
              parentId: newT.parentId,
              dependencies: newT.dependencies,
              realStartDate: newT.realStartDate ? newT.realStartDate.toISOString() : null,
              realEndDate: newT.realEndDate ? newT.realEndDate.toISOString() : null,
              expectedProgress: newT.expectedProgress,
              delayDays: newT.delayDays,
              semaphore: newT.semaphore,
              estimatedCost: newT.estimatedCost,
              realCost: newT.realCost,
              risk: newT.risk,
              customFields: newT.customFields
            });
          }
        });
      });

      if (projectPayload || phasesPayload.length > 0 || tasksPayload.length > 0) {
        set({ isLoading: true });
        const response = await fetch(`/api/projects/${newProject.id}/bulk-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: projectPayload,
            phases: phasesPayload,
            tasks: tasksPayload
          })
        });

        set({ isLoading: false });

        if (!response.ok) {
          throw new Error('Database bulk sync transaction failed');
        }

        const data = await response.json();
        if (data && data.id) {
          const updatedProject = mapProjectFromApi(data);
          set((state) => ({
            projects: state.projects.map(p => p.id === updatedProject.id ? updatedProject : p)
          }));
        }
      }
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Error syncing changes' });
      console.error('Error syncing project changes to DB in bulk:', err);
      throw err;
    }
    }, 1000);
  };

  return {
    projects: [],
    parentProjects: [],
    activeProjectId: null,
    isLoading: false,
    error: null,

    fetchProjects: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Failed to fetch projects');
        const data = await response.json();
        const projects = data.map(mapProjectFromApi);
        
        set((state) => {
          const activeId = state.activeProjectId && projects.some((p: any) => p.id === state.activeProjectId)
            ? state.activeProjectId
            : (projects.length > 0 ? projects[0].id : null);
          return { projects, isLoading: false, activeProjectId: activeId };
        });
      } catch (err: any) {
        console.error(err);
        set({ error: err.message, isLoading: false });
      }
    },

    addProject: async (project) => {
      const oldActiveId = get().activeProjectId;
      set((state) => ({ 
        projects: [...state.projects, project], 
        activeProjectId: project.id 
      }));
      
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project)
        });
        if (!response.ok) throw new Error('Failed to create project');
        
        const created = await response.json();
        set((state) => ({
          projects: state.projects.map(p => p.id === project.id ? mapProjectFromApi(created) : p)
        }));
      } catch (err: any) {
        console.error(err);
        set({ error: err.message, activeProjectId: oldActiveId });
        await reloadProjects();
      }
    },

    setActiveProject: (id) => set({ activeProjectId: id }),

    updateProject: async (projectId, updates) => {
      set((state) => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, ...updates } : p)
      }));

      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Failed to update project');
        
        const updated = await response.json();
        set((state) => ({
          projects: state.projects.map(p => p.id === projectId ? mapProjectFromApi(updated) : p)
        }));
      } catch (err: any) {
        console.error(err);
        set({ error: err.message });
        await reloadProjects();
      }
    },

    deleteProject: async (projectId) => {
      const oldProjects = get().projects;
      const oldActiveId = get().activeProjectId;
      
      set((state) => ({
        projects: state.projects.filter(p => p.id !== projectId),
        activeProjectId: state.activeProjectId === projectId 
          ? (state.projects.find(p => p.id !== projectId)?.id || null) 
          : state.activeProjectId
      }));

      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete project');
      } catch (err: any) {
        console.error(err);
        set({ error: err.message });
        await reloadProjects();
      }
    },

    updateTask: async (projectId, phaseId, taskId, updates) => {
      const oldProjects = get().projects;
      const oldProject = oldProjects.find(p => p.id === projectId);
      
      if (updates.dependencies && oldProject) {
        const allTasks = oldProject.phases.flatMap(ph => ph.tasks) || [];
        if (hasCircularDependency(taskId, updates.dependencies, allTasks)) {
          const errMsg = "Error: Se ha detectado una dependencia circular (bucle infinito). Se canceló la actualización.";
          set({ error: errMsg });
          if (typeof window !== "undefined") {
            alert(errMsg);
          }
          return;
        }
      }

      let newProject: Project | undefined;
      const newProjects = oldProjects.map(p => {
        if (p.id !== projectId) return p;

        newProject = {
          ...p,
          phases: p.phases.map(ph => ({
            ...ph,
            tasks: ph.tasks.map(t => ({ 
              ...t, 
              startDate: new Date(t.startDate),
              endDate: new Date(t.endDate),
              realStartDate: t.realStartDate ? new Date(t.realStartDate) : null,
              realEndDate: t.realEndDate ? new Date(t.realEndDate) : null,
              dependencies: t.dependencies ? [...t.dependencies] : [] 
            }))
          }))
        };

        const phase = newProject.phases.find(ph => ph.id === phaseId);
        if (!phase) return p;
        const taskIndex = phase.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return p;

        const targetTask = phase.tasks[taskIndex];
        
        // --- VALIDATIONS ---
        const mergedTask = { ...targetTask, ...updates };
        const nextStart = mergedTask.startDate ? new Date(mergedTask.startDate) : null;
        const nextEnd = mergedTask.endDate ? new Date(mergedTask.endDate) : null;
        const nextRealStart = mergedTask.realStartDate ? new Date(mergedTask.realStartDate) : null;
        const nextRealEnd = mergedTask.realEndDate ? new Date(mergedTask.realEndDate) : null;

        if (nextStart && nextEnd && nextEnd < nextStart) {
          const errMsg = "Error: La fecha de término planificada no puede ser anterior al inicio planificado.";
          set({ error: errMsg });
          if (typeof window !== "undefined") alert(errMsg);
          throw new Error(errMsg);
        }
        if (nextRealStart && nextStart && nextRealStart < nextStart) {
          const errMsg = "Error: La fecha de inicio real no puede ser anterior al inicio planificado.";
          set({ error: errMsg });
          if (typeof window !== "undefined") alert(errMsg);
          throw new Error(errMsg);
        }
        if (nextRealStart && nextRealEnd && nextRealEnd < nextRealStart) {
          const errMsg = "Error: La fecha de término real no puede ser anterior al inicio real.";
          set({ error: errMsg });
          if (typeof window !== "undefined") alert(errMsg);
          throw new Error(errMsg);
        }

        Object.assign(targetTask, updates);

        if (targetTask.startDate) targetTask.startDate = new Date(targetTask.startDate);
        if (targetTask.endDate) targetTask.endDate = new Date(targetTask.endDate);
        if (targetTask.realStartDate) targetTask.realStartDate = new Date(targetTask.realStartDate);
        if (targetTask.realEndDate) targetTask.realEndDate = new Date(targetTask.realEndDate);

        // Strict auto-status and progress sync logic
        if (updates.progress !== undefined) {
          if (updates.progress === 100) {
            targetTask.status = 'Completed';
          } else if (updates.progress > 0 && updates.progress < 100) {
            if (targetTask.status === 'Completed' || targetTask.status === 'Not Started') {
              targetTask.status = 'In Progress';
            }
          } else if (updates.progress === 0) {
            targetTask.status = 'Not Started';
          }
        }

        if (updates.status !== undefined) {
          if (updates.status === 'Completed') {
            targetTask.progress = 100;
          } else if (updates.status === 'Not Started') {
            targetTask.progress = 0;
          } else if (updates.status === 'In Progress' && (targetTask.progress === 0 || targetTask.progress === 100)) {
            targetTask.progress = 10;
          } else if (updates.status === 'At Risk' && (targetTask.progress === 0 || targetTask.progress === 100)) {
            targetTask.progress = 10;
          }
        }

        // Calculate deviation and semaphore
        const refDate = targetTask.realEndDate || (targetTask.progress < 100 && new Date() > targetTask.endDate ? new Date() : null);
        const delay = calculateDelayDays(targetTask.endDate, refDate);
        targetTask.delayDays = delay;
        if (delay === null || delay <= 0) {
          targetTask.semaphore = 'Verde';
        } else if (delay <= 5) {
          targetTask.semaphore = 'Amarillo';
        } else {
          targetTask.semaphore = 'Rojo';
        }

        if (updates.startDate || updates.endDate || updates.duration !== undefined) {
          const queue = [targetTask];
          let iterations = 0;
          
          while (queue.length > 0 && iterations < 1000) {
            iterations++;
            const current = queue.shift()!;
            
            newProject.phases.forEach(ph => {
              ph.tasks.forEach(t => {
                if (t.dependencies?.includes(current.id)) {
                  const newStart = addBusinessDays(current.endDate, 1);
                  if (t.startDate.getTime() !== newStart.getTime()) {
                    t.startDate = newStart;
                    t.endDate = addBusinessDays(t.startDate, t.duration);
                    queue.push(t);
                  }
                }
              });
            });
          }
        }

        newProject.phases = newProject.phases.map(ph => recalculatePhase(ph));
        newProject = recalculateProject(newProject);
        return newProject;
      });

      set({ projects: newProjects });

      try {
        await syncProjectChanges(oldProject, newProject);
      } catch (err: any) {
        console.error(err);
        set({ error: err.message });
        await reloadProjects();
      }
    },

    addTask: async (projectId, phaseId, task) => {
      // --- VALIDATIONS ---
      const nextStart = task.startDate ? new Date(task.startDate) : null;
      const nextEnd = task.endDate ? new Date(task.endDate) : null;
      const nextRealStart = task.realStartDate ? new Date(task.realStartDate) : null;
      const nextRealEnd = task.realEndDate ? new Date(task.realEndDate) : null;

      if (nextStart && nextEnd && nextEnd < nextStart) {
        const errMsg = "Error: La fecha de término planificada no puede ser anterior al inicio planificado.";
        set({ error: errMsg });
        if (typeof window !== "undefined") alert(errMsg);
        throw new Error(errMsg);
      }
      if (nextRealStart && nextStart && nextRealStart < nextStart) {
        const errMsg = "Error: La fecha de inicio real no puede ser anterior al inicio planificado.";
        set({ error: errMsg });
        if (typeof window !== "undefined") alert(errMsg);
        throw new Error(errMsg);
      }
      if (nextRealStart && nextRealEnd && nextRealEnd < nextRealStart) {
        const errMsg = "Error: La fecha de término real no puede ser anterior al inicio real.";
        set({ error: errMsg });
        if (typeof window !== "undefined") alert(errMsg);
        throw new Error(errMsg);
      }

      const oldProjects = get().projects;
      const oldProject = oldProjects.find(p => p.id === projectId);

      let newProject: Project | undefined;
      const newProjects = oldProjects.map(p => {
        if (p.id !== projectId) return p;
        newProject = {
          ...p,
          phases: p.phases.map(ph => {
            if (ph.id !== phaseId) return ph;
            return recalculatePhase({ ...ph, tasks: [...ph.tasks, task] });
          })
        };
        newProject = recalculateProject(newProject);
        return newProject;
      });

      set({ projects: newProjects });

      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...task, phaseId })
        });
        if (!response.ok) throw new Error('Failed to create task');

        await syncProjectChanges(oldProject, newProject);
      } catch (err: any) {
        console.error(err);
        set({ error: err.message });
        await reloadProjects();
      }
    },

    deleteTask: async (projectId, phaseId, taskId) => {
      const oldProjects = get().projects;
      const oldProject = oldProjects.find(p => p.id === projectId);

      let newProject: Project | undefined;
      const newProjects = oldProjects.map(p => {
        if (p.id !== projectId) return p;
        newProject = {
          ...p,
          phases: p.phases.map(ph => {
            if (ph.id !== phaseId) return ph;
            return recalculatePhase({ ...ph, tasks: ph.tasks.filter(t => t.id !== taskId) });
          })
        };
        newProject = recalculateProject(newProject);
        return newProject;
      });

      set({ projects: newProjects });

      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete task');

        await syncProjectChanges(oldProject, newProject);
      } catch (err: any) {
        console.error(err);
        set({ error: err.message });
        await reloadProjects();
      }
    },

    addPhase: async (projectId, phase) => {
      const oldProjects = get().projects;
      const oldProject = oldProjects.find(p => p.id === projectId);

      let newProject: Project | undefined;
      const newProjects = oldProjects.map(p => {
        if (p.id !== projectId) return p;
        newProject = {
          ...p,
          phases: [...p.phases, recalculatePhase(phase)]
        };
        newProject = recalculateProject(newProject);
        return newProject;
      });

      set({ projects: newProjects });

      try {
        const response = await fetch('/api/phases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...phase, projectId })
        });
        if (!response.ok) throw new Error('Failed to create phase');

        await syncProjectChanges(oldProject, newProject);
      } catch (err: any) {
        console.error(err);
        set({ error: err.message });
        await reloadProjects();
      }
    },

    updatePhase: async (projectId, phaseId, updates) => {
      const oldProjects = get().projects;
      const oldProject = oldProjects.find(p => p.id === projectId);

      let newProject: Project | undefined;
      const newProjects = oldProjects.map(p => {
        if (p.id !== projectId) return p;
        newProject = {
          ...p,
          phases: p.phases.map(ph => ph.id === phaseId ? { ...ph, ...updates } : ph)
        };
        newProject = recalculateProject(newProject);
        return newProject;
      });

      set({ projects: newProjects });

      try {
        const response = await fetch(`/api/phases/${phaseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Failed to update phase');

        await syncProjectChanges(oldProject, newProject);
      } catch (err: any) {
        console.error(err);
        set({ error: err.message });
        await reloadProjects();
      }
    },

    deletePhase: async (projectId, phaseId) => {
      const oldProjects = get().projects;
      const oldProject = oldProjects.find(p => p.id === projectId);

      let newProject: Project | undefined;
      const newProjects = oldProjects.map(p => {
        if (p.id !== projectId) return p;
        newProject = {
          ...p,
          phases: p.phases.filter(ph => ph.id !== phaseId)
        };
        newProject = recalculateProject(newProject);
        return newProject;
      });

      set({ projects: newProjects });

      try {
        const response = await fetch(`/api/phases/${phaseId}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete phase');

        await syncProjectChanges(oldProject, newProject);
      } catch (err: any) {
        console.error(err);
        set({ error: err.message });
        await reloadProjects();
      }
    },

    fetchParentProjects: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch('/api/parent-projects');
        if (!response.ok) throw new Error('Failed to fetch parent projects');
        const data = await response.json();
        const parentProjects = data.map((pp: any) => ({
          ...pp,
          createdAt: new Date(pp.createdAt),
          updatedAt: new Date(pp.updatedAt),
          projects: (pp.projects || []).map((p: any) => ({
            ...p,
            startDate: new Date(p.startDate),
            endDate: new Date(p.endDate)
          }))
        }));
        set({ parentProjects, isLoading: false });
      } catch (err: any) {
        console.error(err);
        set({ error: err.message, isLoading: false });
      }
    },

    addParentProject: async (name, description) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch('/api/parent-projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description })
        });
        if (!response.ok) throw new Error('Failed to create parent project');
        const getStore = get();
        await getStore.fetchParentProjects();
      } catch (err: any) {
        console.error(err);
        set({ error: err.message, isLoading: false });
      }
    },

    updateParentProject: async (id, name, description) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/parent-projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description })
        });
        if (!response.ok) throw new Error('Failed to update parent project');
        const getStore = get();
        await getStore.fetchParentProjects();
      } catch (err: any) {
        console.error(err);
        set({ error: err.message, isLoading: false });
      }
    },

    deleteParentProject: async (id) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/parent-projects/${id}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete parent project');
        const getStore = get();
        await getStore.fetchParentProjects();
        await getStore.fetchProjects(); // Recargar proyectos por si se limpió la relación
      } catch (err: any) {
        console.error(err);
        set({ error: err.message, isLoading: false });
      }
    },

    addRisk: async (projectId, risk) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/projects/${projectId}/risks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(risk)
        });
        if (!response.ok) throw new Error('Failed to add risk');
        const newRisk = await response.json();
        
        const parsedRisk: Risk = {
          ...newRisk,
          limitDate: newRisk.limitDate ? new Date(newRisk.limitDate) : null,
          createdAt: new Date(newRisk.createdAt),
          updatedAt: new Date(newRisk.updatedAt)
        };

        set((state) => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              risks: [...(p.risks || []), parsedRisk]
            };
          }),
          isLoading: false
        }));
      } catch (err: any) {
        console.error(err);
        set({ error: err.message, isLoading: false });
      }
    },

    updateRisk: async (projectId, riskId, updates) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/projects/${projectId}/risks`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: riskId, ...updates })
        });
        if (!response.ok) throw new Error('Failed to update risk');
        const updatedRisk = await response.json();
        
        const parsedRisk: Risk = {
          ...updatedRisk,
          limitDate: updatedRisk.limitDate ? new Date(updatedRisk.limitDate) : null,
          createdAt: new Date(updatedRisk.createdAt),
          updatedAt: new Date(updatedRisk.updatedAt)
        };

        set((state) => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              risks: (p.risks || []).map(r => r.id === riskId ? parsedRisk : r)
            };
          }),
          isLoading: false
        }));
      } catch (err: any) {
        console.error(err);
        set({ error: err.message, isLoading: false });
      }
    },

    deleteRisk: async (projectId, riskId) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/projects/${projectId}/risks?id=${riskId}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete risk');

        set((state) => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              risks: (p.risks || []).filter(r => r.id !== riskId)
            };
          }),
          isLoading: false
        }));
      } catch (err: any) {
        console.error(err);
        set({ error: err.message, isLoading: false });
      }
    },

    addCostItem: async (projectId, item) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/projects/${projectId}/costs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        if (!response.ok) throw new Error('Failed to add cost item');
        const newCost = await response.json();
        
        const parsedCost: CostItem = {
          ...newCost,
          createdAt: new Date(newCost.createdAt),
          updatedAt: new Date(newCost.updatedAt)
        };

        set((state) => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              costItems: [...(p.costItems || []), parsedCost].sort((a, b) => (a.indexId || '').localeCompare(b.indexId || ''))
            };
          }),
          isLoading: false
        }));
      } catch (err: any) {
        console.error(err);
        set({ error: err.message, isLoading: false });
      }
    },

    updateCostItem: async (projectId, itemId, updates) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/projects/${projectId}/costs`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: itemId, ...updates })
        });
        if (!response.ok) throw new Error('Failed to update cost item');
        const updatedCost = await response.json();
        
        const parsedCost: CostItem = {
          ...updatedCost,
          createdAt: new Date(updatedCost.createdAt),
          updatedAt: new Date(updatedCost.updatedAt)
        };

        set((state) => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              costItems: (p.costItems || []).map(c => c.id === itemId ? parsedCost : c).sort((a, b) => (a.indexId || '').localeCompare(b.indexId || ''))
            };
          }),
          isLoading: false
        }));
      } catch (err: any) {
        console.error(err);
        set({ error: err.message, isLoading: false });
      }
    },

    deleteCostItem: async (projectId, itemId) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/projects/${projectId}/costs?id=${itemId}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete cost item');

        set((state) => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              costItems: (p.costItems || []).filter(c => c.id !== itemId)
            };
          }),
          isLoading: false
        }));
      } catch (err: any) {
        console.error(err);
        set({ error: err.message, isLoading: false });
      }
    }
  };
});
