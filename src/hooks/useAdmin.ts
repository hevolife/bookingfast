import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, SubscriptionPlan, UserSubscription, AccessCode, CodeRedemption } from '../types/admin';
import { useAuth } from '../contexts/AuthContext';

export function useAdmin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [redemptions, setRedemptions] = useState<CodeRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = async (): Promise<boolean> => {
    if (!isSupabaseConfigured() || !currentUser) return false;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_super_admin')
        .eq('id', currentUser.id)
        .maybeSingle();
      
      return !error && data?.is_super_admin === true;
    } catch (error) {
      console.error('Erreur vérification super admin:', error);
      return false;
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('🔄 Chargement des utilisateurs...');
      
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase non configuré');
      }
      
      // Charger directement depuis la table users
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Erreur chargement utilisateurs: ${error.message}`);
      }
      
      console.log('✅ Utilisateurs chargés:', users.length);
      console.log('📋 Liste des utilisateurs:', users.map(u => ({ 
        email: u.email, 
        is_super_admin: u.is_super_admin,
        subscription_status: u.subscription_status 
      })));
      
      setUsers(users);
    } catch (err) {
      console.error('❌ Erreur chargement utilisateurs:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setUsers([]);
    }
  };
  
  const fetchSubscriptions = async () => {
    try {
      if (!isSupabaseConfigured()) {
        setSubscriptions([]);
        return;
      }
      
      // Table user_subscriptions vide - pas d'abonnements Stripe
      console.log('ℹ️ Table user_subscriptions vide - système basé sur codes d\'accès uniquement');
      setSubscriptions([]);
    } catch (err) {
      console.error('❌ Erreur chargement abonnements:', err);
      setSubscriptions([]);
    }
  };

  const fetchSubscriptionPlans = async () => {
    try {
      if (!isSupabaseConfigured()) {
        const defaultPlans: SubscriptionPlan[] = [
          {
            id: 'monthly',
            name: 'Plan Mensuel',
            description: 'Accès complet mensuel',
            price_monthly: 59.99,
            features: ['Réservations illimitées', 'Gestion des clients', 'Paiements en ligne', 'Workflows email', 'Support email'],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'yearly',
            name: 'Plan Annuel',
            description: 'Accès complet annuel avec réduction',
            price_monthly: 41.67,
            price_yearly: 499.99,
            features: ['Tout du plan mensuel', '2 mois gratuits', 'Support prioritaire', 'Fonctionnalités avancées', 'Accès aux bêtas'],
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setSubscriptionPlans(defaultPlans);
        return;
      }
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) {
        console.error('❌ Erreur chargement plans:', error);
        setSubscriptionPlans([]);
        return;
      }
      
      setSubscriptionPlans(data || []);
      console.log('✅ Plans d\'abonnement chargés:', data?.length || 0);
    } catch (err) {
      console.error('❌ Erreur chargement plans:', err);
      setSubscriptionPlans([]);
    }
  };

  const updateUserStatus = async (userId: string, updates: Partial<User>) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');
    
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === userId ? data : u));
      return data;
    } catch (err) {
      console.error('Erreur mise à jour utilisateur:', err);
      throw err;
    }
  };

  const fetchAccessCodes = async () => {
    try {
      if (!isSupabaseConfigured()) {
        setAccessCodes([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        console.error('❌ Erreur chargement codes d\'accès:', error);
        setAccessCodes([]);
        return;
      }
      
      setAccessCodes(data || []);
      console.log('✅ Codes d\'accès chargés:', data?.length || 0);
    } catch (err) {
      console.error('❌ Erreur chargement codes d\'accès:', err);
      setAccessCodes([]);
    }
  };

  const fetchRedemptions = async () => {
    try {
      if (!isSupabaseConfigured()) {
        setRedemptions([]);
        return;
      }
      
      // Vérifier d'abord si la table code_redemptions a des données
      const { count, error: countError } = await supabase
        .from('code_redemptions')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('❌ Erreur vérification table code_redemptions:', countError);
        setRedemptions([]);
        return;
      }

      if (!count || count === 0) {
        console.log('✅ Aucune utilisation de code trouvée (table vide)');
        setRedemptions([]);
        return;
      }

      // Si la table a des données, charger avec jointures simples
      const { data: redemptionsData, error: redemptionsError } = await supabase
        .from('code_redemptions')
        .select(`
          id,
          code_id,
          user_id,
          redeemed_at,
          access_granted_until,
          created_at,
          updated_at
        `)
        .order('redeemed_at', { ascending: false })
        .limit(1000);

      if (redemptionsError) {
        console.error('❌ Erreur chargement utilisations codes:', redemptionsError);
        setRedemptions([]);
        return;
      }

      if (!redemptionsData || redemptionsData.length === 0) {
        setRedemptions([]);
        return;
      }

      // Charger les codes et utilisateurs séparément pour éviter les erreurs de relation
      const codeIds = [...new Set(redemptionsData.map(r => r.code_id))];
      const userIds = [...new Set(redemptionsData.map(r => r.user_id))];

      const [codesResult, usersResult] = await Promise.all([
        supabase.from('access_codes').select('*').in('id', codeIds),
        supabase.from('users').select('id, email, full_name').in('id', userIds)
      ]);

      const codesData = codesResult.data || [];
      const usersData = usersResult.data || [];

      // Enrichir les données manuellement
      const enrichedRedemptions = redemptionsData.map(redemption => ({
        ...redemption,
        code: codesData.find(c => c.id === redemption.code_id) || null,
        user: usersData.find(u => u.id === redemption.user_id) || null
      }));

      setRedemptions(enrichedRedemptions);
      console.log('✅ Utilisations codes chargées:', enrichedRedemptions.length);
    } catch (err) {
      console.error('❌ Erreur chargement utilisations codes:', err);
      setRedemptions([]);
    }
  };

  const createAccessCode = async (codeData: Omit<AccessCode, 'id' | 'created_at' | 'updated_at' | 'current_uses'>) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');
    
    try {
      const { data, error } = await supabase
        .from('access_codes')
        .insert({
          ...codeData,
          created_by: currentUser?.id,
          current_uses: 0
        })
        .select()
        .single();

      if (error) throw error;
      
      setAccessCodes(prev => [data, ...prev]);
      console.log('✅ Code d\'accès créé:', data.code);
      return data;
    } catch (err) {
      console.error('Erreur création code d\'accès:', err);
      throw err;
    }
  };

  const redeemAccessCode = async (code: string) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');
    if (!currentUser) throw new Error('Utilisateur non connecté');
    
    try {
      console.log('🔄 Utilisation du code:', code);
      
      // Vérifier que le code existe et est actif
      const { data: accessCode, error: codeError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (codeError || !accessCode) {
        throw new Error('Code d\'accès invalide ou expiré');
      }

      console.log('✅ Code trouvé:', accessCode.code);

      // Vérifier si le code n'a pas déjà été utilisé par cet utilisateur
      const { data: existingRedemption } = await supabase
        .from('code_redemptions')
        .select('id')
        .eq('code_id', accessCode.id)
        .eq('user_id', currentUser.id)
        .single();

      if (existingRedemption) {
        throw new Error('Ce code a déjà été utilisé par votre compte');
      }

      // Vérifier si le code n'a pas atteint sa limite d'utilisation
      if (accessCode.current_uses >= accessCode.max_uses) {
        throw new Error('Ce code a atteint sa limite d\'utilisation');
      }

      // Vérifier si le code n'a pas expiré
      if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
        throw new Error('Ce code a expiré');
      }

      // Calculer la date de fin d'accès
      let accessGrantedUntil = null;
      if (accessCode.access_type !== 'lifetime') {
        const now = new Date();
        switch (accessCode.access_type) {
          case 'days':
            accessGrantedUntil = new Date(now.getTime() + (accessCode.access_duration || 0) * 24 * 60 * 60 * 1000);
            break;
          case 'weeks':
            accessGrantedUntil = new Date(now.getTime() + (accessCode.access_duration || 0) * 7 * 24 * 60 * 60 * 1000);
            break;
          case 'months':
            accessGrantedUntil = new Date(now.getTime() + (accessCode.access_duration || 0) * 30 * 24 * 60 * 60 * 1000);
            break;
        }
      }

      // Créer l'entrée de rédemption
      const { error: redemptionError } = await supabase
        .from('code_redemptions')
        .insert({
          code_id: accessCode.id,
          user_id: currentUser.id,
          access_granted_until: accessGrantedUntil?.toISOString()
        });

      if (redemptionError) throw redemptionError;

      // Mettre à jour le statut de l'utilisateur selon le type de code
      let newSubscriptionStatus = 'active';
      let newTrialEndsAt = null;
      
      if (accessCode.access_type === 'lifetime') {
        // Accès à vie
        newSubscriptionStatus = 'active';
        newTrialEndsAt = null; // Pas de limite
        console.log('🎯 Code à vie utilisé - accès permanent accordé');
      } else {
        // Accès temporaire
        newSubscriptionStatus = 'trial'; // Garder en trial mais avec une nouvelle date de fin
        newTrialEndsAt = accessGrantedUntil?.toISOString() || null;
        console.log('⏰ Code temporaire utilisé - accès jusqu\'au:', newTrialEndsAt);
      }
      
      const userUpdates: any = {
        subscription_status: newSubscriptionStatus,
        trial_ends_at: newTrialEndsAt,
        updated_at: new Date().toISOString()
      };

      console.log('🔄 Mise à jour utilisateur avec:', userUpdates);
      
      const { error: userError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', currentUser.id);

      if (userError) {
        console.error('❌ Erreur mise à jour utilisateur:', userError);
        throw userError;
      }
      
      console.log('✅ Statut utilisateur mis à jour');
      
      // Forcer le rechargement des données utilisateur
      console.log('🔄 Rechargement des données utilisateur...');
      const { data: updatedUserData, error: refreshError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      if (!refreshError && updatedUserData) {
        console.log('✅ Données utilisateur rechargées:', {
          subscription_status: updatedUserData.subscription_status,
          trial_ends_at: updatedUserData.trial_ends_at
        });
      }
      
      // Incrémenter le compteur d'utilisation du code
      const { error: updateError } = await supabase
        .from('access_codes')
        .update({
          current_uses: accessCode.current_uses + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', accessCode.id);

      if (updateError) throw updateError;

      // Recharger toutes les données pour refléter les changements
      await fetchAllData();
      
      console.log('✅ Code utilisé avec succès');
      return true;
    } catch (err) {
      console.error('❌ Erreur utilisation code d\'accès:', err);
      throw err;
    }
  };

  const deleteUser = async (userId: string) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');
    
    try {
      // Utiliser le gestionnaire côté client
      const { ClientAuthManager } = await import('../lib/clientAuth');
      await ClientAuthManager.deleteUser(userId);
    
      setUsers(prev => prev.filter(u => u.id !== userId));
      console.log('✅ Utilisateur supprimé avec succès');
    } catch (err) {
      console.error('Erreur suppression utilisateur:', err);
      throw err;
    }
  };

  const createSubscription = async (userId: string, planId: string) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');
    
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 jours
        })
        .select(`
          *,
          plan:subscription_plans(*),
          user:users(id, email, full_name)
        `)
        .single();

      if (error) throw error;
      
      setSubscriptions(prev => [data, ...prev]);
      
      // Mettre à jour le statut de l'utilisateur
      await updateUserStatus(userId, { subscription_status: 'active' });
      
      return data;
    } catch (err) {
      console.error('Erreur création abonnement:', err);
      throw err;
    }
  };

  const cancelSubscription = async (subscriptionId: string) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase non configuré');
    
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .select(`
          *,
          plan:subscription_plans(*),
          user:users(id, email, full_name)
        `)
        .single();

      if (error) throw error;
      
      setSubscriptions(prev => prev.map(s => s.id === subscriptionId ? data : s));
      return data;
    } catch (err) {
      console.error('Erreur annulation abonnement:', err);
      throw err;
    }
  };

  const checkUserAccess = async (userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) return true; // Mode démo
    
    try {
      const { data, error } = await supabase.rpc('check_user_access', { user_id: userId });
      
      if (error) {
        console.error('Erreur vérification accès:', error);
        return false;
      }
      
      return data === true;
    } catch (err) {
      console.error('Erreur vérification accès:', err);
      return false;
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchUsers(),
        fetchSubscriptions(),
        fetchSubscriptionPlans(),
        fetchAccessCodes(),
        fetchRedemptions()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  return {
    users,
    subscriptions,
    subscriptionPlans,
    accessCodes,
    redemptions,
    loading,
    error,
    isSuperAdmin,
    createAccessCode,
    redeemAccessCode,
    updateUserStatus,
    deleteUser,
    createSubscription,
    cancelSubscription,
    checkUserAccess,
    refetch: fetchAllData
  };
}