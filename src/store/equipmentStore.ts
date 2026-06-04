import { create } from 'zustand';

export type EquipmentPhaseStatus = 'No iniciado' | 'En progreso' | 'Completado' | 'Descartado' | 'Desestimado' | (string & {});

export interface Recinto {
  id: string;
  name: string; // e.g. "BUPA CLA"
  code: string; // e.g. "CLA-4057"
  isActive: boolean;
}
export interface ClinicalEquipment {
  id: string;
  recintoId: string;
  name: string; // e.g. "Advia 2120_02"
  section: string; // e.g. "Hematología", "Química"
  levantamiento: EquipmentPhaseStatus;
  parametrizacion: EquipmentPhaseStatus;
  pruebas: EquipmentPhaseStatus;
  capacitacion: EquipmentPhaseStatus;
  validacion: EquipmentPhaseStatus;
  golive: EquipmentPhaseStatus;
  responsable: string;
  compromisoDate?: string;
  observaciones: string;
  pendienteDe: string;
  projectId?: string | null; // Asociación opcional a Proyecto
  customFields?: string;
  deletedAt?: string | null;
  scopeStatus: string;
  releasePhaseId?: string | null;
}

export interface Analyte {
  id: string;
  instrumentName: string;
  transmissionCode: string;
  testCode: string;
  name: string;
  description?: string;
  section: string;
  state: string;
  equipmentId?: string | null;
  recintoId?: string | null;
  customFields?: string;
  scopeStatus: string;
  releasePhaseId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReleasePhase {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScopeAuditLog {
  id: string;
  itemId: string;
  itemType: string;
  itemName: string;
  previousScope: string;
  newScope: string;
  reasonCode: string;
  justification: string;
  userEmail: string;
  createdAt: string;
}

interface EquipmentState {
  recintos: Recinto[];
  equipments: ClinicalEquipment[];
  analytes: Analyte[];
  releasePhases: ReleasePhase[];
  scopeLogs: ScopeAuditLog[];
  isLoading: boolean;
  error: string | null;

  // Carga
  fetchEquipmentData: () => Promise<void>;
  fetchAnalytes: () => Promise<void>;
  fetchReleasePhases: () => Promise<void>;
  fetchScopeLogs: (itemId?: string) => Promise<ScopeAuditLog[]>;
  
  // Acciones Recintos
  addRecinto: (recinto: Recinto) => Promise<void>;
  updateRecinto: (id: string, updates: Partial<Recinto>) => Promise<void>;
  deleteRecinto: (id: string) => Promise<void>;
  
  // Acciones Equipos
  addEquipment: (equipment: ClinicalEquipment) => Promise<void>;
  updateEquipment: (id: string, updates: Partial<ClinicalEquipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  restoreEquipment: (id: string) => Promise<void>;
  hardDeleteEquipment: (id: string) => Promise<void>;

  // Acciones Analitos
  addAnalyte: (analyte: Omit<Analyte, 'id'>) => Promise<void>;
  updateAnalyte: (id: string, updates: Partial<Analyte>) => Promise<void>;
  deleteAnalyte: (id: string) => Promise<void>;
  bulkImportAnalytes: (analytes: Omit<Analyte, 'id'>[]) => Promise<{ success: boolean; details: any }>;
  assignRecintoToInstrument: (instrumentName: string, recintoId: string, sourceRecintoId?: string) => Promise<{ success: boolean; message: string }>;

  // Acciones de Alcance
  createReleasePhase: (name: string, description?: string) => Promise<{ success: boolean; error?: string }>;
  changeScope: (params: { itemId: string; itemType: 'EQUIPMENT' | 'ANALYTE' | 'RECINTO'; newScope: string | null; newScopeStatus: string; reasonCode: string; justification: string; userEmail: string }) => Promise<{ success: boolean; error?: string }>;
}

export const useEquipmentStore = create<EquipmentState>()((set, get) => ({
  recintos: [],
  equipments: [],
  analytes: [],
  releasePhases: [],
  scopeLogs: [],
  isLoading: false,
  error: null,

  fetchEquipmentData: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/recintos');
      if (!response.ok) throw new Error('Failed to fetch recintos');
      const data = await response.json();
      
      // Mapear recintos y extraer equipments de forma anidada
      const recintos = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        isActive: r.isActive
      }));
      
      const equipments = data.flatMap((r: any) => r.equipments || []);
      
      set({ recintos, equipments, isLoading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },
  
  // Acciones Recintos
  addRecinto: async (recinto) => {
    set((state) => ({ recintos: [...state.recintos, recinto] }));
    try {
      const response = await fetch('/api/recintos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recinto)
      });
      if (!response.ok) throw new Error('Failed to create recinto');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Recargar del servidor en caso de error
      const response = await fetch('/api/recintos');
      if (response.ok) {
        const data = await response.json();
        set({
          recintos: data.map((r: any) => ({ id: r.id, name: r.name, code: r.code, isActive: r.isActive })),
          equipments: data.flatMap((r: any) => r.equipments || [])
        });
      }
    }
  },

  updateRecinto: async (id, updates) => {
    set((state) => ({
      recintos: state.recintos.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
    try {
      const response = await fetch(`/api/recintos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update recinto');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Recargar
      const response = await fetch('/api/recintos');
      if (response.ok) {
        const data = await response.json();
        set({
          recintos: data.map((r: any) => ({ id: r.id, name: r.name, code: r.code, isActive: r.isActive })),
          equipments: data.flatMap((r: any) => r.equipments || [])
        });
      }
    }
  },

  deleteRecinto: async (id) => {
    set((state) => ({
      recintos: state.recintos.filter(r => r.id !== id),
      equipments: state.equipments.filter(e => e.recintoId !== id)
    }));
    try {
      const response = await fetch(`/api/recintos/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete recinto');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Recargar
      const response = await fetch('/api/recintos');
      if (response.ok) {
        const data = await response.json();
        set({
          recintos: data.map((r: any) => ({ id: r.id, name: r.name, code: r.code, isActive: r.isActive })),
          equipments: data.flatMap((r: any) => r.equipments || [])
        });
      }
    }
  },
  
  // Acciones Equipos
  addEquipment: async (equipment) => {
    set((state) => ({ equipments: [...state.equipments, equipment] }));
    try {
      const response = await fetch('/api/equipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(equipment)
      });
      if (!response.ok) throw new Error('Failed to create equipment');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Recargar
      const response = await fetch('/api/recintos');
      if (response.ok) {
        const data = await response.json();
        set({
          recintos: data.map((r: any) => ({ id: r.id, name: r.name, code: r.code, isActive: r.isActive })),
          equipments: data.flatMap((r: any) => r.equipments || [])
        });
      }
    }
  },

  updateEquipment: async (id, updates) => {
    set((state) => ({
      equipments: state.equipments.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
    try {
      const response = await fetch(`/api/equipments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update equipment');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Recargar
      const response = await fetch('/api/recintos');
      if (response.ok) {
        const data = await response.json();
        set({
          recintos: data.map((r: any) => ({ id: r.id, name: r.name, code: r.code, isActive: r.isActive })),
          equipments: data.flatMap((r: any) => r.equipments || [])
        });
      }
    }
  },

  deleteEquipment: async (id) => {
    set((state) => ({
      equipments: state.equipments.filter(e => e.id !== id)
    }));
    try {
      const response = await fetch(`/api/equipments/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete equipment');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Recargar
      const response = await fetch('/api/recintos');
      if (response.ok) {
        const data = await response.json();
        set({
          recintos: data.map((r: any) => ({ id: r.id, name: r.name, code: r.code, isActive: r.isActive })),
          equipments: data.flatMap((r: any) => r.equipments || [])
        });
      }
    }
  },

  restoreEquipment: async (id) => {
    try {
      const response = await fetch(`/api/equipments/${id}/restore`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to restore equipment');
      
      // Recargar todo el estado para que vuelva al listado de recintos activos
      const recResp = await fetch('/api/recintos');
      if (recResp.ok) {
        const data = await recResp.json();
        set({
          recintos: data.map((r: any) => ({ id: r.id, name: r.name, code: r.code, isActive: r.isActive })),
          equipments: data.flatMap((r: any) => r.equipments || [])
        });
      }
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
    }
  },

  hardDeleteEquipment: async (id) => {
    try {
      const response = await fetch(`/api/equipments/${id}?hard=true`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to hard delete equipment');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
    }
  },

  fetchAnalytes: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/analytes');
      if (!response.ok) throw new Error('Failed to fetch analytes');
      const data = await response.json();
      set({ analytes: data, isLoading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  addAnalyte: async (analyte) => {
    try {
      const response = await fetch('/api/analytes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyte)
      });
      if (!response.ok) throw new Error('Failed to create analyte');
      
      // Recargar analitos
      const resp = await fetch('/api/analytes');
      if (resp.ok) {
        const data = await resp.json();
        set({ analytes: data });
      }
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
    }
  },

  updateAnalyte: async (id, updates) => {
    // Sincronización optimista inmediata en la UI
    set((state) => ({
      analytes: state.analytes.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
    try {
      const response = await fetch(`/api/analytes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update analyte');
    } catch (err: any) {
      console.error('❌ Error al actualizar analito de forma persistente, realizando rollback:', err);
      set({ error: err.message });
      // Rollback al estado del servidor en caso de falla
      const response = await fetch('/api/analytes');
      if (response.ok) {
        const data = await response.json();
        set({ analytes: data });
      }
    }
  },

  deleteAnalyte: async (id) => {
    // Sincronización optimista inmediata en la UI
    set((state) => ({
      analytes: state.analytes.filter(a => a.id !== id)
    }));
    try {
      const response = await fetch(`/api/analytes/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete analyte');
    } catch (err: any) {
      console.error('❌ Error al eliminar analito de forma persistente, realizando rollback:', err);
      set({ error: err.message });
      // Rollback
      const response = await fetch('/api/analytes');
      if (response.ok) {
        const data = await response.json();
        set({ analytes: data });
      }
    }
  },

  bulkImportAnalytes: async (analytesList) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/analytes/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analytesList)
      });
      if (!response.ok) throw new Error('Failed to bulk import analytes');
      const result = await response.json();
      
      // Sincronizar recintos y equipos (por si se auto-crearon equipos nuevos!)
      const eqResp = await fetch('/api/recintos');
      if (eqResp.ok) {
        const data = await eqResp.json();
        set({
          recintos: data.map((r: any) => ({ id: r.id, name: r.name, code: r.code, isActive: r.isActive })),
          equipments: data.flatMap((r: any) => r.equipments || [])
        });
      }
      
      // Sincronizar analitos
      const anResp = await fetch('/api/analytes');
      if (anResp.ok) {
        const data = await anResp.json();
        set({ analytes: data });
      }
      
      set({ isLoading: false });
      return { success: true, details: result.details };
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
      return { success: false, details: err.message };
    }
  },

  assignRecintoToInstrument: async (instrumentName, recintoId, sourceRecintoId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/analytes/bulk-assign-recinto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrumentName, recintoId, sourceRecintoId })
      });
      if (!response.ok) throw new Error('Error al asignar sede en masa');
      const result = await response.json();

      // Sincronizar recintos y equipos
      const eqResp = await fetch('/api/recintos');
      if (eqResp.ok) {
        const data = await eqResp.json();
        set({
          recintos: data.map((r: any) => ({ id: r.id, name: r.name, code: r.code, isActive: r.isActive })),
          equipments: data.flatMap((r: any) => r.equipments || [])
        });
      }

      // Sincronizar analitos
      const anResp = await fetch('/api/analytes');
      if (anResp.ok) {
        const data = await anResp.json();
        set({ analytes: data });
      }

      set({ isLoading: false });
      return { success: true, message: result.message };
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
      return { success: false, message: err.message };
    }
  },

  fetchReleasePhases: async () => {
    try {
      const response = await fetch('/api/release-phases');
      if (!response.ok) throw new Error('Failed to fetch release phases');
      const data = await response.json();
      set({ releasePhases: data });
    } catch (err: any) {
      console.error('Error in fetchReleasePhases:', err);
      set({ error: err.message });
    }
  },

  createReleasePhase: async (name, description) => {
    try {
      const response = await fetch('/api/release-phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create release phase');
      }
      
      // Actualizar listado local
      await get().fetchReleasePhases();
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  },

  changeScope: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/scope/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute scope change');
      }

      // Sincronizar recintos y equipos (por si cambió en cascada)
      const eqResp = await fetch('/api/recintos');
      if (eqResp.ok) {
        const eqData = await eqResp.json();
        set({
          recintos: eqData.map((r: any) => ({ id: r.id, name: r.name, code: r.code, isActive: r.isActive })),
          equipments: eqData.flatMap((r: any) => r.equipments || [])
        });
      }

      // Sincronizar analitos
      const anResp = await fetch('/api/analytes');
      if (anResp.ok) {
        const anData = await anResp.json();
        set({ analytes: anData });
      }

      set({ isLoading: false });
      return { success: true };
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  fetchScopeLogs: async (itemId) => {
    try {
      const url = itemId ? `/api/scope/logs?itemId=${encodeURIComponent(itemId)}` : '/api/scope/logs';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch scope logs');
      const data = await response.json();
      if (!itemId) {
        set({ scopeLogs: data });
      }
      return data;
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      return [];
    }
  }
}));
