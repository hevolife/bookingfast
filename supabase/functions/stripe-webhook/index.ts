import { corsHeaders } from '../_shared/cors.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Cache global pour éviter les doublons de webhook
const processedSessions = new Map<string, { timestamp: number; result: any }>()

// Nettoyer le cache toutes les 10 minutes
setInterval(() => {
  const now = Date.now()
  const tenMinutes = 10 * 60 * 1000
  
  for (const [sessionId, data] of processedSessions.entries()) {
    if (now - data.timestamp > tenMinutes) {
      processedSessions.delete(sessionId)
    }
  }
}, 10 * 60 * 1000)

Deno.serve(async (req) => {
  console.log('🔔 Webhook Stripe reçu - Méthode:', req.method)
  console.log('🔔 URL:', req.url)
  console.log('🔔 Headers:', Object.fromEntries(req.headers.entries()))
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Réponse OPTIONS')
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.error('❌ Méthode non autorisée:', req.method)
    return new Response(JSON.stringify({ 
      error: 'Method not allowed',
      allowed_methods: ['POST', 'OPTIONS'],
      received_method: req.method 
    }), { 
      status: 405, 
      headers: { 
        ...corsHeaders, 
        'Allow': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      }
    })
  }

  try {
    console.log('🔔 Début traitement webhook POST')
    
    // Créer le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variables d\'environnement Supabase manquantes')
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        missing: {
          supabase_url: !supabaseUrl,
          service_key: !supabaseServiceKey
        }
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Import dynamique de Supabase
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    console.log('✅ Client Supabase créé')

    // Lire le body de la requête
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    console.log('📦 Body reçu, taille:', body.length, 'caractères')
    console.log('🔐 Signature présente:', !!signature)

    if (!signature) {
      console.error('❌ Signature Stripe manquante')
      return new Response(JSON.stringify({ 
        error: 'Signature manquante',
        headers_received: Object.fromEntries(req.headers.entries())
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parser l'événement Stripe
    let event
    try {
      event = JSON.parse(body)
      console.log('📦 Événement Stripe parsé:', event.type)
      console.log('📦 ID événement:', event.id)
    } catch (err) {
      console.error('❌ Erreur parsing JSON:', err)
      return new Response(JSON.stringify({ 
        error: 'JSON invalide',
        body_preview: body.substring(0, 200)
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Traiter l'événement checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const sessionId = session.id
      
      console.log('💳 Session de paiement complétée:', sessionId)
      console.log('📊 Statut de la session:', session.status)
      console.log('📊 Statut du paiement:', session.payment_status)
      console.log('📧 Email client:', session.customer_details?.email)
      console.log('💰 Montant payé:', session.amount_total, 'centimes')
      console.log('🏷️ Métadonnées complètes:', JSON.stringify(session.metadata, null, 2))
      
      // Vérification critique : Ne traiter QUE les paiements complètement réussis
      if (session.status !== 'complete' || session.payment_status !== 'paid') {
        console.log('⚠️ PAIEMENT NON COMPLET - Session ignorée')
        console.log('📊 Détails:', {
          session_status: session.status,
          payment_status: session.payment_status,
          expected_session_status: 'complete',
          expected_payment_status: 'paid'
        })
        
        return new Response(JSON.stringify({ 
          success: true, 
          type: 'payment_not_complete',
          message: 'Payment not complete - session ignored',
          session_status: session.status,
          payment_status: session.payment_status
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      console.log('✅ PAIEMENT COMPLET CONFIRMÉ - Traitement de la réservation')
      
      // Vérification cache global
      if (processedSessions.has(sessionId)) {
        const cached = processedSessions.get(sessionId)!
        console.log('🔒 SESSION DÉJÀ TRAITÉE DANS LE CACHE')
        return new Response(JSON.stringify({ 
          success: true, 
          type: 'cached_duplicate_prevented',
          message: 'Session already processed in cache',
          processed_at: new Date(cached.timestamp).toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Marquer immédiatement dans le cache
      processedSessions.set(sessionId, { 
        timestamp: Date.now(), 
        result: { processing: true } 
      })

      const customerEmail = session.customer_details?.email
      const amountPaid = session.amount_total / 100 // Convertir centimes en euros
      const metadata = session.metadata || {}

      if (!customerEmail) {
        console.error('❌ Email client manquant')
        processedSessions.delete(sessionId)
        return new Response(JSON.stringify({ 
          error: 'Email client manquant',
          session_data: session
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('🔍 Recherche de la réservation pour:', customerEmail)
      console.log('🔍 Métadonnées de recherche:', {
        user_id: metadata.user_id,
        date: metadata.date || metadata.booking_date,
        time: metadata.time || metadata.booking_time,
        email: customerEmail
      })

      // Recherche de la réservation avec critères précis
      let booking = null
      const searchDate = metadata.date || metadata.booking_date
      const searchTime = metadata.time || metadata.booking_time
      const searchUserId = metadata.user_id

      if (searchDate && searchTime && searchUserId) {
        console.log('🔍 Recherche par critères complets:', { 
          email: customerEmail, 
          date: searchDate, 
          time: searchTime,
          user_id: searchUserId
        })
        
        const { data: bookingData, error: bookingError } = await supabaseClient
          .from('bookings')
          .select('*')
          .eq('client_email', customerEmail)
          .eq('date', searchDate)
          .eq('time', searchTime)
          .eq('user_id', searchUserId)
          .in('booking_status', ['pending', 'confirmed'])
          .order('created_at', { ascending: false })
          .limit(1)

        console.log('📊 Résultat recherche complète:', {
          data: bookingData,
          error: bookingError,
          count: bookingData?.length || 0
        })

        if (!bookingError && bookingData && bookingData.length > 0) {
          booking = bookingData[0]
          console.log('✅ Réservation trouvée par critères complets:', booking.id)
        } else {
          console.log('❌ Réservation non trouvée par critères complets:', bookingError?.message)
        }
      }

      // Fallback : recherche par email + user_id seulement
      if (!booking && searchUserId) {
        console.log('🔍 Recherche fallback par email + user_id:', { email: customerEmail, user_id: searchUserId })
        
        const { data: bookingData, error: bookingError } = await supabaseClient
          .from('bookings')
          .select('*')
          .eq('client_email', customerEmail)
          .eq('user_id', searchUserId)
          .in('booking_status', ['pending', 'confirmed'])
          .order('created_at', { ascending: false })
          .limit(1)

        if (!bookingError && bookingData && bookingData.length > 0) {
          booking = bookingData[0]
          console.log('✅ Réservation trouvée par fallback:', booking.id)
        } else {
          console.log('❌ Réservation non trouvée par fallback:', bookingError?.message)
        }
      }

      // Dernier recours : recherche par email seulement
      if (!booking) {
        console.log('🔍 Recherche par email seulement (dernier recours):', customerEmail)
        
        const { data: bookingData, error: bookingError } = await supabaseClient
          .from('bookings')
          .select('*')
          .eq('client_email', customerEmail)
          .in('booking_status', ['pending', 'confirmed'])
          .order('created_at', { ascending: false })
          .limit(1)

        if (!bookingError && bookingData && bookingData.length > 0) {
          booking = bookingData[0]
          console.log('✅ Réservation trouvée par email (dernier recours):', booking.id)
        } else {
          console.log('❌ Aucune réservation trouvée par email:', bookingError?.message)
        }
      }

      if (!booking) {
        console.error('❌ Aucune réservation trouvée pour:', customerEmail)
        console.log('🔍 DEBUG - Recherche de toutes les réservations pour cet email:')
        
        // Debug : lister toutes les réservations pour cet email
        const { data: allBookings, error: debugError } = await supabaseClient
          .from('bookings')
          .select('id, client_email, date, time, user_id, booking_status, created_at')
          .eq('client_email', customerEmail)
          .order('created_at', { ascending: false })

        if (!debugError && allBookings) {
          console.log('📋 Toutes les réservations pour', customerEmail, ':', allBookings)
        }
        
        processedSessions.delete(sessionId)
        return new Response(JSON.stringify({ 
          error: 'Réservation non trouvée',
          search_criteria: {
            email: customerEmail,
            date: searchDate,
            time: searchTime,
            user_id: searchUserId
          },
          debug_bookings: allBookings || []
        }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('💳 MISE À JOUR RÉSERVATION:', booking.id)
      console.log('📊 Réservation avant mise à jour:', {
        id: booking.id,
        payment_amount: booking.payment_amount,
        payment_status: booking.payment_status,
        booking_status: booking.booking_status,
        transactions_count: (booking.transactions || []).length
      })

      // Mettre à jour la réservation
      const existingTransactions = booking.transactions || []
      
      // Vérifier si cette session n'a pas déjà été traitée
      const sessionAlreadyProcessed = existingTransactions.some((t: any) => 
        t.method === 'stripe' && 
        t.note && 
        t.note.includes(sessionId)
      )
      
      if (sessionAlreadyProcessed) {
        console.log('🔒 SESSION STRIPE DÉJÀ TRAITÉE')
        
        const result = { 
          success: true, 
          type: 'session_already_processed',
          message: 'Session already processed',
          existingBookingId: booking.id
        }
        
        processedSessions.set(sessionId, { timestamp: Date.now(), result })
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Ajouter la nouvelle transaction
      const newTransaction = {
        id: crypto.randomUUID(),
        amount: amountPaid,
        method: 'stripe',
        status: 'completed',
        note: `Paiement Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`,
        created_at: new Date().toISOString()
      }
      
      const finalTransactions = [...existingTransactions, newTransaction]
      const newTotalPaid = amountPaid + (booking.payment_amount || 0)
      const totalAmount = booking.total_amount

      let newPaymentStatus = 'pending'
      if (newTotalPaid >= totalAmount) {
        newPaymentStatus = 'completed'
      } else if (newTotalPaid > 0) {
        newPaymentStatus = 'partial'
      }

      // Confirmer la réservation après paiement
      const newBookingStatus = 'confirmed'
      
      console.log('📊 Calculs de mise à jour:', {
        amountPaid: amountPaid,
        existingPaymentAmount: booking.payment_amount,
        newTotalPaid: newTotalPaid,
        totalAmount: totalAmount,
        newPaymentStatus: newPaymentStatus,
        newBookingStatus: newBookingStatus,
        transactionsCount: finalTransactions.length
      })

      console.log('🔄 DÉBUT MISE À JOUR BASE DE DONNÉES...')
      
      const { data: updatedBooking, error: updateError } = await supabaseClient
        .from('bookings')
        .update({
          payment_amount: newTotalPaid,
          payment_status: newPaymentStatus,
          booking_status: newBookingStatus,
          transactions: finalTransactions,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Erreur mise à jour réservation:', updateError)
        console.error('❌ Détails erreur:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        })
        processedSessions.delete(sessionId)
        return new Response(JSON.stringify({ 
          error: 'Erreur mise à jour',
          details: updateError
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('✅ RÉSERVATION MISE À JOUR AVEC SUCCÈS')
      console.log('📊 Réservation après mise à jour:', {
        id: booking.id,
        payment_amount: newTotalPaid,
        payment_status: newPaymentStatus,
        booking_status: newBookingStatus,
        transactions_count: finalTransactions.length
      })
      
      const result = { 
        success: true, 
        type: 'booking_updated',
        bookingId: booking.id,
        amountPaid: amountPaid,
        totalPaid: newTotalPaid,
        paymentStatus: newPaymentStatus,
        bookingStatus: newBookingStatus,
        sessionId: sessionId,
        updatedBooking: updatedBooking
      }
      
      // Mettre à jour le cache avec le résultat final
      processedSessions.set(sessionId, { timestamp: Date.now(), result })
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Autres types d'événements
    console.log('ℹ️ Événement non traité:', event.type)

    return new Response(JSON.stringify({ 
      received: true,
      event_type: event.type,
      message: 'Event received but not processed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Erreur webhook:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})