import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔔 Demande de données publiques de réservation reçue')
    
    // Créer le client Supabase avec la clé service role pour contourner RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer l'userId depuis l'URL
    const url = new URL(req.url)
    const userId = url.searchParams.get('user_id')

    if (!userId) {
      console.error('❌ user_id manquant')
      return new Response(
        JSON.stringify({ error: 'user_id parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔍 Récupération données pour userId:', userId)

    // Vérifier d'abord que l'utilisateur existe dans auth.users
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId)

    if (userError || !userData.user) {
      console.error('❌ Utilisateur non trouvé:', userId, userError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Utilisateur trouvé:', userData.user.email)

    // Récupérer les services avec les privilèges service role (contourne RLS)
    const { data: servicesData, error: servicesError } = await supabaseClient
      .from('services')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (servicesError) {
      console.error('❌ Erreur chargement services:', servicesError)
      return new Response(
        JSON.stringify({ error: 'Failed to load services', details: servicesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Services récupérés:', servicesData?.length || 0)

    // Récupérer les paramètres business
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from('business_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (settingsError) {
      console.warn('⚠️ Erreur chargement paramètres:', settingsError)
    }

    console.log('✅ Paramètres récupérés:', !!settingsData)

    // Récupérer les réservations existantes
    const { data: bookingsData, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select('date, time, duration_minutes, service_id, booking_status, quantity')
      .eq('user_id', userId)
      .in('booking_status', ['pending', 'confirmed'])

    if (bookingsError) {
      console.warn('⚠️ Erreur chargement réservations:', bookingsError)
    }

    console.log('✅ Réservations récupérées:', bookingsData?.length || 0)

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: userData.user.id,
          email: userData.user.email,
          full_name: userData.user.user_metadata?.full_name || userData.user.email
        },
        services: servicesData || [],
        settings: settingsData,
        bookings: bookingsData || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur fonction publique données réservation:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Unexpected error during public booking data fetch'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
