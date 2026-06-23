import { create } from 'zustand';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'contributor' | 'viewer';
  full_name?: string;
  is_active: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isContributor: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('access_token'),
  user: (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })(),
  setAuth: (token, user) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
  isAdmin: () => get().user?.role === 'admin',
  isContributor: () =>
    ['admin', 'contributor'].includes(get().user?.role || ''),
}));
