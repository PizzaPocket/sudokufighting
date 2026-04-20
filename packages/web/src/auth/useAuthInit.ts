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
        if (url.startsWith('sudokufighting://auth/callback')) {
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          await Browser.close();
          if (error) {
            // Show a recoverable error on the sign-in sheet
            useAuthStore.getState().openSignIn();
          }
        }
      }).then(handle => { urlSub = handle; });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null;
        useAuthStore.getState().setUser(user);

        if (user) {
          await handleAuthStateChange(user.id);
          await loadProgressionFromDB(user.id);
        } else {
          useAuthStore.getState().setProfile(null);
        }

        if (event === 'PASSWORD_RECOVERY') {
          useAuthStore.getState().setResetPasswordMode(true);
          return;
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
