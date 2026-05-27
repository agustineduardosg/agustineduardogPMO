import { create } from 'zustand';

export type TrainingResult = 'Aprobado' | 'Pendiente' | 'Reprobado' | (string & {});

export interface Training {
  id: string;
  indexId: number; // ID numérico incremental correlativo del excel (1, 2, 3...)
  participant: string;
  role: string;
  recintoName: string; // e.g. "BUPA Santiago (CLA)"
  moduleTheme: string;
  equipmentName: string; // e.g. "Atellica Solution"
  fecha: string;
  instructor: string;
  duration: number; // Duración (hrs)
  result: TrainingResult;
  observaciones: string;
  customFields?: string;
}

interface TrainingState {
  trainings: Training[];
  isLoading: boolean;
  error: string | null;
  fetchTrainings: () => Promise<void>;
  addTraining: (training: Training) => Promise<void>;
  updateTraining: (id: string, updates: Partial<Training>) => Promise<void>;
  deleteTraining: (id: string) => Promise<void>;
}

export const useTrainingStore = create<TrainingState>()((set) => ({
  trainings: [],
  isLoading: false,
  error: null,

  fetchTrainings: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/trainings');
      if (!response.ok) throw new Error('Failed to fetch trainings');
      const data = await response.json();
      set({ trainings: data, isLoading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  addTraining: async (training) => {
    // Actualización optimista
    set((state) => ({ trainings: [...state.trainings, training] }));
    try {
      const response = await fetch('/api/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(training)
      });
      if (!response.ok) throw new Error('Failed to create training');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revertir recargando del servidor
      const response = await fetch('/api/trainings');
      if (response.ok) {
        const data = await response.json();
        set({ trainings: data });
      }
    }
  },

  updateTraining: async (id, updates) => {
    // Actualización optimista
    set((state) => ({
      trainings: state.trainings.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    try {
      const response = await fetch(`/api/trainings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update training');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revertir recargando del servidor
      const response = await fetch('/api/trainings');
      if (response.ok) {
        const data = await response.json();
        set({ trainings: data });
      }
    }
  },

  deleteTraining: async (id) => {
    // Actualización optimista
    set((state) => ({
      trainings: state.trainings.filter(t => t.id !== id)
    }));
    try {
      const response = await fetch(`/api/trainings/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete training');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revertir recargando del servidor
      const response = await fetch('/api/trainings');
      if (response.ok) {
        const data = await response.json();
        set({ trainings: data });
      }
    }
  }
}));
