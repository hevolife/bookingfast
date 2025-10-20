import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Unavailability } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useUnavailabilities() {
  const { user } = useAuth();
  const [unavailabilities, setUnavailabilities] = useState<Unavailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnavailabilities = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setUnavailabilities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let targetUserId = user.id;
      
      try {
        const { data: membershipData } = await supabase!
          .from('team_members')
          .select('owner_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (membershipData?.owner_id) {
          targetUserId = membershipData.owner_id;
        }
      } catch (teamError) {
        console.warn('Erreur vérification équipe:', teamError);
      }

      const { data, error } = await supabase!
        .from('unavailabilities')
        .select('*')
        .eq('user_id', targetUserId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Erreur Supabase SELECT:', error);
        throw error;
      }

      setUnavailabilities(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des indisponibilités:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setUnavailabilities([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const addUnavailability = async (unavailabilityData: Omit<Unavailability, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    if (!isSupabaseConfigured || !user) {
      throw new Error('Supabase non configuré ou utilisateur non connecté');
    }

    try {
      console.log('🔍 User ID:', user.id);
      console.log('🔍 User email:', user.email);
      console.log('🔍 Données à insérer:', unavailabilityData);

      let targetUserId = user.id;
      
      try {
        const { data: membershipData } = await supabase!
          .from('team_members')
          .select('owner_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (membershipData?.owner_id) {
          targetUserId = membershipData.owner_id;
          console.log('🔍 Target User ID (owner):', targetUserId);
        }
      } catch (teamError) {
        console.warn('Erreur vérification équipe:', teamError);
      }

      const insertData = { 
        ...unavailabilityData, 
        user_id: targetUserId 
      };
      
      console.log('🔍 Insert final:', insertData);

      const { data, error } = await supabase!
        .from('unavailabilities')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur Supabase INSERT:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('✅ Indisponibilité créée:', data);

      if (data) {
        setUnavailabilities(prev => [...prev, data]);
        return data;
      }
    } catch (err) {
      console.error('❌ Erreur complète:', err);
      throw err;
    }
  };

  const updateUnavailability = async (id: string, updates: Partial<Unavailability>) => {
    if (!isSupabaseConfigured || !user) {
      throw new Error('Supabase non configuré ou utilisateur non connecté');
    }

    try {
      const { data, error } = await supabase!
        .from('unavailabilities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setUnavailabilities(prev => prev.map(u => u.id === id ? data : u));
        return data;
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'indisponibilité:', err);
      throw err;
    }
  };

  const deleteUnavailability = async (id: string) => {
    if (!isSupabaseConfigured || !user) {
      throw new Error('Supabase non configuré ou utilisateur non connecté');
    }

    try {
      const { error } = await supabase!
        .from('unavailabilities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUnavailabilities(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'indisponibilité:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnavailabilities();
    } else {
      setUnavailabilities([]);
      setLoading(false);
    }
  }, [user?.id, fetchUnavailabilities]);

  return {
    unavailabilities,
    loading,
    error,
    refetch: fetchUnavailabilities,
    addUnavailability,
    updateUnavailability,
    deleteUnavailability
  };
}
