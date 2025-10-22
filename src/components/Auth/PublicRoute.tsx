import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../UI/LoadingSpinner';

interface PublicRouteProps {
  children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🌐 PublicRoute - État:', { isAuthenticated, loading });

    // Si l'utilisateur est connecté, rediriger vers /dashboard
    if (!loading && isAuthenticated) {
      console.log('✅ Utilisateur connecté détecté - redirection vers /dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Afficher le loader pendant la vérification
  if (loading) {
    console.log('⏳ PublicRoute - Vérification en cours...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Vérification...</p>
        </div>
      </div>
    );
  }

  // Si connecté, ne rien afficher (redirection en cours)
  if (isAuthenticated) {
    console.log('🚫 PublicRoute - Utilisateur connecté, redirection en cours...');
    return null;
  }

  // ✅ Afficher le contenu si NON connecté
  console.log('✅ PublicRoute - Utilisateur non connecté, affichage de la page publique');
  return <>{children}</>;
}
