import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

// Wrap in DOMContentLoaded so the app boots correctly inside Capacitor's WebView
const mount = () => createRoot(document.getElementById('root')!).render(<App />);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
