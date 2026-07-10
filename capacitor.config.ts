import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tahanan.app',
  appName: 'Tahanan',
  webDir: 'dist',
  server: {
    // Enable live-reload from the local dev server during development.
    // Comment these two lines out before doing a production build.
    // url: 'http://YOUR_LOCAL_IP:5173',
    // cleartext: true,
    androidScheme: 'https',
  },
  android: {
    // Allow mixed-content for development (disable in production if not needed)
    allowMixedContent: false,
    // Enable back-button navigation inside the WebView
    captureInput: true,
  },
};

export default config;
