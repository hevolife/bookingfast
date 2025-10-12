import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { LoginPage } from './components/Auth/LoginPage';
import { LandingPage } from './components/Landing/LandingPage';
import { IframeBookingPage } from './components/IframeBooking/IframeBookingPage';
import { PrivacyPolicy } from './components/Legal/PrivacyPolicy';
import { TermsOfService } from './components/Legal/TermsOfService';
import App from './App';
import './i18n/config';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Routes publiques - SANS AuthProvider wrapper */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          
          {/* Route de réservation publique - CRITIQUE: doit être accessible sans auth */}
          <Route path="/booking/:userId" element={<IframeBookingPage />} />
          
          {/* Callback OAuth Google Calendar */}
          <Route path="/auth/google/callback" element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          } />
          
          {/* Routes protégées - nécessitent authentification */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          } />
          
          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
