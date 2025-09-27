import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Configuration pour la production
if (import.meta.env.PROD) {
  // Désactiver les logs de développement en production
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  
  // Garder seulement les erreurs critiques
  const originalError = console.error;
  console.error = (...args) => {
    // Filtrer les erreurs non critiques
    const message = args[0]?.toString() || '';
    if (message.includes('Warning:') || 
        message.includes('DevTools') ||
        message.includes('React DevTools')) {
      return;
    }
    originalError.apply(console, args);
  };
}

// Enregistrer le Service Worker pour la PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        if (import.meta.env.DEV) {
          console.log('✅ Service Worker enregistré:', registration.scope);
        }
        
        // Vérifier les mises à jour en production
        if (import.meta.env.PROD) {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nouvelle version disponible
                  if (confirm('Une nouvelle version est disponible. Recharger maintenant ?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        }
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.log('❌ Échec enregistrement Service Worker:', error);
        }
      });
  });
}

// Gestion des erreurs globales en production
if (import.meta.env.PROD) {
  window.addEventListener('error', (event) => {
    // Logger les erreurs critiques seulement
    if (event.error && !event.error.message?.includes('ResizeObserver')) {
      console.error('Erreur critique:', event.error);
    }
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    // Logger les promesses rejetées
    console.error('Promise rejetée:', event.reason);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);