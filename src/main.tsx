import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { registerSW } from 'virtual:pwa-register';

// Enregistrement du Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('🔄 Nouvelle version disponible');
    if (confirm('Une nouvelle version est disponible. Voulez-vous mettre à jour ?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('✅ Application prête pour une utilisation hors ligne');
  },
  onRegistered(registration) {
    console.log('✅ Service Worker enregistré:', registration);
  },
  onRegisterError(error) {
    console.error('❌ Erreur lors de l\'enregistrement du Service Worker:', error);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
