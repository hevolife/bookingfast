import React, { useState } from 'react';
import { TeamProvider } from './contexts/TeamContext';
import { Navbar } from './components/Layout/Navbar';
import { CalendarPage } from './components/Calendar/CalendarPage';
import { ClientsPage } from './components/Clients/ClientsPage';
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { ServicesPage } from './components/Services/ServicesPage';
import { EmailWorkflowPage } from './components/EmailWorkflow/EmailWorkflowPage';
import { AdminPage } from './components/Admin/AdminPage';
import { ReportsPage } from './components/Reports/ReportsPage';
import { MultiUserSettingsPage } from './components/MultiUser/MultiUserSettingsPage';
import { POSPage } from './components/POS/POSPage';
import { PluginsPage } from './components/Plugins/PluginsPage';
import { PluginGuard } from './components/Plugins/PluginGuard';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'bookings-list':
        return <CalendarPage view="list" />;
      case 'clients':
        return <ClientsPage />;
      case 'services':
        return <ServicesPage />;
      case 'emails':
        return <EmailWorkflowPage />;
      case 'admin':
        return <AdminPage />;
      case 'reports':
        return (
          <PluginGuard pluginSlug="reports">
            <ReportsPage />
          </PluginGuard>
        );
      case 'multi-user':
        return (
          <PluginGuard pluginSlug="multi-user">
            <MultiUserSettingsPage />
          </PluginGuard>
        );
      case 'pos':
        return (
          <PluginGuard pluginSlug="pos">
            <POSPage />
          </PluginGuard>
        );
      case 'plugins':
        return <PluginsPage />;
      default:
        return <DashboardPage />;
    }
  };

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
          {renderPage()}
        </main>
      </div>
    </TeamProvider>
  );
}

export default App;
