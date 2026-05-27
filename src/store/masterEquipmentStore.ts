import { create } from 'zustand';

export interface MasterEquipment {
  id: string;
  name: string;
  section: string;
  category: string;
  createdAt?: string;
  updatedAt?: string;
}

interface MasterEquipmentState {
  masterEquipments: MasterEquipment[];
  isLoading: boolean;
  error: string | null;
  fetchMasterEquipments: () => Promise<void>;
  addMasterEquipment: (equipment: Omit<MasterEquipment, 'id'>) => Promise<void>;
  updateMasterEquipment: (id: string, updates: Partial<MasterEquipment>) => Promise<void>;
  deleteMasterEquipment: (id: string) => Promise<void>;
}

export const useMasterEquipmentStore = create<MasterEquipmentState>()((set) => ({
  masterEquipments: [],
  isLoading: false,
  error: null,

  fetchMasterEquipments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/master-equipments');
      if (!response.ok) throw new Error('Failed to fetch master equipments');
      const data = await response.json();
      set({ masterEquipments: data, isLoading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  addMasterEquipment: async (equipment) => {
    const tempId = `temp-${Date.now()}`;
    const tempEq: MasterEquipment = { id: tempId, ...equipment };
    
    // Actualización optimista
    set((state) => ({ masterEquipments: [...state.masterEquipments, tempEq] }));
    
    try {
      const response = await fetch('/api/master-equipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(equipment)
      });
      if (!response.ok) throw new Error('Failed to create master equipment');
      
      // Recargar para obtener el ID real generado en base de datos
      const res = await fetch('/api/master-equipments');
      if (res.ok) {
        const data = await res.json();
        set({ masterEquipments: data });
      }
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revertir recargando
      const res = await fetch('/api/master-equipments');
      if (res.ok) {
        const data = await res.json();
        set({ masterEquipments: data });
      }
    }
  },

  updateMasterEquipment: async (id, updates) => {
    // Actualización optimista
    set((state) => ({
      masterEquipments: state.masterEquipments.map(eq => eq.id === id ? { ...eq, ...updates } : eq)
    }));
    
    try {
      const response = await fetch(`/api/master-equipments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update master equipment');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revertir recargando
      const res = await fetch('/api/master-equipments');
      if (res.ok) {
        const data = await res.json();
        set({ masterEquipments: data });
      }
    }
  },

  deleteMasterEquipment: async (id) => {
    // Actualización optimista
    set((state) => ({
      masterEquipments: state.masterEquipments.filter(eq => eq.id !== id)
    }));
    
    try {
      const response = await fetch(`/api/master-equipments/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete master equipment');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revertir recargando
      const res = await fetch('/api/master-equipments');
      if (res.ok) {
        const data = await res.json();
        set({ masterEquipments: data });
      }
    }
  }
}));
