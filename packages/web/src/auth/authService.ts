import { Filter } from 'bad-words';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { supabase } from './supabaseClient';
import { useAuthStore } from './authStore';
import type { Profile } from './authStore';

// ── Profanity filter ──────────────────────────────────────────────────────────

const profanityFilter = new Filter();

function normalizeForProfanity(str: string): string {
  return str
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/0/g, 'o')
    .replace(/3/g, 'e')
    .replace(/1/g, 'i')
    .replace(/5/g, 's');
}

export function isProfane(str: string): boolean {
  return profanityFilter.isProfane(normalizeForProfanity(str));
}

// ── Username generation ───────────────────────────────────────────────────────

const ADJECTIVES = [
  'Swift', 'Iron', 'Blazing', 'Shadow', 'Crimson', 'Jade', 'Void', 'Thunder',
  'Obsidian', 'Silent', 'Hollow', 'Phantom', 'Scarlet', 'Ashen', 'Radiant',
  'Gilded', 'Savage', 'Rogue', 'Ancient', 'Frosted', 'Lunar', 'Solar', 'Molten',
  'Cursed', 'Eternal', 'Fierce', 'Dread', 'Feral', 'Primal', 'Sacred', 'Twisted',
  'Solemn', 'Nether', 'Dire', 'Fallen', 'Ruthless', 'Vengeful', 'Forgotten',
  'Burning', 'Bound',
];

const NOUNS = [
  'Sage', 'Monk', 'Ronin', 'Dragon', 'Fang', 'Oni', 'Shinobi', 'Serpent',
  'Phoenix', 'Crane', 'Wolf', 'Titan', 'Specter', 'Exile', 'Warlord', 'Oracle',
  'Tempest', 'Viper', 'Raven', 'Wraith', 'Tiger', 'Fox', 'Hawk', 'Lotus',
  'Blade', 'Claw', 'Ghost', 'Spirit', 'Skull', 'Ember', 'Dagger', 'Spear',
  'Omen', 'Pilgrim', 'Wanderer', 'Hunter', 'Reaper', 'Samurai', 'Bear', 'Demon',
];

function generateCandidateUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 98) + 2; // 2–99
  return `${adj}${noun}#${num}`;
}

async function generateUniqueUsername(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = generateCandidateUsername();
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  // Fallback: append extra digits to guarantee uniqueness
  return generateCandidateUsername() + Math.floor(Math.random() * 100);
}

// ── Profile helpers ───────────────────────────────────────────────────────────

export async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, username: data.username, createdAt: data.created_at };
}

async function createProfile(userId: string): Promise<Profile> {
  const username = await generateUniqueUsername();
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, username })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, username: data.username, createdAt: data.created_at };
}

// Called by useAuthInit on every auth state change with a valid user
export async function handleAuthStateChange(userId: string): Promise<void> {
  let profile = await loadProfile(userId);
  if (!profile) {
    try {
      profile = await createProfile(userId);
    } catch {
      // Profile may already exist (race condition or trigger-created row) — retry select
      profile = await loadProfile(userId);
    }
  }
  if (profile) useAuthStore.getState().setProfile(profile);
}

// ── Auth actions ──────────────────────────────────────────────────────────────

export function friendlyError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.';
  if (msg.includes('already registered') || msg.includes('already exists'))
    return 'An account with that email already exists. Try signing in.';
  if (msg.includes('Email not confirmed'))
    return 'Check your email to confirm your account, then sign in.';
  if (msg.includes('Password should be'))
    return 'Password must be at least 6 characters.';
  return 'Something went wrong — please try again.';
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? friendlyError(error.message) : null;
}

export async function createAccount(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signUp({ email, password });
  return error ? friendlyError(error.message) : null;
}

function getRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) return 'sudokufighting://auth/callback';
  return import.meta.env.VITE_AUTH_REDIRECT_URL ?? window.location.origin;
}

async function oauthSignIn(provider: 'google' | 'apple'): Promise<void> {
  const redirectTo = getRedirectUrl();
  if (Capacitor.isNativePlatform()) {
    // Use in-app browser sheet (ASWebAuthenticationSession on iOS) — no app switch
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return;
    await Browser.open({ url: data.url });
  } else {
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  }
}

export async function signInWithGoogle(): Promise<string | null> {
  try {
    await oauthSignIn('google');
    return null;
  } catch {
    return 'Something went wrong — please try again.';
  }
}

export function isAppleSignInAvailable(): boolean {
  return !(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android');
}

export async function signInWithApple(): Promise<string | null> {
  // On iOS native: use the system Face ID / Touch ID prompt — no browser at all
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
    try {
      const { response } = await SignInWithApple.authorize({
        clientId: 'com.sudokufighting.app',
        redirectURI: 'sudokufighting://auth/callback',
        scopes: 'email name',
      });
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: response.identityToken,
      });
      if (error) return error.message;
      return null;
    } catch (e: unknown) {
      // Code 1001 = user cancelled — silent. Everything else is a real error.
      const code = (e as { code?: number })?.code;
      if (code === 1001) return null;
      return 'Apple Sign-In failed — please try again.';
    }
  }
  // Web / Android: OAuth sheet
  await oauthSignIn('apple');
  return null;
}

export async function resetPassword(email: string): Promise<string | null> {
  // Always redirect to the website — simpler than deep-linking back to the native app,
  // and password reset is already an out-of-app browser flow.
  const redirectTo = import.meta.env.VITE_AUTH_REDIRECT_URL ?? window.location.origin;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  return error ? friendlyError(error.message) : null;
}

export async function updatePassword(password: string): Promise<string | null> {
  // supabase.auth.updateUser hangs in recovery sessions due to the lock bypass.
  // Read the session directly and POST to the REST API instead.
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return 'Session expired — please request a new reset link.';
    }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL as string}/auth/v1/user`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({ password }),
      }
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, string>;
      const msg = body.message || body.error_description || body.error || 'Failed to update password.';
      console.error('[updatePassword]', res.status, msg);
      return friendlyError(msg);
    }

    // Sign the user in after a successful password update
    useAuthStore.getState().setUser(session.user);
    await handleAuthStateChange(session.user.id).catch(() => {});
    return null;
  } catch (e) {
    console.error('[updatePassword] threw:', e);
    return 'Something went wrong — please try again.';
  }
}

export async function signOut(): Promise<void> {
  const store = useAuthStore.getState();
  store.setUser(null);
  store.setProfile(null);
  store.closeAll();
  // scope:'local' clears localStorage immediately with no network call,
  // so it can't hang. A full remote revocation would hang on native
  // (same lock-bypass issue as updateUser / the old signOut).
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}

// ── Username management ───────────────────────────────────────────────────────

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();
  return !data;
}

export async function updateUsername(userId: string, username: string): Promise<string | null> {
  if (username.length > 20) return 'Name must be 20 characters or fewer.';
  if (isProfane(username)) return "That name isn't allowed — try another.";
  const available = await checkUsernameAvailable(username);
  if (!available) return 'That name is taken — try another.';
  const { error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', userId);
  if (error) return 'Something went wrong — please try again.';
  const current = useAuthStore.getState().profile;
  if (current) useAuthStore.getState().setProfile({ ...current, username });
  return null;
}
