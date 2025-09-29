import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = () => {
    console.log('🧹 Nettoyage de l\'état d\'authentification');
    setSession(null);
    setUser(null);
    
    try {
      // Nettoyer le localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Nettoyer le sessionStorage
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      console.log('✅ Nettoyage du stockage terminé');
    } catch (error) {
      console.warn('⚠️ Erreur lors du nettoyage du stockage:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      if (!isSupabaseConfigured()) {
        console.log('🔧 Mode démo - pas d\'authentification Supabase');
        if (mounted) {
          setUser({ id: 'demo', email: 'demo@example.com' } as User);
          setSession({ user: { id: 'demo', email: 'demo@example.com' } } as Session);
          setLoading(false);
        }
        return;
      }

      try {
        // Timeout pour éviter les blocages
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('⏰ Timeout authentification - passage en mode démo');
            setUser({ id: 'demo', email: 'demo@example.com' } as User);
            setSession({ user: { id: 'demo', email: 'demo@example.com' } } as Session);
            setLoading(false);
          }
        }, 8000);

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        if (error) {
          console.error('❌ Erreur récupération session:', error);
          clearAuthState();
        } else if (mounted) {
          console.log('📊 Session récupérée:', session?.user?.email || 'Aucune session');
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        console.error('❌ Erreur initialisation auth:', error);
        if (mounted) {
          clearAuthState();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Écouter les changements d'authentification
    let subscription: any = null;
    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        console.log('🔐 Auth state changed:', event, session?.user?.email || 'No user');
        
        switch (event) {
          case 'SIGNED_IN':
            console.log('✅ Utilisateur connecté');
            setSession(session);
            setUser(session?.user ?? null);
            break;
            
          case 'SIGNED_OUT':
            console.log('👋 Utilisateur déconnecté');
            clearAuthState();
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token rafraîchi');
            setSession(session);
            setUser(session?.user ?? null);
            break;
            
          case 'SIGNED_UP':
            console.log('👤 Nouvel utilisateur inscrit');
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
              await createUserProfile(session.user);
            }
            break;
            
          default:
            console.log('ℹ️ Événement auth non géré:', event);
        }
        
        setLoading(false);
      });
      
      subscription = data.subscription;
    }

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const createUserProfile = async (authUser: User) => {
    if (!isSupabaseConfigured()) return;

    try {
      console.log('📝 Création du profil pour:', authUser.email);
      
      // Calculer la date de fin d'essai (7 jours)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7 jours
      
      const { error } = await supabase
        .from('users')
        .insert([{
          id: authUser.id,
          email: authUser.email!,
          full_name: authUser.user_metadata?.full_name || null,
          subscription_status: 'trial',
          trial_started_at: new Date().toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error && !error.message.includes('duplicate key')) {
        console.error('❌ Erreur création profil:', error);
      } else {
        console.log('✅ Profil utilisateur créé avec essai gratuit de 7 jours');
      }
    } catch (error) {
      console.error('❌ Erreur inattendue création profil:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    console.log('🔑 Tentative de connexion pour:', email);
    console.log('🔗 URL Supabase utilisée:', import.meta.env.VITE_SUPABASE_URL);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('❌ Erreur de connexion détaillée:', {
          message: error.message,
          status: error.status,
          details: error
        });
        
        // Améliorer les messages d'erreur
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email ou mot de passe incorrect. Vérifiez vos identifiants.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Veuillez confirmer votre email avant de vous connecter.');
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Trop de tentatives. Veuillez patienter quelques minutes.');
        } else if (error.message.includes('fetch')) {
          throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion internet et la configuration Supabase.');
        } else {
          throw new Error(`Erreur d'authentification: ${error.message}`);
        }
      }

      console.log('✅ Connexion réussie pour:', data.user?.email);
    } catch (networkError: any) {
      console.error('❌ Erreur réseau lors de la connexion:', networkError);
      
      if (networkError.message && !networkError.message.includes('Erreur d\'authentification:')) {
        throw new Error('Impossible de se connecter au serveur Supabase. Vérifiez que votre instance self-hosted est accessible.');
      }
      
      throw networkError;
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    console.log('🚀 Tentative d\'inscription pour:', email);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: undefined
      }
    });

    if (error) {
      console.error('❌ Erreur d\'inscription:', error);
      throw error;
    }

    console.log('✅ Inscription réussie pour:', data.user?.email);
  };

  const signOut = async () => {
    console.log('🚪 Début de la déconnexion...');
    
    try {
      if (isSupabaseConfigured()) {
        console.log('🔄 Déconnexion Supabase...');
        
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        
        if (error) {
          console.warn('⚠️ Erreur déconnexion Supabase (continuons quand même):', error.message);
        } else {
          console.log('✅ Déconnexion Supabase réussie');
        }
      }
    } catch (error) {
      console.warn('⚠️ Erreur réseau déconnexion (continuons quand même):', error);
    }
    
    clearAuthState();
    console.log('✅ État local nettoyé');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('🔄 Redirection vers /login...');
    window.location.href = '/login';
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user || !isSupabaseConfigured(),
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