import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// storageAdapter: undefined on web (Supabase defaults to localStorage).
// Capacitor phase: import AsyncStorage and pass it here — one-line swap,
// no other code in the app needs to change.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Bypass navigator.locks — the SDK uses it to serialize auth across tabs, but
    // concurrent lock requests during React StrictMode's double-mount (and Vite HMR
    // module re-evaluation) cause "stole it" errors that prevent INITIAL_SESSION
    // from firing, leaving the user permanently signed out after a page reload.
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});
