import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sudokufighting.app',
  appName: 'Sudoku Fighting',
  webDir: 'dist',
  // On native, the WKWebView/WebView serves files from the device filesystem,
  // so the Vite dev proxy is unavailable. WS and Supabase go straight to prod.
  server: {
    // Allow navigation to Supabase OAuth URLs during sign-in flow
    allowNavigation: ['*.supabase.co'],
  },
  ios: {
    // Scheme used for OAuth deep-link callback: sudokufighting://auth/callback
    scheme: 'sudokufighting',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
