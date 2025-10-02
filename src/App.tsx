import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './components/Auth/LoginPage';
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { CalendarPage } from './components/Calendar/CalendarPage';
import { ServicesPage } from './components/Services/ServicesPage';
import { AdminPage } from './components/Admin/AdminPage';
import { EmailWorkflowPage } from './components/EmailWorkflow/EmailWorkflowPage';
import { ReportsPage } from './components/Reports/ReportsPage';
import { MultiUserSettingsPage } from './components/MultiUser/MultiUserSettingsPage';
import { Navbar } from './components/Layout/Navbar';
import { PluginRoute } from './components/Plugins/PluginRoute';
import { useAuth } from './contexts/AuthContext';

type Page = 'dashboard' | 'calendar' | 'services' | 'admin' | 'emails' | 'reports' | 'multi-user';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'calendar':
        return <CalendarPage />;
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
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="h-[calc(100vh-4rem)] overflow-hidden">
        {renderPage()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
