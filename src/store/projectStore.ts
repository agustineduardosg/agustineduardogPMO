import { create } from 'zustand';
import { addBusinessDays, differenceInBusinessDays } from '@/utils/dateUtils';


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

export interface Project {
  id: string;
  name: string;
  description?: string;
  manager?: string;
  area?: string;
  status?: 'Planificación' | 'Ejecución' | 'Pausado' | 'Completado';
  hasEquipment?: boolean;
  phases: Phase[];
  startDate: Date;
  endDate: Date;
}

interface ProjectState {
  projects: Project[];
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

export const useProjectStore = create<ProjectState>()((set, get) => {
  const reloadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        const projects = data.map((p: any) => ({
          ...p,
          startDate: new Date(p.startDate),
          endDate: new Date(p.endDate),
          phases: (p.phases || []).map((ph: any) => ({
            ...ph,
            startDate: new Date(ph.startDate),
            endDate: new Date(ph.endDate),
            tasks: (ph.tasks || []).map((t: any) => ({
              ...t,
              startDate: new Date(t.startDate),
              endDate: new Date(t.endDate),
              dependencies: typeof t.dependencies === 'string' 
                ? JSON.parse(t.dependencies) 
                : (Array.isArray(t.dependencies) ? t.dependencies : [])
            }))
          }))
        }));
        set({ projects });
      }
    } catch (reloadErr) {
      console.error('Error reloading projects:', reloadErr);
    }
  };

  const syncProjectChanges = async (oldProject: Project | undefined, newProject: Project | undefined) => {
    if (!newProject || !oldProject) return;

    try {
      let projectPayload: any = null;
      const phasesPayload: any[] = [];
      const tasksPayload: any[] = [];

      // 1. Check if Project fields changed
      if (
        oldProject.name !== newProject.name ||
        oldProject.startDate.getTime() !== newProject.startDate.getTime() ||
        oldProject.endDate.getTime() !== newProject.endDate.getTime()
      ) {
        projectPayload = {
          name: newProject.name,
          startDate: newProject.startDate.toISOString(),
          endDate: newProject.endDate.toISOString()
        };
      }

      // 2. Check each Phase
      newProject.phases.forEach(newPh => {
        const oldPh = oldProject.phases.find(p => p.id === newPh.id);
        if (!oldPh) return; // Skip if new (handled by addPhase)

        if (
          oldPh.name !== newPh.name ||
          oldPh.progress !== newPh.progress ||
          oldPh.startDate.getTime() !== newPh.startDate.getTime() ||
          oldPh.endDate.getTime() !== newPh.endDate.getTime()
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
          if (!oldT) return; // Skip if new (handled by addTask)

          if (
            oldT.name !== newT.name ||
            oldT.startDate.getTime() !== newT.startDate.getTime() ||
            oldT.endDate.getTime() !== newT.endDate.getTime() ||
            oldT.duration !== newT.duration ||
            oldT.progress !== newT.progress ||
            oldT.assignee !== newT.assignee ||
            oldT.status !== newT.status ||
            oldT.priority !== newT.priority ||
            oldT.notes !== newT.notes ||
            oldT.jiraCode !== newT.jiraCode ||
            JSON.stringify(oldT.dependencies) !== JSON.stringify(newT.dependencies)
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
              dependencies: newT.dependencies
            });
          }
        });
      });

      // Si hay cambios detectados, enviarlos en una sola transacción masiva SQLite-safe
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
          const updatedProject: Project = {
            ...data,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            phases: (data.phases || []).map((ph: any) => ({
              ...ph,
              startDate: new Date(ph.startDate),
              endDate: new Date(ph.endDate),
              tasks: (ph.tasks || []).map((t: any) => ({
                ...t,
                startDate: new Date(t.startDate),
                endDate: new Date(t.endDate),
                dependencies: typeof t.dependencies === 'string' 
                  ? JSON.parse(t.dependencies) 
                  : (Array.isArray(t.dependencies) ? t.dependencies : [])
              }))
            }))
          };

          // Hydrate the store state with fully synchronized and recalculated DB records
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
  };


  return {
    projects: [],
    activeProjectId: null,
    isLoading: false,
    error: null,

    fetchProjects: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Failed to fetch projects');
        const data = await response.json();
        const projects = data.map((p: any) => ({
          ...p,
          startDate: new Date(p.startDate),
          endDate: new Date(p.endDate),
          phases: (p.phases || []).map((ph: any) => ({
            ...ph,
            startDate: new Date(ph.startDate),
            endDate: new Date(ph.endDate),
            tasks: (ph.tasks || []).map((t: any) => ({
              ...t,
              startDate: new Date(t.startDate),
              endDate: new Date(t.endDate),
              dependencies: typeof t.dependencies === 'string' 
                ? JSON.parse(t.dependencies) 
                : (Array.isArray(t.dependencies) ? t.dependencies : [])
            }))
          }))
        }));
        
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
      } catch (err: any) {
        console.error(err);
        set({ error: err.message, activeProjectId: oldActiveId });
        await reloadProjects();
      }
    },

    setActiveProject: (id) => set({ activeProjectId: id }),

    updateProject: async (projectId, updates) => {
      const oldProjects = get().projects;
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
      
      // Validar dependencias circulares antes de proceder y prevenir lag
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
              dependencies: t.dependencies ? [...t.dependencies] : [] 
            }))
          }))
        };

        const phase = newProject.phases.find(ph => ph.id === phaseId);
        if (!phase) return p;
        const taskIndex = phase.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return p;

        const targetTask = phase.tasks[taskIndex];
        Object.assign(targetTask, updates);

        // Auto-status and progress sync logic
        if (updates.progress !== undefined && updates.status === undefined) {
          if (targetTask.progress === 100) targetTask.status = 'Completed';
          else if (targetTask.progress > 0 && targetTask.status === 'Not Started') targetTask.status = 'In Progress';
          else if (targetTask.progress === 0 && targetTask.status === 'Completed') targetTask.status = 'Not Started';
        } else if (updates.status !== undefined && updates.progress === undefined) {
          if (targetTask.status === 'Completed') targetTask.progress = 100;
          else if (targetTask.status === 'Not Started') targetTask.progress = 0;
          else if (targetTask.status === 'In Progress' && targetTask.progress === 0) targetTask.progress = 10;
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
        // Create the task in DB
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...task, phaseId })
        });
        if (!response.ok) throw new Error('Failed to create task');

        // Sync other elements (like the phase progress/dates recalculated)
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
    }
  };
});
