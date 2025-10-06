import React, { useState, useEffect, lazy, Suspense } from 'react';
import { TeamProvider } from './contexts/TeamContext';
import { Navbar } from './components/Layout/Navbar';
import { LoadingSpinner } from './components/UI/LoadingSpinner';
import { GoogleCalendarCallback } from './components/Admin/GoogleCalendarCallback';

// Lazy load pages for better code splitting
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
const PluginGuard = lazy(() => import('./components/Plugins/PluginGuard').then(m => ({ default: m.PluginGuard })));

type PageType = 'dashboard' | 'calendar' | 'bookings-list' | 'clients' | 'services' | 'emails' | 'admin' | 'reports' | 'multi-user' | 'pos' | 'plugins';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);

  // Détecter le callback OAuth Google Calendar
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const path = window.location.pathname;

    // Si on est sur /auth/google/callback avec un code, c'est le callback OAuth
    if ((path === '/auth/google/callback' || path.includes('/auth/google/callback')) && code && state) {
      console.log('🔍 Callback OAuth détecté:', { code: code.substring(0, 20) + '...', state });
      setIsOAuthCallback(true);
    }
  }, []);

  const renderPage = () => {
    const pageComponents: Record<PageType, React.ReactNode> = {
      dashboard: <DashboardPage />,
      calendar: <CalendarPage />,
      'bookings-list': <CalendarPage view="list" />,
      clients: <ClientsPage />,
      services: <ServicesPage />,
      emails: <EmailWorkflowPage />,
      admin: <AdminPage />,
      reports: (
        <PluginGuard pluginSlug="reports">
          <ReportsPage />
        </PluginGuard>
      ),
      'multi-user': (
        <PluginGuard pluginSlug="multi-user">
          <MultiUserSettingsPage />
        </PluginGuard>
      ),
      pos: (
        <PluginGuard pluginSlug="pos">
          <POSPage />
        </PluginGuard>
      ),
      plugins: <PluginsPage />
    };

    return pageComponents[currentPage] || <DashboardPage />;
  };

  // Si c'est un callback OAuth, afficher le composant de callback
  if (isOAuthCallback) {
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

  return (
    <TeamProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />
        <main 
          className="flex-1 overflow-y-auto scrollable-area"
          style={{ 
            paddingTop: 0,
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y'
          }}
        >
          <Suspense fallback={<LoadingSpinner />}>
            {renderPage()}
          </Suspense>
        </main>
      </div>
    </TeamProvider>
  );
}

export default App;
