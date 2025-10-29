import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { isPWA } from './utils/pwaDetection';
import { initViewportHeight } from './utils/viewportHeight';

console.log('🚀 APPLICATION DÉMARRAGE');
console.log('📍 URL actuelle:', window.location.href);
console.log('📍 Pathname:', window.location.pathname);
console.log('📱 Mode PWA:', isPWA());

// CRITICAL: Initialize dynamic viewport height for PWA
initViewportHeight();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

console.log('✅ Application montée');
