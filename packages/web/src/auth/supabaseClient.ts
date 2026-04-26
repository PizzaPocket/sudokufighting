import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ── Auth instrumentation helpers ──────────────────────────────────────────────

function _ts(): string { return new Date().toISOString(); }

function _jwtExp(token: string | undefined): number | null {
  if (!token) return null;
  try { return (JSON.parse(atob(token.split('.')[1])) as { exp: number }).exp; }
  catch { return null; }
}

function _tokenStatus(token: string | undefined): string {
  const exp = _jwtExp(token);
  if (exp === null) return 'none';
  const s = Math.round(exp - Date.now() / 1000);
  return s >= 0 ? `valid(${s}s)` : `expired(${-s}s_ago)`;
}

let _lockId = 0;
let _activeLocks = 0;

// ─────────────────────────────────────────────────────────────────────────────

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
    lock: async (_name, _acquireTimeout, fn) => {
      const id = ++_lockId;
      _activeLocks++;
      console.log(`[AUTH] lock:acquire id=${id} concurrent=${_activeLocks} name=${_name} t=${_ts()}`);
      try {
        return await fn();
      } finally {
        _activeLocks--;
        console.log(`[AUTH] lock:release id=${id} concurrent=${_activeLocks} t=${_ts()}`);
      }
    },
  },
});

// ── getSession instrumentation ────────────────────────────────────────────────
// Every internal SDK call that touches auth state (refresh, getUser, DB queries
// via postgrest-js) calls getSession() to obtain the bearer token.  Wrapping it
// here lets us see concurrency (concurrent > 1) and whether a refresh occurred
// inside the call (tokenChanged = true).  Remove once the race is confirmed.

let _gsId = 0;
let _gsActive = 0;
let _prevTokenExp: number | null = null;

const _origGetSession = supabase.auth.getSession.bind(supabase.auth);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(supabase.auth as any).getSession = async () => {
  const id = ++_gsId;
  _gsActive++;
  const capturedPrevExp = _prevTokenExp;

  console.log(
    `[AUTH] getSession:start id=${id} concurrent=${_gsActive}` +
    ` prevExp=${capturedPrevExp ? new Date(capturedPrevExp * 1000).toISOString() : 'none'}` +
    ` t=${_ts()}`
  );

  const result = await _origGetSession();
  _gsActive--;

  const newExp = _jwtExp(result.data.session?.access_token);
  const tokenChanged = newExp !== capturedPrevExp;
  _prevTokenExp = newExp;

  console.log(
    `[AUTH] getSession:end id=${id} concurrent=${_gsActive}` +
    ` tokenChanged=${tokenChanged}` +
    ` token=${_tokenStatus(result.data.session?.access_token)}` +
    ` error=${result.error?.message ?? 'none'}` +
    ` t=${_ts()}`
  );

  return result;
};
