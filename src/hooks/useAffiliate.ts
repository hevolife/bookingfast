import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Affiliate, AffiliateReferral, AffiliateCommission, AffiliateSettings } from '../types/affiliate';

export function useAffiliate() {
  const { user, session } = useAuth();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<AffiliateReferral[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [settings, setSettings] = useState<AffiliateSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const enrichWithUserData = async (referrals: any[]) => {
    if (!referrals.length || !supabase) return referrals;

    // Collecter tous les IDs utilisateur uniques
    const userIds = [...new Set(referrals.map(r => r.referred_user_id).filter(Boolean))];
    
    if (!userIds.length) return referrals;

    // Récupérer les données utilisateur
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .in('id', userIds);

    if (error) {
      console.error('Erreur chargement utilisateurs:', error);
      return referrals;
    }

    // Enrichir les parrainages avec les données utilisateur
    return referrals.map(referral => ({
      ...referral,
      referred_user: users?.find(u => u.id === referral.referred_user_id) || null
    }));
  };

  const enrichCommissionsWithUserData = async (commissions: any[]) => {
    if (!commissions.length || !supabase) return commissions;

    // Collecter tous les IDs utilisateur uniques depuis les referrals
    const userIds = [...new Set(
      commissions
        .map(c => c.referral?.referred_user_id)
        .filter(Boolean)
    )];
    
    if (!userIds.length) return commissions;

    // Récupérer les données utilisateur
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .in('id', userIds);

    if (error) {
      console.error('Erreur chargement utilisateurs pour commissions:', error);
      return commissions;
    }

    // Enrichir les commissions avec les données utilisateur
    return commissions.map(commission => ({
      ...commission,
      referral: commission.referral ? {
        ...commission.referral,
        referred_user: users?.find(u => u.id === commission.referral.referred_user_id) || null
      } : null
    }));
  };

  const fetchAffiliateData = async () => {
    if (!user || !session || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Récupérer les paramètres d'affiliation
      const { data: settingsData, error: settingsError } = await supabase
        .from('affiliate_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (settingsError) {
        console.warn('Paramètres d\'affiliation non trouvés');
      } else {
        setSettings(settingsData);
      }

      // Récupérer ou créer le compte d'affiliation
      let { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (affiliateError && affiliateError.code === 'PGRST116') {
        // Créer un nouveau compte d'affiliation via Edge Function
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-affiliate-account`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: user.id })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur création compte affiliation');
        }

        // Récupérer le compte créé
        const { data: createdAffiliate, error: fetchError } = await supabase
          .from('affiliates')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        affiliateData = createdAffiliate;
      } else if (affiliateError) {
        throw affiliateError;
      }

      setAffiliate(affiliateData);

      if (affiliateData) {
        // Récupérer les parrainages
        const { data: rawReferrals, error: referralsError } = await supabase
          .from('affiliate_referrals')
          .select('*')
          .eq('affiliate_id', affiliateData.id)
          .order('created_at', { ascending: false });

        if (referralsError) {
          console.error('Erreur chargement parrainages:', referralsError);
        } else {
          // Enrichir avec les données utilisateur
          const enrichedReferrals = await enrichWithUserData(rawReferrals || []);
          setReferrals(enrichedReferrals);
        }

        // Récupérer les commissions
        const { data: rawCommissions, error: commissionsError } = await supabase
          .from('affiliate_commissions')
          .select(`
            *,
            referral:affiliate_referrals(*)
          `)
          .eq('affiliate_id', affiliateData.id)
          .order('commission_month', { ascending: false });

        if (commissionsError) {
          console.error('Erreur chargement commissions:', commissionsError);
        } else {
          // Enrichir avec les données utilisateur
          const enrichedCommissions = await enrichCommissionsWithUserData(rawCommissions || []);
          setCommissions(enrichedCommissions);
        }
      }

    } catch (err) {
      console.error('Erreur chargement données affiliation:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const createAffiliateAccount = async () => {
    if (!user || !session || !supabase) {
      throw new Error('Utilisateur non connecté ou Supabase non configuré');
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-affiliate-account`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur création compte affiliation');
      }

      const data = await response.json();
      await fetchAffiliateData();
      return data;
    } catch (err) {
      console.error('Erreur création compte affiliation:', err);
      throw err;
    }
  };

  const getAffiliateLink = () => {
    if (!affiliate) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/register?ref=${affiliate.affiliate_code}`;
  };

  const getAffiliateHtmlCode = () => {
    if (!affiliate) return '';
    
    const affiliateLink = getAffiliateLink();
    
    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
  <div style="background: white; padding: 40px; border-radius: 15px; margin-bottom: 20px;">
    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); border-radius: 20px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
      <span style="color: white; font-size: 32px; font-weight: bold;">📅</span>
    </div>
    
    <h1 style="color: #1f2937; font-size: 32px; font-weight: bold; margin: 0 0 15px 0; background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
      BookingFast
    </h1>
    
    <h2 style="color: #374151; font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">
      Révolutionnez votre Gestion de Réservations
    </h2>
    
    <p style="color: #6b7280; font-size: 18px; line-height: 1.6; margin: 0 0 30px 0;">
      La solution tout-en-un pour gérer vos rendez-vous, automatiser vos paiements et enchanter vos clients.
    </p>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; text-align: left;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #10b981; font-size: 20px;">✓</span>
        <span style="color: #374151; font-size: 14px;">Planning intelligent</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #10b981; font-size: 20px;">✓</span>
        <span style="color: #374151; font-size: 14px;">Paiements sécurisés</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #10b981; font-size: 20px;">✓</span>
        <span style="color: #374151; font-size: 14px;">Emails automatiques</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #10b981; font-size: 20px;">✓</span>
        <span style="color: #374151; font-size: 14px;">Gestion clients</span>
      </div>
    </div>
  </div>
  
  <div style="text-align: center;">
    <a href="${affiliateLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 15px; font-weight: bold; font-size: 18px; box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4); transition: all 0.3s ease;">
      🚀 Essai gratuit 15 jours
    </a>
    
    <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 15px 0 0 0;">
      ✨ Aucune carte bancaire requise • Configuration en 5 minutes
    </p>
  </div>
</div>`.trim();
  };

  useEffect(() => {
    if (user) {
      fetchAffiliateData();
    }
  }, [user?.id]);

  return {
    affiliate,
    referrals,
    commissions,
    settings,
    loading,
    error,
    createAffiliateAccount,
    getAffiliateLink,
    getAffiliateHtmlCode,
    refetch: fetchAffiliateData
  };
}
