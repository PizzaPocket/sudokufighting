import { useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuthStore } from './authStore';
import { handleAuthStateChange } from './authService';
import { consumePendingMatch, recordMatch } from '../stats/statsService';
import { loadProgressionFromDB } from '../progression/progressionService';

export function useAuthInit() {
  useEffect(() => {
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

        // Close auth sheets on successful sign-in
        if (event === 'SIGNED_IN') {
          useAuthStore.getState().closeAll();
          // Retroactively save any match played as a guest
          const pending = consumePendingMatch();
          if (pending) recordMatch(pending);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);
}
