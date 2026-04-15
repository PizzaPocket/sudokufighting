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
  // Sheet visibility — only one open at a time
  signInOpen: boolean;
  createAccountOpen: boolean;
  accountOpen: boolean;

  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  openSignIn: () => void;
  openCreateAccount: () => void;
  openAccount: () => void;
  closeAll: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  signInOpen: false,
  createAccountOpen: false,
  accountOpen: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  openSignIn: () => set({ signInOpen: true, createAccountOpen: false, accountOpen: false }),
  openCreateAccount: () => set({ createAccountOpen: true, signInOpen: false, accountOpen: false }),
  openAccount: () => set({ accountOpen: true, signInOpen: false, createAccountOpen: false }),
  closeAll: () => set({ signInOpen: false, createAccountOpen: false, accountOpen: false }),
}));
