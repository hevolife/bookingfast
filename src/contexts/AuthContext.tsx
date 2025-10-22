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
    // Ne pas vérifier l'auth sur les pages publiques de booking
    if (window.location.pathname.includes('/booking/')) {
      setLoading(false);
      return;
    }

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
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        console.log('🔐 Auth state changed:', _event);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Si c'est un nouveau compte (SIGNED_UP), initialiser les données
        if (_event === 'SIGNED_UP' && session?.user) {
          console.log('🆕 Nouveau compte détecté, initialisation...');
          await initializeNewAccount(session.user.id);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const initializeNewAccount = async (userId: string) => {
    if (!supabase) return;
    
    try {
      console.log('🔧 Initialisation du compte:', userId);
      
      // 1. Créer le profil utilisateur
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: user?.email || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.error('❌ Erreur création profil:', profileError);
      } else {
        console.log('✅ Profil créé');
      }
      
      // 2. Créer les paramètres business par défaut
      const { error: settingsError } = await supabase
        .from('business_settings')
        .upsert({
          user_id: userId,
          business_name: 'Mon Entreprise',
          primary_color: '#3B82F6',
          secondary_color: '#8B5CF6',
          opening_hours: {
            monday: { start: '08:00', end: '18:00', closed: false },
            tuesday: { start: '08:00', end: '18:00', closed: false },
            wednesday: { start: '08:00', end: '18:00', closed: false },
            thursday: { start: '08:00', end: '18:00', closed: false },
            friday: { start: '08:00', end: '18:00', closed: false },
            saturday: { start: '09:00', end: '17:00', closed: false },
            sunday: { start: '09:00', end: '17:00', closed: true }
          },
          buffer_minutes: 15,
          default_deposit_percentage: 30,
          email_notifications: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (settingsError) {
        console.error('❌ Erreur création paramètres:', settingsError);
      } else {
        console.log('✅ Paramètres créés');
      }
      
      console.log('✅ Initialisation terminée');
    } catch (error) {
      console.error('❌ Erreur initialisation compte:', error);
    }
  };

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
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Erreur inscription:', error);
      throw error;
    }
    
    console.log('✅ Inscription réussie');
    
    // Initialiser le compte immédiatement après l'inscription
    if (data.user) {
      await initializeNewAccount(data.user.id);
    }
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
