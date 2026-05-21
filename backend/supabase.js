import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase is optional — backend works without it (Phase 1 mode).
// When env vars are set, the service-role client bypasses RLS so the server
// can write match results for both players authoritatively.
// Node 20 lacks native WebSocket; pass the 'ws' package as the realtime transport.
export const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: false }, realtime: { transport: WebSocket } })
  : null;
