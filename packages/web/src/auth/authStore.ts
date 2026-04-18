import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  username: string;
  createdAt: string;
}

interface AuthStore {
  user: User | null;
  profile: Profile | null;
  signInOpen: boolean;
  createAccountOpen: boolean;
  accountOpen: boolean;
  switching: boolean;

  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  openSignIn: () => void;
  openCreateAccount: () => void;
  openAccount: () => void;
  switchToSignIn: () => void;
  switchToCreateAccount: () => void;
  closeAll: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  signInOpen: false,
  createAccountOpen: false,
  accountOpen: false,
  switching: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  openSignIn: () => set({ signInOpen: true, createAccountOpen: false, accountOpen: false }),
  openCreateAccount: () => set({ createAccountOpen: true, signInOpen: false, accountOpen: false }),
  openAccount: () => set({ accountOpen: true, signInOpen: false, createAccountOpen: false }),
  closeAll: () => set({ signInOpen: false, createAccountOpen: false, accountOpen: false, switching: false }),

  switchToSignIn: () => set({ signInOpen: true, createAccountOpen: false, switching: true }),
  switchToCreateAccount: () => set({ createAccountOpen: true, signInOpen: false, switching: true }),
}));
