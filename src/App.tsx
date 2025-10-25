import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TeamProvider } from './contexts/TeamContext';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/Layout/Navbar';
import { LoadingSpinner } from './components/UI/LoadingSpinner';
import { GoogleCalendarCallback } from './components/Admin/GoogleCalendarCallback';
import { PluginGuard } from './components/Plugins/PluginGuard';
import { IframeBookingPage } from './components/IframeBooking/IframeBookingPage';
import { PaymentPage } from './components/PaymentPage/PaymentPage';
import { PaymentSuccess } from './components/PaymentPage/PaymentSuccess';
import { PaymentCancel } from './components/PaymentPage/PaymentCancel';
import { BookingDebug } from './components/IframeBooking/BookingDebug';
import { LandingPage } from './components/Landing/LandingPage';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { PublicRoute } from './components/Auth/PublicRoute';

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
const LoginPage = lazy(() => import('./components/Auth/LoginPage').then(m => ({ default: m.LoginPage })));
const InvoicesPage = lazy(() => import('./components/Invoices/InvoicesPage').then(m => ({ default: m.InvoicesPage })));

function App() {
  return (
    <AuthProvider>
      <TeamProvider>
        <AppRoutes />
      </TeamProvider>
    </AuthProvider>
  );
}

function AppRoutes() {
  const location = useLocation();
  const pathname = location.pathname;

  // 🎯 Pages TOUJOURS publiques (pas de vérification auth)
  const isAlwaysPublicPage = 
    pathname.startsWith('/booking/') ||
    pathname.startsWith('/booking-debug/') ||
    pathname === '/payment' ||
    pathname.startsWith('/payment?') ||
    pathname === '/payment-success' ||
    pathname.startsWith('/payment-success?') ||
    pathname === '/payment-cancel' ||
    pathname.startsWith('/payment-cancel?') ||
    pathname === '/privacy-policy' ||
    pathname === '/terms-of-service' ||
    pathname.includes('/auth/google/callback');

  // Callback OAuth
  if (pathname.includes('/auth/google/callback')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Suspense fallback={<LoadingSpinner />}>
          <GoogleCalendarCallback />
        </Suspense>
      </div>
    );
  }

  // 🎯 Pages TOUJOURS publiques (booking, payment, debug, etc.)
  if (isAlwaysPublicPage) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/booking/:userId" element={<IframeBookingPage />} />
          <Route path="/booking-debug/:bookingId" element={<BookingDebug />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancel" element={<PaymentCancel />} />
        </Routes>
      </Suspense>
    );
  }

  // 🎯 Pages publiques MAIS avec redirection si connecté (login, landing)
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
    return (
      <PublicRoute>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </Suspense>
      </PublicRoute>
    );
  }

  // 🎯 Pages protégées (dashboard, services, etc.)
  return (
    <ProtectedRoute>
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
              <Route path="/invoices" element={<InvoicesPage />} />
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
    </ProtectedRoute>
  );
}

export default App;
