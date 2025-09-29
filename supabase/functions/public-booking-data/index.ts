import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export default async function handler(req: Request) {
  // Handle CORS preflight requests
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
    
    // Vérifier que les variables d'environnement sont configurées
    if (!Deno.env.get('SUPABASE_URL')) {
      console.error('❌ SUPABASE_URL manquant')
      return new Response(
        JSON.stringify({ error: 'SUPABASE_URL environment variable is missing' }),
        { status: 500, headers: corsHeaders }
      )
    }
    
    if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquant')
      return new Response(
        JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is missing' }),
        { status: 500, headers: corsHeaders }
      )
    }
    
    console.log('✅ Configuration Supabase:', Deno.env.get('SUPABASE_URL'))

    // Récupérer les données de réservation
    const { data: reservations, error } = await supabaseClient
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Erreur lors de la récupération des réservations:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reservations' }),
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('✅ Réservations récupérées:', reservations?.length || 0)

    return new Response(
      JSON.stringify({ reservations }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('❌ Erreur dans la fonction:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
}