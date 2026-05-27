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
}

interface EquipmentState {
  recintos: Recinto[];
  equipments: ClinicalEquipment[];
  isLoading: boolean;
  error: string | null;

  // Carga
  fetchEquipmentData: () => Promise<void>;
  
  // Acciones Recintos
  addRecinto: (recinto: Recinto) => Promise<void>;
  updateRecinto: (id: string, updates: Partial<Recinto>) => Promise<void>;
  deleteRecinto: (id: string) => Promise<void>;
  
  // Acciones Equipos
  addEquipment: (equipment: ClinicalEquipment) => Promise<void>;
  updateEquipment: (id: string, updates: Partial<ClinicalEquipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
}

export const useEquipmentStore = create<EquipmentState>()((set) => ({
  recintos: [],
  equipments: [],
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
  }
}));
