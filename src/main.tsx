import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { LandingPage } from './components/Landing/LandingPage';
import { PrivacyPolicy } from './components/Legal/PrivacyPolicy';
import { TermsOfService } from './components/Legal/TermsOfService';
import { LoginPage } from './components/Auth/LoginPage';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { isPWA } from './utils/pwaDetection';
import './index.css';

// Composant pour gérer la route racine
function RootRoute() {
  const pwaMode = isPWA();
  
  console.log('🏠 Route racine - Mode PWA:', pwaMode);
  
  // En mode PWA, rediriger vers login
  if (pwaMode) {
    console.log('📱 PWA détecté - Redirection vers /login');
    return <Navigate to="/login" replace />;
  }
  
  // En mode web, afficher la landing page
  console.log('🌐 Web détecté - Affichage landing page');
  return <LandingPage />;
}

// Composant pour bloquer l'accès à la landing page en PWA
function LandingRoute() {
  const pwaMode = isPWA();
  
  console.log('🎯 Route landing - Mode PWA:', pwaMode);
  
  // En mode PWA, rediriger vers login
  if (pwaMode) {
    console.log('🚫 PWA détecté - Blocage landing page, redirection vers /login');
    return <Navigate to="/login" replace />;
  }
  
  // En mode web, afficher la landing page
  return <LandingPage />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Route racine - Landing (web) ou Login (PWA) */}
          <Route path="/" element={<RootRoute />} />
          
          {/* Landing page - accessible uniquement en mode web */}
          <Route path="/landing" element={<LandingRoute />} />
          
          {/* Pages légales - accessibles publiquement */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          
          {/* Login - accessible partout */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Dashboard et autres routes protégées */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
          
          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
