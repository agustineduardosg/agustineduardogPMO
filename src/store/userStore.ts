import { create } from 'zustand';

export type MasterUserRole = 'Project Manager' | 'Ingeniero Biomédico' | 'Físico Médico' | 'Técnico de TI' | 'Mantenimiento Climatización' | (string & {});

export interface MasterUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: MasterUserRole;
  maxTasksLimit: number; // Límite de tareas activas recomendadas (Capacidad de trabajo)
}

interface UserMasterState {
  users: MasterUser[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  addUser: (user: MasterUser) => Promise<void>;
  updateUser: (id: string, updates: Partial<MasterUser>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserMasterState>()((set) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      set({ users: data, isLoading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  addUser: async (user) => {
    // Actualización optimista
    set((state) => ({ users: [...state.users, user] }));
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!response.ok) throw new Error('Failed to create user');
    } catch (err: any) {
      console.error(err);
      // Revertir en caso de error
      set({ error: err.message });
      // Recargar del servidor para asegurar consistencia
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        set({ users: data });
      }
    }
  },

  updateUser: async (id, updates) => {
    // Actualización optimista
    set((state) => ({
      users: state.users.map(u => u.id === id ? { ...u, ...updates } : u)
    }));
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update user');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revertir recargando del servidor
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        set({ users: data });
      }
    }
  },

  deleteUser: async (id) => {
    // Actualización optimista
    set((state) => ({
      users: state.users.filter(u => u.id !== id)
    }));
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete user');
    } catch (err: any) {
      console.error(err);
      set({ error: err.message });
      // Revertir recargando del servidor
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        set({ users: data });
      }
    }
  }
}));
