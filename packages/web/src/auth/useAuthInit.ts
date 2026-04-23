import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from './supabaseClient';
import { useAuthStore } from './authStore';
import { handleAuthStateChange } from './authService';
import { consumePendingMatch, recordMatch } from '../stats/statsService';
import { loadProgressionFromDB } from '../progression/progressionService';

export function useAuthInit() {
  useEffect(() => {
    // On native, handle the OAuth deep-link callback (sudokufighting://auth/callback?code=...)
    // and exchange the code for a Supabase session, then close the in-app browser.
    let urlSub: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        console.log('[appUrlOpen]', url);
        if (url.startsWith('sudokufighting://auth/callback')) {
          // The Supabase SDK only parses query params from URLs starting with "http".
          // Custom schemes (sudokufighting://) pass through as-is, so the full URL
          // gets sent to the server as the auth code — causing the "non-empty" error.
          // Extract the code ourselves and pass the plain string.
          const parsedUrl = new URL(url);
          const code = parsedUrl.searchParams.get('code') ?? '';
          if (!code) {
            await Browser.close();
            useAuthStore.getState().setOauthError('Sign-in failed — please try again.');
            useAuthStore.getState().openSignIn();
            return;
          }
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          await Browser.close();
          if (error) {
            console.error('[OAuth callback] exchangeCodeForSession failed:', error.message);
            useAuthStore.getState().setOauthError(error.message);
            useAuthStore.getState().openSignIn();
          }
        }
      }).then(handle => { urlSub = handle; });
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

        // Ignore any session-restoring events that race with an intentional sign-out
        // (TOKEN_REFRESHED / SIGNED_IN can fire concurrently due to the lock bypass)
        if (useAuthStore.getState().signingOut && user != null) return;

        useAuthStore.getState().setUser(user);

        if (user) {
          await handleAuthStateChange(user.id);
          await loadProgressionFromDB(user.id);
        } else {
          useAuthStore.getState().setProfile(null);
        }

        if (event === 'SIGNED_OUT') {
          useAuthStore.getState().setSigningOut(false);
        }

        // Close auth sheets on successful sign-in.
        // Also handle INITIAL_SESSION: OAuth redirects (especially Apple web) can
        // establish the session before the subscription is registered, so SIGNED_IN
        // fires before our listener and we only see INITIAL_SESSION on subscribe.
        const shouldClose = event === 'SIGNED_IN' ||
          (event === 'INITIAL_SESSION' && user != null &&
            (useAuthStore.getState().signInOpen || useAuthStore.getState().createAccountOpen));

        if (shouldClose) {
          useAuthStore.getState().closeAll();
          if (event === 'SIGNED_IN') {
            // Retroactively save any match played as a guest
            const pending = consumePendingMatch();
            if (pending) recordMatch(pending);
          }
        }
      }
    );
    return () => {
      subscription.unsubscribe();
      urlSub?.remove();
    };
  }, []);
}
