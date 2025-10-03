import React, { useState } from 'react';
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { CalendarPage } from './components/Calendar/CalendarPage';
import { ServicesPage } from './components/Services/ServicesPage';
import { AdminPage } from './components/Admin/AdminPage';
import { EmailWorkflowPage } from './components/EmailWorkflow/EmailWorkflowPage';
import { ReportsPage } from './components/Reports/ReportsPage';
import { MultiUserSettingsPage } from './components/MultiUser/MultiUserSettingsPage';
import { POSPage } from './components/POS/POSPage';
import { Navbar } from './components/Layout/Navbar';
import { PluginRoute } from './components/Plugins/PluginRoute';
import { useAuth } from './contexts/AuthContext';

type Page = 'dashboard' | 'calendar' | 'bookings-list' | 'clients' | 'services' | 'admin' | 'emails' | 'reports' | 'multi-user' | 'pos';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'calendar':
        return <CalendarPage view="calendar" />;
      case 'bookings-list':
        return <CalendarPage view="list" />;
      case 'clients':
        return <CalendarPage view="clients" />;
      case 'services':
        return <ServicesPage />;
      case 'admin':
        return <AdminPage />;
      case 'emails':
        return <EmailWorkflowPage />;
      case 'reports':
        return (
          <PluginRoute pluginSlug="reports">
            <ReportsPage />
          </PluginRoute>
        );
      case 'multi-user':
        return (
          <PluginRoute pluginSlug="multi-user">
            <MultiUserSettingsPage />
          </PluginRoute>
        );
      case 'pos':
        return (
          <PluginRoute pluginSlug="pos">
            <POSPage />
          </PluginRoute>
        );
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
      <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="main-content-safe h-full overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
