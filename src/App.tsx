import React, { useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TeamProvider } from './contexts/TeamContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { LoginPage } from './components/Auth/LoginPage';
import { SuperAdminPage } from './components/SuperAdmin/SuperAdminPage';
import { CalendarPage } from './components/Calendar/CalendarPage';
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { ServicesPage } from './components/Services/ServicesPage';
import { AdminPage } from './components/Admin/AdminPage';
import { EmailWorkflowPage } from './components/EmailWorkflow/EmailWorkflowPage';
import { PaymentPage } from './components/PaymentPage/PaymentPage';
import { PaymentSuccess } from './components/PaymentPage/PaymentSuccess';
import { PaymentCancel } from './components/PaymentPage/PaymentCancel';
import { ResetPasswordPage } from './components/Auth/ResetPasswordPage';
import { LandingPage } from './components/Landing/LandingPage';
import { IframeBookingPage } from './components/IframeBooking/IframeBookingPage';
import { Navbar } from './components/Layout/Navbar';
import { PWAInstallPrompt } from './components/Layout/PWAInstallPrompt';

type Page = 'dashboard' | 'calendar' | 'services' | 'admin' | 'emails' | 'superadmin';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  // Synchroniser currentPage avec l'URL
  React.useEffect(() => {
    const path = location.pathname;
    if (path === '/dashboard') setCurrentPage('dashboard');
    else if (path === '/calendar') setCurrentPage('calendar');
    else if (path === '/services') setCurrentPage('services');
    else if (path === '/admin') setCurrentPage('admin');
    else if (path === '/emails') setCurrentPage('emails');
    else if (path === '/superadmin') setCurrentPage('superadmin');
  }, [location.pathname]);

  const handlePageChange = (page: Page) => {
    const routes = {
      dashboard: '/dashboard',
      calendar: '/calendar',
      services: '/services',
      admin: '/admin',
      emails: '/emails',
      superadmin: '/superadmin'
    };
    
    navigate(routes[page]);
    setCurrentPage(page);
  };

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
      case 'superadmin':
        return <SuperAdminPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Routes>
      {/* Page d'accueil publique */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Page d'inscription avec code d'affiliation */}
      <Route path="/register" element={<LoginPage />} />
      
      {/* Landing page accessible via /landing */}
      <Route path="/landing" element={<LandingPage />} />
      
      {/* Page de connexion */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Page de réinitialisation de mot de passe */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Pages de paiement sans navbar et sans authentification */}
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-cancel" element={<PaymentCancel />} />
      
      {/* Page de réservation iframe publique */}
      <Route path="/booking/:userId" element={<IframeBookingPage />} />
      
      {/* Application principale protégée avec navigation SPA */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <div className="min-h-screen-safe bg-gray-50">
            <Navbar currentPage={currentPage} onPageChange={handlePageChange} />
            <main className="main-content-safe">
              <DashboardPage />
            </main>
          </div>
        </ProtectedRoute>
      } />
      
      <Route path="/calendar" element={
        <ProtectedRoute>
          <div className="min-h-screen-safe bg-gray-50">
            <Navbar currentPage={currentPage} onPageChange={handlePageChange} />
            <main className="main-content-safe">
              <CalendarPage />
            </main>
          </div>
        </ProtectedRoute>
      } />
      
      <Route path="/services" element={
        <ProtectedRoute>
          <div className="min-h-screen-safe bg-gray-50">
            <Navbar currentPage={currentPage} onPageChange={handlePageChange} />
            <main className="main-content-safe">
              <ServicesPage />
            </main>
          </div>
        </ProtectedRoute>
      } />
      
      <Route path="/admin" element={
        <ProtectedRoute>
          <div className="min-h-screen-safe bg-gray-50">
            <Navbar currentPage={currentPage} onPageChange={handlePageChange} />
            <main className="main-content-safe">
              <AdminPage />
            </main>
          </div>
        </ProtectedRoute>
      } />
      
      <Route path="/emails" element={
        <ProtectedRoute>
          <div className="min-h-screen-safe bg-gray-50">
            <Navbar currentPage={currentPage} onPageChange={handlePageChange} />
            <main className="main-content-safe">
              <EmailWorkflowPage />
            </main>
          </div>
        </ProtectedRoute>
      } />
      
      <Route path="/superadmin" element={
        <ProtectedRoute>
          <div className="min-h-screen-safe bg-gray-50">
            <Navbar currentPage={currentPage} onPageChange={handlePageChange} />
            <main className="main-content-safe">
              <SuperAdminPage />
            </main>
          </div>
        </ProtectedRoute>
      } />
      
      {/* Fallback - rediriger vers login si route inconnue */}
      <Route path="*" element={
        <div className="min-h-screen-safe bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center safe-all">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full animate-spin border-t-transparent mx-auto"></div>
            <p className="text-gray-600 text-lg">Redirection...</p>
          </div>
        </div>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <TeamProvider>
        <PWAInstallPrompt />
        <AppContent />
      </TeamProvider>
    </AuthProvider>
  );
}

export default App;