import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        console.log('🔐 Auth state changed:', _event);
        setSession(session);
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase non configuré');
    
    console.log('🔑 Tentative de connexion pour:', email);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Erreur connexion:', error);
      throw error;
    }
    
    console.log('✅ Connexion réussie');
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase non configuré');
    
    console.log('📝 Tentative d\'inscription pour:', email);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Erreur inscription:', error);
      throw error;
    }
    
    console.log('✅ Inscription réussie');
  };

  const signOut = async () => {
    if (!supabase) {
      console.error('❌ Supabase non configuré');
      throw new Error('Supabase non configuré');
    }

    try {
      console.log('🚪 Déconnexion en cours...');

      const { error } = await supabase.auth.signOut({ 
        scope: 'local' 
      });

      if (error) {
        console.error('❌ Erreur lors de la déconnexion:', error);
        
        if (error.message?.includes('session') || error.message?.includes('Session')) {
          console.warn('⚠️ Session manquante, nettoyage local forcé');
          localStorage.removeItem('bookingfast-auth');
          setSession(null);
          setUser(null);
          window.location.href = '/';
          return;
        }
        
        throw error;
      }

      console.log('✅ Déconnexion réussie');
      setSession(null);
      setUser(null);
      window.location.href = '/';
      
    } catch (error) {
      console.error('❌ Erreur critique lors de la déconnexion:', error);
      localStorage.removeItem('bookingfast-auth');
      setSession(null);
      setUser(null);
      window.location.href = '/';
    }
  };

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
