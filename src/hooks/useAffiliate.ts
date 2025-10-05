import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AffiliateData {
  id: string;
  user_id: string;
  affiliate_code: string;
  commission_rate: number;
  total_earnings: number;
  created_at: string;
}

export function useAffiliate() {
  const { user, isAuthenticated } = useAuth();
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAffiliateData() {
      if (!supabase || !user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('affiliates')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setAffiliateData(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des données d\'affiliation:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAffiliateData();
  }, [user]);

  const createAffiliateAccount = async () => {
    if (!supabase || !user || !isAuthenticated) {
      throw new Error('Utilisateur non authentifié');
    }

    const affiliateCode = `REF${user.id.substring(0, 8).toUpperCase()}`;

    const { data, error } = await supabase
      .from('affiliates')
      .insert({
        user_id: user.id,
        affiliate_code: affiliateCode,
        commission_rate: 0.20,
        total_earnings: 0
      })
      .select()
      .single();

    if (error) throw error;

    setAffiliateData(data);
    return data;
  };

  return {
    affiliateData,
    loading,
    createAffiliateAccount,
    isAffiliate: !!affiliateData
  };
}
