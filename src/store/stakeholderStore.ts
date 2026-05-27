import { create } from 'zustand';

export interface Stakeholder {
  id: string;
  indexId: number;
  name: string;
  role: string;
  orgSede: string;
  area: string;
  contact: string;
  influence: string;
  impact: string;
  notes: string;
  projectId?: string | null;
  customFields?: string; // stringified JSON
}

interface StakeholderState {
  stakeholders: Stakeholder[];
  isLoading: boolean;
  error: string | null;
  fetchStakeholders: () => Promise<void>;
  addStakeholder: (stakeholder: Stakeholder) => Promise<void>;
  updateStakeholder: (id: string, updates: Partial<Stakeholder>) => Promise<void>;
  deleteStakeholder: (id: string) => Promise<void>;
}

export const useStakeholderStore = create<StakeholderState>()((set) => ({
  stakeholders: [],
  isLoading: false,
  error: null,

  fetchStakeholders: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/stakeholders');
      if (!response.ok) throw new Error('Failed to fetch stakeholders');
      const data = await response.json();
      set({ stakeholders: data, isLoading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  addStakeholder: async (stakeholder) => {
    set((state) => ({ stakeholders: [...state.stakeholders, stakeholder] }));
    try {
      const response = await fetch('/api/stakeholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stakeholder)
      });
      if (!response.ok) throw new Error('Failed to create stakeholder');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revert from server
      const response = await fetch('/api/stakeholders');
      if (response.ok) {
        const data = await response.json();
        set({ stakeholders: data });
      }
    }
  },

  updateStakeholder: async (id, updates) => {
    set((state) => ({
      stakeholders: state.stakeholders.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
    try {
      const response = await fetch(`/api/stakeholders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update stakeholder');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revert from server
      const response = await fetch('/api/stakeholders');
      if (response.ok) {
        const data = await response.json();
        set({ stakeholders: data });
      }
    }
  },

  deleteStakeholder: async (id) => {
    set((state) => ({
      stakeholders: state.stakeholders.filter(s => s.id !== id)
    }));
    try {
      const response = await fetch(`/api/stakeholders/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete stakeholder');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revert from server
      const response = await fetch('/api/stakeholders');
      if (response.ok) {
        const data = await response.json();
        set({ stakeholders: data });
      }
    }
  }
}));
