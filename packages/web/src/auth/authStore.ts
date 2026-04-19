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
  forgotPasswordOpen: boolean;
  accountOpen: boolean;
  resetPasswordMode: boolean;
  switching: boolean;

  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  openSignIn: () => void;
  openCreateAccount: () => void;
  openAccount: () => void;
  switchToSignIn: () => void;
  switchToCreateAccount: () => void;
  switchToForgotPassword: () => void;
  setResetPasswordMode: (on: boolean) => void;
  closeAll: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  signInOpen: false,
  createAccountOpen: false,
  forgotPasswordOpen: false,
  accountOpen: false,
  resetPasswordMode: false,
  switching: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  openSignIn: () => set({ signInOpen: true, createAccountOpen: false, forgotPasswordOpen: false, accountOpen: false }),
  openCreateAccount: () => set({ createAccountOpen: true, signInOpen: false, forgotPasswordOpen: false, accountOpen: false }),
  openAccount: () => set({ accountOpen: true, signInOpen: false, createAccountOpen: false, forgotPasswordOpen: false }),
  closeAll: () => set({ signInOpen: false, createAccountOpen: false, forgotPasswordOpen: false, accountOpen: false, switching: false }),

  switchToSignIn: () => set({ signInOpen: true, createAccountOpen: false, forgotPasswordOpen: false, switching: true }),
  switchToCreateAccount: () => set({ createAccountOpen: true, signInOpen: false, forgotPasswordOpen: false, switching: true }),
  switchToForgotPassword: () => set({ forgotPasswordOpen: true, signInOpen: false, createAccountOpen: false, switching: true }),

  setResetPasswordMode: (on) => set({ resetPasswordMode: on }),
}));
