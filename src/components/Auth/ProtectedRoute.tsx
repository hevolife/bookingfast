import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../UI/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 🎯 Pages publiques qui ne nécessitent PAS d'authentification
    const isPublicPage = 
      location.pathname === '/' ||
      location.pathname === '/login' ||           // ← AJOUT CRITIQUE
      location.pathname === '/signup' ||          // ← AJOUT CRITIQUE
      location.pathname.includes('/booking/') ||
      location.pathname === '/payment' ||
      location.pathname === '/privacy-policy' ||
      location.pathname === '/terms-of-service';

    // Ne pas rediriger si on est sur une page publique
    if (isPublicPage) {
      return;
    }

    // Rediriger vers /login si non authentifié ET pas sur une page publique
    if (!loading && !isAuthenticated) {
      console.log('🔒 Utilisateur non authentifié - redirection vers /login');
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [isAuthenticated, loading, navigate, location]);

  // Afficher le loader pendant la vérification
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Vérification...</p>
        </div>
      </div>
    );
  }

  // 🎯 Vérifier si on est sur une page publique
  const isPublicPage = 
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname.includes('/booking/') ||
    location.pathname === '/payment' ||
    location.pathname === '/privacy-policy' ||
    location.pathname === '/terms-of-service';

  // Si non authentifié ET pas sur une page publique, ne rien afficher (redirection en cours)
  if (!isAuthenticated && !isPublicPage) {
    return null;
  }

  // Afficher le contenu
  return <>{children}</>;
}
