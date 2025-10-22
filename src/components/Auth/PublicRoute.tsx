import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../UI/LoadingSpinner';

interface PublicRouteProps {
  children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🔍 PublicRoute - État:', { 
      isAuthenticated, 
      loading, 
      pathname: location.pathname 
    });

    // ✅ Si authentifié ET pas en train de charger, rediriger IMMÉDIATEMENT
    if (!loading && isAuthenticated) {
      console.log('🚀 PublicRoute - Utilisateur authentifié détecté, redirection vers /dashboard');
      
      // ✅ Utiliser window.location.href pour forcer la redirection
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, loading, location.pathname]);

  // ✅ Afficher le loader pendant la vérification initiale
  if (loading) {
    console.log('⏳ PublicRoute - Chargement en cours...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Vérification...</p>
        </div>
      </div>
    );
  }

  // ✅ Si authentifié, ne rien afficher (redirection en cours)
  if (isAuthenticated) {
    console.log('⏳ PublicRoute - Redirection en cours...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Redirection...</p>
        </div>
      </div>
    );
  }

  // ✅ Afficher le contenu uniquement si NON authentifié
  console.log('✅ PublicRoute - Utilisateur non authentifié, affichage du contenu');
  return <>{children}</>;
}
