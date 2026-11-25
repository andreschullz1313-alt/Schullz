import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installGlobalErrorMonitor } from './services/appMonitor';
import './index.css';

installGlobalErrorMonitor();

const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const checkForLatest = () => {
      registration.update().catch(() => {});
    };
    // Check immediately and whenever user returns to app or regains connectivity
    checkForLatest();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForLatest();
    });
    window.addEventListener('online', checkForLatest);
    window.setInterval(checkForLatest, 5 * 60 * 1000);
  },
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('schullz-app-updated'));
    updateSW(true).catch(() => {});
  },
});

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) {
      window.dispatchEvent(new CustomEvent('schullz-app-updated'));
    }
    hadController = true;
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
