import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../UI/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Timeout de sécurité pour éviter les blocages infinis
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('⏰ Timeout authentification - déblocage forcé');
        setTimeoutReached(true);
      }
    }, 10000); // 10 secondes max

    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    // Attendre que le chargement soit terminé avant de rediriger
    if ((!loading || timeoutReached) && !isAuthenticated) {
      console.log('🔒 Utilisateur non authentifié - redirection vers login');
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, loading, timeoutReached, navigate]);

  if (loading && !timeoutReached) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Chargement de l'application...</p>
          <p className="text-gray-500 text-sm mt-2">Initialisation en cours...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !timeoutReached) {
    return null;
  }

  if (timeoutReached && !isAuthenticated) {
    navigate('/login', { replace: true });
    return null;
  }

  console.log('✅ Utilisateur authentifié - affichage du contenu protégé');
  return <>{children}</>;
}
