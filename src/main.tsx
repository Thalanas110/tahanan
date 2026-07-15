import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

import { initSQLite } from './lib/sqlite';

// Wrap in DOMContentLoaded so the app boots correctly inside Capacitor's WebView
const mount = async () => {
  try {
    await initSQLite();
  } catch (err) {
    console.error('Failed to init SQLite:', err);
  }
  createRoot(document.getElementById('root')!).render(<App />);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
