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
  authReady: boolean;
  // Incremented on INITIAL_SESSION, TOKEN_REFRESHED, and SIGNED_IN so that
  // data-loading effects automatically retry after a token refresh on cold start.
  authVersion: number;
  signInOpen: boolean;
  createAccountOpen: boolean;
  forgotPasswordOpen: boolean;
  accountOpen: boolean;
  resetPasswordMode: boolean;
  switching: boolean;
  signingOut: boolean;
  oauthError: string | null;

  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setAuthReady: (v: boolean) => void;
  bumpAuthVersion: () => void;
  openSignIn: () => void;
  openCreateAccount: () => void;
  openAccount: () => void;
  switchToSignIn: () => void;
  switchToCreateAccount: () => void;
  switchToForgotPassword: () => void;
  setResetPasswordMode: (on: boolean) => void;
  setSigningOut: (v: boolean) => void;
  setOauthError: (msg: string | null) => void;
  closeAll: () => void;
}

function ts() { return new Date().toISOString(); }

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  authReady: false,
  authVersion: 0,
  signInOpen: false,
  createAccountOpen: false,
  forgotPasswordOpen: false,
  accountOpen: false,
  resetPasswordMode: false,
  switching: false,
  signingOut: false,
  oauthError: null,

  setUser: (user) => {
    const prev = get().user;
    console.log(`[STATE] setUser ${prev?.id ?? 'null'} → ${user?.id ?? 'null'} t=${ts()}`);
    set({ user });
  },
  setProfile: (profile) => {
    const prev = get().profile;
    console.log(`[STATE] setProfile ${prev?.username ?? 'null'} → ${profile?.username ?? 'null'} t=${ts()}`);
    set({ profile });
  },
  setAuthReady: (v) => {
    console.log(`[STATE] setAuthReady → ${v} t=${ts()}`);
    set({ authReady: v });
  },
  bumpAuthVersion: () => {
    const prev = get().authVersion;
    console.log(`[STATE] bumpAuthVersion ${prev} → ${prev + 1} t=${ts()}`);
    set(s => ({ authVersion: s.authVersion + 1 }));
  },

  openSignIn: () => set({ signInOpen: true, createAccountOpen: false, forgotPasswordOpen: false, accountOpen: false }),
  openCreateAccount: () => set({ createAccountOpen: true, signInOpen: false, forgotPasswordOpen: false, accountOpen: false }),
  openAccount: () => set({ accountOpen: true, signInOpen: false, createAccountOpen: false, forgotPasswordOpen: false }),
  closeAll: () => set({ signInOpen: false, createAccountOpen: false, forgotPasswordOpen: false, accountOpen: false, switching: false }),

  switchToSignIn: () => set({ signInOpen: true, createAccountOpen: false, forgotPasswordOpen: false, switching: true }),
  switchToCreateAccount: () => set({ createAccountOpen: true, signInOpen: false, forgotPasswordOpen: false, switching: true }),
  switchToForgotPassword: () => set({ forgotPasswordOpen: true, signInOpen: false, createAccountOpen: false, switching: true }),

  setResetPasswordMode: (on) => set({ resetPasswordMode: on }),
  setSigningOut: (v) => set({ signingOut: v }),
  setOauthError: (msg) => set({ oauthError: msg }),
}));
