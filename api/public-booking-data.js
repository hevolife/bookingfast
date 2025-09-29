const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type']
}));

app.use(express.json());

app.get('/api/public-booking-data', async (req, res) => {
  try {
    console.log('🔔 Demande de données publiques de réservation reçue');
    
    const supabaseClient = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const userId = req.query.user_id;

    if (!userId) {
      console.error('❌ user_id manquant');
      return res.status(400).json({ error: 'user_id parameter required' });
    }

    console.log('🔍 Récupération services pour userId:', userId);

    // Vérifier que l'utilisateur existe
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('❌ Erreur vérification utilisateur:', userError);
      return res.status(404).json({ error: 'User verification failed' });
    }

    if (!userData) {
      console.error('❌ Utilisateur non trouvé:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Récupérer les services
    const { data: servicesData, error: servicesError } = await supabaseClient
      .from('services')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (servicesError) {
      console.error('❌ Erreur chargement services:', servicesError);
      return res.status(500).json({ error: 'Failed to load services' });
    }

    // Récupérer les paramètres business
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('business_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsError) {
      console.warn('⚠️ Erreur chargement paramètres:', settingsError);
    }

    // Récupérer les réservations existantes
    const { data: bookingsData, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select('date, time, duration_minutes, service_id, booking_status')
      .eq('user_id', userId)
      .in('booking_status', ['pending', 'confirmed']);

    if (bookingsError) {
      console.warn('⚠️ Erreur chargement réservations:', bookingsError);
    }

    console.log('✅ Données récupérées avec succès');

    res.json({ 
      success: true,
      user: userData,
      services: servicesData || [],
      settings: settingsData,
      bookings: bookingsData || []
    });

  } catch (error) {
    console.error('❌ Erreur fonction publique services:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Unexpected error during public services fetch'
    });
  }
});

module.exports = app;