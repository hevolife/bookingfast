const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Cache pour éviter les doublons
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

// Helper pour appeler l'API REST Supabase
async function supabaseRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  const url = `${supabaseUrl}/rest/v1/${endpoint}`
  
  const headers: Record<string, string> = {
    'apikey': serviceRoleKey!,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
  
  const options: RequestInit = {
    method,
    headers
  }
  
  if (body) {
    options.body = JSON.stringify(body)
  }
  
  const response = await fetch(url, options)
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Supabase API error: ${response.status} - ${error}`)
  }
  
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔔 Webhook Stripe reçu')

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ Signature Stripe manquante')
      return new Response('Signature manquante', { status: 400, headers: corsHeaders })
    }

    let event
    try {
      event = JSON.parse(body)
      console.log('📦 Événement Stripe:', event.type)
    } catch (err) {
      console.error('❌ Erreur parsing JSON:', err)
      return new Response('JSON invalide', { status: 400, headers: corsHeaders })
    }

    // 🔥 IGNORER payment_intent.succeeded - ON ATTEND checkout.session.completed
    if (event.type === 'payment_intent.succeeded') {
      console.log('⏭️ IGNORÉ: payment_intent.succeeded - On attend checkout.session.completed')
      return new Response(JSON.stringify({ 
        received: true, 
        ignored: true,
        reason: 'Waiting for checkout.session.completed event'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Gérer les événements d'abonnement
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      console.log('📊 Mise à jour abonnement:', subscription.id)

      await supabaseRequest(
        `users?stripe_subscription_id=eq.${subscription.id}`,
        'PATCH',
        {
          subscription_status: subscription.status === 'active' ? 'active' : 'cancelled',
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        }
      )

      console.log('✅ Abonnement mis à jour')

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Traiter checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const sessionId = session.id
      
      console.log('💳 Session de paiement complétée:', sessionId)
      console.log('📋 Metadata:', JSON.stringify(session.metadata, null, 2))
      console.log('👤 Customer details:', JSON.stringify(session.customer_details, null, 2))
      
      // ⚠️ VÉRIFICATION CRITIQUE : Paiement complet ?
      if (session.status !== 'complete' || session.payment_status !== 'paid') {
        console.log('⚠️ PAIEMENT NON COMPLET - Session ignorée')
        return new Response(JSON.stringify({ 
          success: true, 
          type: 'payment_not_complete'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // 🔒 Vérifier si déjà traité (éviter doublons)
      if (processedSessions.has(sessionId)) {
        const cached = processedSessions.get(sessionId)!
        console.log('🔒 SESSION DÉJÀ TRAITÉE')
        return new Response(JSON.stringify({ 
          success: true, 
          type: 'cached_duplicate_prevented',
          result: cached.result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Marquer comme en cours de traitement
      processedSessions.set(sessionId, { 
        timestamp: Date.now(), 
        result: { processing: true } 
      })

      const customerEmail = session.customer_details?.email
      const clientReferenceId = session.client_reference_id
      const metadata = session.metadata || {}

      if (!customerEmail) {
        console.error('❌ Email client manquant')
        processedSessions.delete(sessionId)
        return new Response('Email client manquant', { status: 400, headers: corsHeaders })
      }

      // 📅 RÉSERVATION IFRAME (booking_deposit)
      if (metadata.payment_type === 'booking_deposit') {
        console.log('📅 === PAIEMENT RÉSERVATION === 📅')
        
        const userId = metadata.user_id
        const serviceId = metadata.service_id
        const bookingId = metadata.booking_id // 🔥 NOUVEAU
        const date = metadata.date
        const time = metadata.time
        const quantity = parseInt(metadata.quantity || '1')
        
        console.log('🔍 Métadonnées:', {
          userId,
          serviceId,
          bookingId, // 🔥 NOUVEAU
          date,
          time,
          quantity
        });

        // 🔥 PARSING INTELLIGENT DU NOM CLIENT
        let clientFirstname = ''
        let clientLastname = ''
        let clientPhone = metadata.phone || metadata.client_phone || ''
        
        // 1️⃣ Essayer metadata.client (format PaymentPage: "lucas tafani")
        if (metadata.client) {
          const nameParts = metadata.client.trim().split(/\s+/)
          if (nameParts.length === 1) {
            clientFirstname = nameParts[0]
            clientLastname = nameParts[0]
          } else {
            clientFirstname = nameParts[0]
            clientLastname = nameParts.slice(1).join(' ')
          }
          console.log('✅ Parsing metadata.client:', { 
            original: metadata.client, 
            firstname: clientFirstname, 
            lastname: clientLastname 
          })
        }
        
        // 2️⃣ Fallback sur metadata.client_firstname + client_lastname
        if (!clientFirstname && metadata.client_firstname) {
          clientFirstname = metadata.client_firstname
          clientLastname = metadata.client_lastname || metadata.client_firstname
          console.log('✅ Utilisation metadata.client_firstname/lastname:', { 
            firstname: clientFirstname, 
            lastname: clientLastname 
          })
        }
        
        // 3️⃣ Dernier fallback sur customer_details.name
        if (!clientFirstname && session.customer_details?.name) {
          const nameParts = session.customer_details.name.trim().split(/\s+/)
          if (nameParts.length === 1) {
            clientFirstname = nameParts[0]
            clientLastname = nameParts[0]
          } else {
            clientFirstname = nameParts[0]
            clientLastname = nameParts.slice(1).join(' ')
          }
          console.log('✅ Fallback customer_details.name:', { 
            original: session.customer_details.name, 
            firstname: clientFirstname, 
            lastname: clientLastname 
          })
        }
        
        // 4️⃣ Si toujours vide, utiliser l'email
        if (!clientFirstname) {
          const emailPart = customerEmail.split('@')[0]
          clientFirstname = emailPart
          clientLastname = emailPart
          console.log('⚠️ Fallback email:', { firstname: clientFirstname, lastname: clientLastname })
        }
        
        const assignedUserId = metadata.assigned_user_id

        if (!userId || !serviceId || !date || !time) {
          console.error('❌ Données réservation manquantes:', { userId, serviceId, date, time })
          processedSessions.delete(sessionId)
          return new Response('Données réservation manquantes', { status: 400, headers: corsHeaders })
        }

        // Récupérer les infos du service
        const services = await supabaseRequest(`services?id=eq.${serviceId}`)
        const service = services?.[0]

        if (!service) {
          console.error('❌ Service non trouvé')
          processedSessions.delete(sessionId)
          return new Response('Service non trouvé', { status: 404, headers: corsHeaders })
        }

        const totalAmount = service.price_ttc * quantity
        const depositAmount = session.amount_total / 100 // Stripe envoie en centimes

        // 🔥 LOGIQUE MISE À JOUR OU CRÉATION
        if (bookingId) {
          console.log('🔄 === MISE À JOUR RÉSERVATION EXISTANTE === 🔄')
          console.log('🔍 Booking ID:', bookingId)

          // Vérifier que la réservation existe
          const existingBookings = await supabaseRequest(`bookings?id=eq.${bookingId}`)
          const existingBooking = existingBookings?.[0]

          if (!existingBooking) {
            console.error('❌ Réservation non trouvée:', bookingId)
            processedSessions.delete(sessionId)
            return new Response('Réservation non trouvée', { status: 404, headers: corsHeaders })
          }

          console.log('✅ Réservation trouvée:', existingBooking)

          // Mettre à jour la réservation existante
          const updateData: any = {
            payment_status: 'paid',
            payment_amount: depositAmount,
            booking_status: 'confirmed',
            stripe_session_id: sessionId,
            updated_at: new Date().toISOString()
          }

          console.log('📝 Mise à jour réservation:', JSON.stringify(updateData, null, 2))

          await supabaseRequest(
            `bookings?id=eq.${bookingId}`,
            'PATCH',
            updateData
          )

          console.log('✅ RÉSERVATION MISE À JOUR:', bookingId)

          const result = { 
            success: true, 
            type: 'booking_updated',
            bookingId: bookingId
          }
          
          processedSessions.set(sessionId, { timestamp: Date.now(), result })
          
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })

        } else {
          console.log('➕ === CRÉATION NOUVELLE RÉSERVATION === ➕')

          // Vérifier si la réservation existe déjà (par stripe_session_id)
          const existingBookings = await supabaseRequest(`bookings?stripe_session_id=eq.${sessionId}`)
          const existingBooking = existingBookings?.[0]

          if (existingBooking) {
            console.log('⚠️ Réservation déjà créée:', existingBooking.id)
            const result = { 
              success: true, 
              type: 'booking_already_exists',
              bookingId: existingBooking.id
            }
            processedSessions.set(sessionId, { timestamp: Date.now(), result })
            return new Response(JSON.stringify(result), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          // Créer la réservation
          const bookingData: any = {
            user_id: userId,
            service_id: serviceId,
            date: date,
            time: time,
            duration_minutes: service.duration_minutes,
            quantity: quantity,
            client_name: clientLastname,
            client_firstname: clientFirstname,
            client_email: customerEmail,
            client_phone: clientPhone,
            total_amount: totalAmount,
            payment_status: 'paid',
            payment_amount: depositAmount,
            booking_status: 'confirmed',
            stripe_session_id: sessionId
          }

          if (assignedUserId) {
            bookingData.assigned_user_id = assignedUserId
          }

          console.log('📝 Création réservation:', JSON.stringify(bookingData, null, 2))

          const bookings = await supabaseRequest('bookings', 'POST', bookingData)
          const booking = bookings?.[0]

          if (!booking) {
            console.error('❌ Erreur création réservation')
            processedSessions.delete(sessionId)
            return new Response('Erreur création réservation', { status: 500, headers: corsHeaders })
          }

          console.log('✅ RÉSERVATION CRÉÉE:', booking.id)

          const result = { 
            success: true, 
            type: 'booking_created',
            bookingId: booking.id
          }
          
          processedSessions.set(sessionId, { timestamp: Date.now(), result })
          
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      // 🔌 ABONNEMENT PLUGIN
      if (clientReferenceId && clientReferenceId.includes('|')) {
        console.log('🔌 ABONNEMENT PLUGIN détecté via client_reference_id')
        
        const [userId, pluginId] = clientReferenceId.split('|')
        
        console.log('👤 User ID extrait:', userId)
        console.log('🔌 Plugin ID extrait:', pluginId)
        
        if (!userId || !pluginId) {
          console.error('❌ Format client_reference_id invalide:', clientReferenceId)
          processedSessions.delete(sessionId)
          return new Response('Format client_reference_id invalide', { status: 400, headers: corsHeaders })
        }
        
        const stripeSubscriptionId = session.subscription

        const existingSubs = await supabaseRequest(
          `plugin_subscriptions?user_id=eq.${userId}&plugin_id=eq.${pluginId}`
        )
        const existingSub = existingSubs?.[0]

        if (existingSub) {
          console.log('📋 Souscription existante trouvée, mise à jour...')
          
          await supabaseRequest(
            `plugin_subscriptions?id=eq.${existingSub.id}`,
            'PATCH',
            {
              status: 'active',
              is_trial: false,
              trial_ends_at: null,
              stripe_subscription_id: stripeSubscriptionId,
              stripe_customer_id: session.customer,
              current_period_start: new Date().toISOString(),
              current_period_end: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
              updated_at: new Date().toISOString()
            }
          )
          
          console.log('✅ PLUGIN ACTIVÉ (mise à jour)')
        } else {
          console.log('➕ Création nouvelle souscription plugin...')
          
          await supabaseRequest('plugin_subscriptions', 'POST', {
            user_id: userId,
            plugin_id: pluginId,
            status: 'active',
            is_trial: false,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_customer_id: session.customer,
            current_period_start: new Date().toISOString(),
            current_period_end: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
          })
          
          console.log('✅ PLUGIN ACTIVÉ (création)')
        }
        
        const result = { 
          success: true, 
          type: 'plugin_subscription',
          userId: userId,
          pluginId: pluginId,
          status: 'active'
        }
        
        processedSessions.set(sessionId, { timestamp: Date.now(), result })
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // 💳 Abonnement plateforme
      if (metadata.payment_type === 'platform_subscription') {
        console.log('💳 ABONNEMENT PLATEFORME')
        
        const userId = metadata.user_id
        const planId = metadata.plan_id || metadata.plan_type
        
        if (!userId || !planId) {
          console.error('❌ Données abonnement manquantes')
          processedSessions.delete(sessionId)
          return new Response('Données abonnement manquantes', { status: 400, headers: corsHeaders })
        }
        
        let subscriptionTier = 'starter'
        if (planId === 'monthly' || planId === 'pro' || planId === 'yearly') {
          subscriptionTier = 'pro'
        }
        
        const stripeSubscriptionId = session.subscription

        await supabaseRequest(
          `users?id=eq.${userId}`,
          'PATCH',
          {
            subscription_tier: subscriptionTier,
            subscription_status: 'active',
            trial_ends_at: null,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_customer_id: session.customer,
            current_period_end: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString()
          }
        )
        
        console.log('✅ ABONNEMENT ACTIVÉ')
        
        const result = { 
          success: true, 
          type: 'platform_subscription',
          userId: userId,
          planId: planId,
          subscriptionTier: subscriptionTier,
          status: 'active'
        }
        
        processedSessions.set(sessionId, { timestamp: Date.now(), result })
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('⚠️ Type de paiement non reconnu')
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('ℹ️ Événement non traité:', event.type)
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Erreur webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
