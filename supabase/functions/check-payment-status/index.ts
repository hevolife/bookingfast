import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔍 Vérification statut session:', sessionId)

    // Récupérer la clé Stripe depuis les settings
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Extraire l'ID de session Stripe (format: cs_live_...)
    const stripeSessionId = sessionId.includes('cs_') ? sessionId : `cs_${sessionId}`

    // Vérifier si une réservation existe déjà avec ce session_id
    const { data: existingBooking } = await supabaseClient
      .from('bookings')
      .select('id, booking_status, payment_status')
      .eq('stripe_session_id', stripeSessionId)
      .maybeSingle()

    if (existingBooking) {
      console.log('✅ Réservation trouvée:', existingBooking)
      return new Response(
        JSON.stringify({
          status: 'complete',
          payment_status: 'paid',
          booking_id: existingBooking.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('⏳ Réservation pas encore créée')
    return new Response(
      JSON.stringify({
        status: 'pending',
        payment_status: 'pending'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
