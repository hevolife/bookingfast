import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { TeamProvider } from './contexts/TeamContext';
import { Navbar } from './components/Layout/Navbar';
import { LoadingSpinner } from './components/UI/LoadingSpinner';
import { GoogleCalendarCallback } from './components/Admin/GoogleCalendarCallback';
import { PluginGuard } from './components/Plugins/PluginGuard';
import { IframeBookingPage } from './components/IframeBooking/IframeBookingPage';

const DashboardPage = lazy(() => import('./components/Dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CalendarPage = lazy(() => import('./components/Calendar/CalendarPage').then(m => ({ default: m.CalendarPage })));
const ClientsPage = lazy(() => import('./components/Clients/ClientsPage').then(m => ({ default: m.ClientsPage })));
const ServicesPage = lazy(() => import('./components/Services/ServicesPage').then(m => ({ default: m.ServicesPage })));
const EmailWorkflowPage = lazy(() => import('./components/EmailWorkflow/EmailWorkflowPage').then(m => ({ default: m.EmailWorkflowPage })));
const AdminPage = lazy(() => import('./components/Admin/AdminPage').then(m => ({ default: m.AdminPage })));
const ReportsPage = lazy(() => import('./components/Reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const MultiUserSettingsPage = lazy(() => import('./components/MultiUser/MultiUserSettingsPage').then(m => ({ default: m.MultiUserSettingsPage })));
const POSPage = lazy(() => import('./components/POS/POSPage').then(m => ({ default: m.POSPage })));
const PluginsPage = lazy(() => import('./components/Plugins/PluginsPage').then(m => ({ default: m.PluginsPage })));

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Détecter le callback OAuth Google Calendar
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const path = window.location.pathname;

    if ((path === '/auth/google/callback' || path.includes('/auth/google/callback')) && code && state) {
      // Laisser le composant GoogleCalendarCallback gérer le callback
      return;
    }
  }, []);

  // Rediriger vers /dashboard si on est sur la racine (mais pas pour les pages publiques)
  useEffect(() => {
    if (location.pathname === '/' && !location.pathname.includes('/booking/')) {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Si c'est un callback OAuth, afficher le composant de callback
  if (location.pathname.includes('/auth/google/callback')) {
    return (
      <TeamProvider>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          <Suspense fallback={<LoadingSpinner />}>
            <GoogleCalendarCallback />
          </Suspense>
        </div>
      </TeamProvider>
    );
  }

  // Si c'est une page de booking publique, afficher sans navbar
  if (location.pathname.includes('/booking/')) {
    return (
      <TeamProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/booking/:userId" element={<IframeBookingPage />} />
          </Routes>
        </Suspense>
      </TeamProvider>
    );
  }

  return (
    <TeamProvider>
      <div className="app-container flex flex-col h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Navbar />
        <main 
          className="flex-1 overflow-y-auto scrollable-area"
          style={{ 
            paddingTop: 0,
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y'
          }}
        >
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/bookings-list" element={<CalendarPage view="list" />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/emails" element={<EmailWorkflowPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/reports" element={
                <PluginGuard pluginSlug="reports">
                  <ReportsPage />
                </PluginGuard>
              } />
              <Route path="/multi-user" element={
                <PluginGuard pluginSlug="multi-user">
                  <MultiUserSettingsPage />
                </PluginGuard>
              } />
              <Route path="/pos" element={
                <PluginGuard pluginSlug="pos">
                  <POSPage />
                </PluginGuard>
              } />
              <Route path="/plugins" element={<PluginsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </TeamProvider>
  );
}

export default App;
