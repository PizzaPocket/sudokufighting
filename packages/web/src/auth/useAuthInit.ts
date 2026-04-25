import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { StatusBar } from '@capacitor/status-bar';
import { supabase } from './supabaseClient';
import { useAuthStore } from './authStore';
import { handleAuthStateChange } from './authService';
import { consumePendingMatch, recordMatch } from '../stats/statsService';
import { loadProgressionFromDB } from '../progression/progressionService';
import { ensureConnected } from '../hooks/useGameSocket';

// When the native OAuth callback fires, onAuthStateChange fires re-entrantly
// *inside* setSession()/exchangeCodeForSession() before those calls return.
// Any supabase.from() call made at that point calls getSession() which
// re-enters the auth client's internal state machine and deadlocks on iOS.
// This flag tells onAuthStateChange to skip profile/progression loading —
// appUrlOpen loads them directly after the auth call fully returns instead.
let oauthCallbackInProgress = false;

export function useAuthInit() {
  useEffect(() => {
    // On native, handle the OAuth deep-link callback (sudokufighting://auth/callback?code=...)
    // and exchange the code for a Supabase session, then close the in-app browser.
    if (Capacitor.isNativePlatform()) {
      StatusBar.hide().catch(() => {});
    }

    let urlSub: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        console.log('[appUrlOpen]', url);
        if (url.startsWith('sudokufighting://auth/callback')) {
          await Browser.close();

          try {
            const parsedUrl = new URL(url);

            // PKCE flow: Supabase redirects with ?code=...
            const code = parsedUrl.searchParams.get('code');
            if (code) {
              oauthCallbackInProgress = true;
              const { error } = await supabase.auth.exchangeCodeForSession(code);
              oauthCallbackInProgress = false;
              if (error) {
                console.error('[OAuth callback] exchangeCodeForSession failed:', error.message);
                useAuthStore.getState().setOauthError(error.message);
                useAuthStore.getState().openSignIn();
                return;
              }
              const user = (await supabase.auth.getUser()).data.user;
              if (user) {
                await handleAuthStateChange(user.id).catch(() => {});
                await loadProgressionFromDB(user.id).catch(() => {});
              }
              return;
            }

            // Implicit flow: Supabase redirects with #access_token=...&refresh_token=...
            const hash = parsedUrl.hash.slice(1);
            if (hash) {
              const params = new URLSearchParams(hash);
              const accessToken  = params.get('access_token');
              const refreshToken = params.get('refresh_token');
              if (accessToken && refreshToken) {
                oauthCallbackInProgress = true;
                const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
                oauthCallbackInProgress = false;
                if (error) {
                  console.error('[OAuth callback] setSession failed:', error.message);
                  useAuthStore.getState().setOauthError(error.message);
                  useAuthStore.getState().openSignIn();
                  return;
                }
                if (data.session?.user) {
                  await handleAuthStateChange(data.session.user.id).catch(() => {});
                  await loadProgressionFromDB(data.session.user.id).catch(() => {});
                }
                return;
              }
            }

            // No token found — surface any error param from the URL
            const errMsg = parsedUrl.searchParams.get('error_description')
              ?? parsedUrl.searchParams.get('error')
              ?? 'Sign-in failed. Please try again.';
            console.error('[OAuth callback] no token in URL:', url);
            useAuthStore.getState().setOauthError(errMsg);
            useAuthStore.getState().openSignIn();
          } catch (e) {
            oauthCallbackInProgress = false;
            console.error('[OAuth callback] unexpected error:', e);
            useAuthStore.getState().setOauthError('Sign-in failed. Please try again.');
            useAuthStore.getState().openSignIn();
          }
        }
      }).then(handle => { urlSub = handle; });
    }

    // iOS and mobile browsers both suspend JS timers when backgrounded, so
    // Supabase's internal auto-refresh interval may never fire after a long
    // absence. Call getSession() on resume/visibility to force a token refresh,
    // which fires TOKEN_REFRESHED → onAuthStateChange → re-loads profile/stats.
    let appStateSub: { remove: () => void } | null = null;
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().catch(() => {});
        ensureConnected();
      }
    }
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          supabase.auth.getSession().catch(() => {});
          ensureConnected();
        }
      }).then(handle => { appStateSub = handle; });
    } else {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null;

        // Recovery flow: clear any existing auth state and show the reset-password modal.
        // INITIAL_SESSION may have already signed the user in before this event fires,
        // so we must explicitly clear user/profile here, not just skip setting them.
        if (event === 'PASSWORD_RECOVERY') {
          useAuthStore.getState().setUser(null);
          useAuthStore.getState().setProfile(null);
          useAuthStore.getState().setResetPasswordMode(true);
          return;
        }

        // Mark auth as ready on the first event — Supabase has now restored the session
        // (including any token refresh), so all Supabase calls can proceed safely.
        if (event === 'INITIAL_SESSION') {
          useAuthStore.getState().setAuthReady(true);
        }

        // Bump authVersion on every event that can deliver a fresh valid token so
        // that data-loading effects (leaderboard, profile) automatically retry.
        // INITIAL_SESSION fires first (possibly with a stale/expired token),
        // TOKEN_REFRESHED fires once the refresh completes — both bumps ensure at
        // least one load attempt happens with a valid token.
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          useAuthStore.getState().bumpAuthVersion();
        }

        useAuthStore.getState().setUser(user);

        // Close auth sheets immediately — don't wait for profile/progression loads.
        // On native the DB calls that follow can be slow, so close the UI first.
        const shouldClose = event === 'SIGNED_IN' ||
          (event === 'INITIAL_SESSION' && user != null &&
            (useAuthStore.getState().signInOpen || useAuthStore.getState().createAccountOpen));

        if (shouldClose) {
          useAuthStore.getState().closeAll();
          if (event === 'SIGNED_IN') {
            const pending = consumePendingMatch();
            if (pending) recordMatch(pending);
          }
        }

        // Skip profile/progression loads when fired re-entrantly from the native OAuth
        // callback — appUrlOpen handles those after the auth call fully returns.
        if (oauthCallbackInProgress) return;

        if (user) {
          await handleAuthStateChange(user.id);
          await loadProgressionFromDB(user.id);
        } else {
          useAuthStore.getState().setProfile(null);
        }
      }
    );
    return () => {
      subscription.unsubscribe();
      urlSub?.remove();
      appStateSub?.remove();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
