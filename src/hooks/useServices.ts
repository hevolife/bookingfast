import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Service } from '../types';
import { useAuth } from '../contexts/AuthContext';

const DEMO_CUSTOM_SERVICE_UUID = '00000000-0000-0000-0000-000000000001';

export function useServices() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createCustomServiceTemplate = (id: string): Service => ({
    id,
    name: 'Service personnalisé',
    price_ht: 0,
    price_ttc: 0,
    image_url: null,
    description: 'Service personnalisé',
    duration_minutes: 60,
    capacity: 1,
    availability_hours: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const fetchServices = async () => {
    if (!user) {
      setServices([]);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      const defaultServices = [
        {
          id: 'demo-1',
          user_id: user?.id || 'demo',
          name: 'Massage relaxant',
          price_ht: 66.67,
          price_ttc: 80.00,
          image_url: 'https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg',
          description: 'Massage de détente de 60 minutes pour évacuer le stress',
          duration_minutes: 60,
          capacity: 1,
          unit_name: 'personnes',
          availability_hours: {
            monday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
            tuesday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
            wednesday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
            thursday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
            friday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
            saturday: { ranges: [{ start: '10:00', end: '16:00' }], closed: false },
            sunday: { ranges: [{ start: '10:00', end: '16:00' }], closed: true }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'demo-2',
          user_id: user?.id || 'demo',
          name: 'Soin du visage',
          price_ht: 41.67,
          price_ttc: 50.00,
          image_url: 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg',
          description: 'Soin complet du visage avec nettoyage et hydratation',
          duration_minutes: 45,
          capacity: 1,
          unit_name: 'personnes',
          availability_hours: {
            monday: { ranges: [{ start: '10:00', end: '18:00' }], closed: false },
            tuesday: { ranges: [{ start: '10:00', end: '18:00' }], closed: false },
            wednesday: { ranges: [{ start: '10:00', end: '18:00' }], closed: false },
            thursday: { ranges: [{ start: '10:00', end: '18:00' }], closed: false },
            friday: { ranges: [{ start: '10:00', end: '18:00' }], closed: false },
            saturday: { ranges: [{ start: '11:00', end: '17:00' }], closed: false },
            sunday: { ranges: [{ start: '11:00', end: '17:00' }], closed: true }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setServices(defaultServices);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setError(null);
      
      // Déterminer l'ID utilisateur pour lequel charger les données
      let targetUserId = user.id;
      
      // Vérifier si l'utilisateur est membre d'une équipe
      try {
        const { data: membershipData, error: membershipError } = await supabase
          .from('team_members')
          .select('owner_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!membershipError && membershipData?.owner_id) {
          targetUserId = membershipData.owner_id;
          console.log('👥 Membre d\'équipe - chargement services du propriétaire:', targetUserId);
        } else {
          console.log('👑 Propriétaire - chargement services propres:', targetUserId);
        }
      } catch (teamError) {
        console.warn('⚠️ Erreur vérification équipe, utilisation ID utilisateur:', teamError);
      }

      let userServicesQuery = supabase
        .from('services')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout chargement services')), 30000)
      );
      
      let { data: userServices, error: userServicesError } = await Promise.race([userServicesQuery, timeoutPromise]);
      
      console.log('📊 Services chargés:', userServices?.length || 0);
      
      console.log('📊 Résultat requête services:', {
        data: userServices,
        error: userServicesError,
        count: userServices?.length || 0
      });
      
      if (userServices && userServices.length > 0) {
        console.log('📋 Services trouvés:', userServices.map((s: any) => ({
          id: s.id,
          name: s.name,
          user_id: s.user_id,
          description: s.description
        })));
      }

      if (userServicesError) {
        throw userServicesError;
      }

      setServices(userServices || []);
      console.log('✅ Services définis dans l\'état:', userServices?.length || 0);
    } catch (err) {
      console.error('Erreur lors de la récupération des services:', err);
      
      // Ne pas afficher d'erreur pour les timeouts, juste utiliser les services par défaut
      if (err instanceof Error && err.message.includes('Timeout')) {
        console.log('⏰ Timeout détecté - utilisation des services par défaut');
        setError(null);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
        setError(errorMessage);
      }
      
      const defaultServices = [
        {
          id: 'demo-1',
          name: 'Massage relaxant',
          price_ht: 66.67,
          price_ttc: 80.00,
          image_url: 'https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg',
          description: 'Massage de détente de 60 minutes pour évacuer le stress',
          duration_minutes: 60,
          capacity: 1,
          availability_hours: {
            monday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
            tuesday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
            wednesday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
            thursday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
            friday: { ranges: [{ start: '09:00', end: '17:00' }], closed: false },
            saturday: { ranges: [{ start: '10:00', end: '16:00' }], closed: false },
            sunday: { ranges: [{ start: '10:00', end: '16:00' }], closed: true }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'demo-2',
          name: 'Soin du visage',
          price_ht: 41.67,
          price_ttc: 50.00,
          image_url: 'https://images.pexels.com/photos/3985360/pexels-photo-3985360.jpeg',
          description: 'Soin complet du visage avec nettoyage et hydratation',
          duration_minutes: 45,
          capacity: 1,
          availability_hours: {
            monday: { ranges: [{ start: '10:00', end: '18:00' }], closed: false },
            tuesday: { ranges: [{ start: '10:00', end: '18:00' }], closed: false },
            wednesday: { ranges: [{ start: '10:00', end: '18:00' }], closed: false },
            thursday: { ranges: [{ start: '10:00', end: '18:00' }], closed: false },
            friday: { ranges: [{ start: '10:00', end: '18:00' }], closed: false },
            saturday: { ranges: [{ start: '11:00', end: '17:00' }], closed: false },
            sunday: { ranges: [{ start: '11:00', end: '17:00' }], closed: true }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setServices(defaultServices);
      
      if (!(err instanceof Error && err.message.includes('Timeout'))) {
        const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const ensureCustomServiceExists = async (): Promise<Service> => {
    try {
      const { data: existingServices, error: searchError } = await supabase
        .from('services')
        .select('*')
        .eq('description', 'Service personnalisé')
        .limit(1);

      if (existingServices && existingServices.length > 0 && !searchError) {
        return existingServices[0];
      }

      const customServiceData = {
        name: 'Service personnalisé',
        price_ht: 0,
        price_ttc: 0,
        image_url: null,
        description: 'Service personnalisé',
        duration_minutes: 60,
        capacity: 1,
        availability_hours: null
      };

      const { data: newService, error: createError } = await supabase
        .from('services')
        .insert([customServiceData])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return newService;
    } catch (err) {
      console.error('Erreur lors de la création du service personnalisé:', err);
      return createCustomServiceTemplate(DEMO_CUSTOM_SERVICE_UUID);
    }
  };

  const addService = async (service: Omit<Service, 'id' | 'created_at' | 'updated_at'>) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    try {
      const { data, error } = await supabase
        .from('services')
        .insert([{ 
          ...service, 
          user_id: user?.id
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setServices(prev => [...prev, data]);
        return data;
      }
    } catch (err) {
      console.error('Erreur lors de l\'ajout du service:', err);
      throw err;
    }
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    try {
      const { data, error } = await supabase
        .from('services')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setServices(prev => prev.map(s => s.id === id ? data : s));
        return data;
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour du service:', err);
      throw err;
    }
  };

  const deleteService = async (id: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré');
    }

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setServices(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Erreur lors de la suppression du service:', err);
      throw err;
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const loadServices = async () => {
      if (mounted && user) {
        setLoading(true);
        await fetchServices();
      }
    };
    
    if (user) {
      loadServices();
    }
    
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
    addService,
    updateService,
    deleteService,
    ensureCustomServiceExists
  };
}