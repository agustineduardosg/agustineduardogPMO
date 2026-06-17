import { create } from 'zustand';

export type IncidentImpact = 'Crítico' | 'Medio' | 'Bajo' | (string & {});
export type IncidentStatus = 'Abierto' | 'En proceso' | 'Cerrado' | (string & {});

export interface Incident {
  id: string;
  indexId: number; // ID numérico incremental correlativo del excel (1, 2, 3...)
  fecha: string;
  recintoName: string; // e.g. "BUPA Santiago (CLA)"
  equipmentName: string; // e.g. "CA 600"
  faseAfectada: string; // e.g. "Pruebas"
  descripcion: string;
  impacto: IncidentImpact;
  responsable: string;
  estado: IncidentStatus;
  planDeAccion: string;
  fechaCierre: string;
  projectId?: string | null;
  idTicket?: string | null;
  customFields?: string;
  attachments?: { id: string; name: string; type: string; url: string; incidentId?: string | null; createdAt: string }[];
}

interface IncidentState {
  incidents: Incident[];
  isLoading: boolean;
  error: string | null;
  fetchIncidents: () => Promise<void>;
  addIncident: (incident: Incident) => Promise<void>;
  updateIncident: (id: string, updates: Partial<Incident>) => Promise<void>;
  deleteIncident: (id: string) => Promise<void>;
  bulkImportIncidents: (data: { incidents: any[]; customColumns: string[]; defaultValues?: any }) => Promise<void>;
}

export const useIncidentStore = create<IncidentState>()((set) => ({
  incidents: [],
  isLoading: false,
  error: null,

  fetchIncidents: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/incidents', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch incidents');
      const data = await response.json();
      set({ incidents: data, isLoading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  addIncident: async (incident) => {
    // Actualización optimista
    set((state) => ({ incidents: [...state.incidents, incident] }));
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incident)
      });
      if (!response.ok) throw new Error('Failed to create incident');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revertir recargando del servidor
      const response = await fetch('/api/incidents', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        set({ incidents: data });
      }
    }
  },

  updateIncident: async (id, updates) => {
    // Actualización optimista
    set((state) => ({
      incidents: state.incidents.map(i => i.id === id ? { ...i, ...updates } : i)
    }));
    try {
      const response = await fetch(`/api/incidents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update incident');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revertir recargando del servidor
      const response = await fetch('/api/incidents', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        set({ incidents: data });
      }
    }
  },

  deleteIncident: async (id) => {
    // Actualización optimista
    set((state) => ({
      incidents: state.incidents.filter(i => i.id !== id)
    }));
    try {
      const response = await fetch(`/api/incidents/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete incident');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revertir recargando del servidor
      const response = await fetch('/api/incidents', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        set({ incidents: data });
      }
    }
  },

  bulkImportIncidents: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/incidents/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to bulk import incidents');
      }
      const data = await response.json();
      set({ incidents: data, isLoading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  }
}));
