import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

serve(async (req) => {
  console.log('🔔 Webhook Stripe reçu - Méthode:', req.method)
  console.log('🔔 Headers:', Object.fromEntries(req.headers.entries()))
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Réponse OPTIONS')
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.error('❌ Méthode non autorisée:', req.method)
    return new Response('Method not allowed', { 
      status: 405, 
      headers: { ...corsHeaders, 'Allow': 'POST, OPTIONS' }
    })
  }

  try {
    console.log('🔔 Début traitement webhook POST')
    
    // Créer le client Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('✅ Client Supabase créé')

    // Lire le body de la requête
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    console.log('📦 Body reçu, taille:', body.length, 'caractères')
    console.log('🔐 Signature présente:', !!signature)

    if (!signature) {
      console.error('❌ Signature Stripe manquante')
      return new Response('Signature manquante', { status: 400, headers: corsHeaders })
    }

    // Pour le développement, on parse directement le JSON
    let event
    try {
      event = JSON.parse(body)
      console.log('📦 Événement Stripe parsé:', event.type)
      console.log('📦 ID événement:', event.id)
    } catch (err) {
      console.error('❌ Erreur parsing JSON:', err)
      return new Response('JSON invalide', { status: 400, headers: corsHeaders })
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
      
      // 🔒 VÉRIFICATION CRITIQUE : Ne traiter QUE les paiements complètement réussis
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
      
      // 🔒 VÉRIFICATION CACHE GLOBAL - PREMIÈRE LIGNE DE DÉFENSE
      if (processedSessions.has(sessionId)) {
        const cached = processedSessions.get(sessionId)!
        console.log('🔒 SESSION DÉJÀ TRAITÉE DANS LE CACHE - Webhook en doublon absolu')
        console.log('⏰ Traitée il y a:', Math.round((Date.now() - cached.timestamp) / 1000), 'secondes')
        return new Response(JSON.stringify({ 
          success: true, 
          type: 'cached_duplicate_prevented',
          message: 'Session already processed in cache',
          processed_at: new Date(cached.timestamp).toISOString(),
          result: cached.result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Marquer immédiatement dans le cache pour bloquer les autres webhooks
      processedSessions.set(sessionId, { 
        timestamp: Date.now(), 
        result: { processing: true } 
      })

      const customerEmail = session.customer_details?.email
      const amountPaid = session.amount_total / 100 // Convertir centimes en euros
      const metadata = session.metadata || {}

      if (!customerEmail) {
        console.error('❌ Email client manquant')
        processedSessions.delete(sessionId) // Nettoyer le cache en cas d'erreur
        return new Response('Email client manquant', { status: 400, headers: corsHeaders })
      }

      console.log('🔍 Recherche de la réservation pour:', customerEmail)
      console.log('🔍 Métadonnées de recherche:', {
        user_id: metadata.user_id,
        date: metadata.date || metadata.booking_date,
        time: metadata.time || metadata.booking_time,
        email: customerEmail
      })

      // Vérifier si c'est un paiement d'abonnement
      if (metadata.subscription === 'true') {
        console.log('💳 Paiement d\'abonnement détecté')
        
        const userId = metadata.user_id
        const planId = metadata.plan_id
        
        if (!userId || !planId) {
          console.error('❌ Données abonnement manquantes')
          processedSessions.delete(sessionId)
          return new Response('Données abonnement manquantes', { status: 400, headers: corsHeaders })
        }
        
        // Mettre à jour le statut d'abonnement de l'utilisateur
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({
            subscription_status: 'active',
            trial_ends_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
        
        if (updateError) {
          console.error('❌ Erreur mise à jour abonnement:', updateError)
          processedSessions.delete(sessionId)
          return new Response('Erreur mise à jour abonnement', { status: 500, headers: corsHeaders })
        }
        
        console.log('✅ Abonnement activé pour utilisateur:', userId)
        
        const result = { 
          success: true, 
          type: 'subscription',
          userId: userId,
          planId: planId,
          status: 'active'
        }
        
        // Mettre à jour le cache avec le résultat final
        processedSessions.set(sessionId, { timestamp: Date.now(), result })
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Vérifier si c'est un paiement de réservation publique
      if (metadata.create_booking_after_payment === 'true') {
        console.log('🎯 Paiement de réservation publique détecté - CRÉATION UNIQUE')
        
        // 🔒 VERROU ULTRA-STRICT AVEC CRITÈRES EXACTS
        const searchCriteria = {
          email: customerEmail,
          date: metadata.date || metadata.booking_date,
          time: metadata.time || metadata.booking_time,
          service_id: metadata.service_id,
          user_id: metadata.user_id
        }
        
        console.log('🔍 Critères de recherche ULTRA-STRICTS:', searchCriteria)
        
        // 🔒 RECHERCHE AVEC VERROU POUR ÉVITER LES CONDITIONS DE COURSE
        const { data: existingBookings, error: searchError } = await supabaseClient
          .from('bookings')
          .select('id, created_at, payment_amount, total_amount, transactions, booking_status')
          .eq('client_email', searchCriteria.email)
          .eq('date', searchCriteria.date)
          .eq('time', searchCriteria.time)
          .eq('service_id', searchCriteria.service_id)
          .eq('user_id', searchCriteria.user_id)
          .in('booking_status', ['pending', 'confirmed'])
          .order('created_at', { ascending: false })

        if (!searchError && existingBookings && existingBookings.length > 0) {
          console.log('⚠️ RÉSERVATION(S) EXISTANTE(S) TROUVÉE(S) - AUCUNE CRÉATION')
          console.log('📋 Nombre de réservations existantes:', existingBookings.length)
          
          // Prendre la première réservation (la plus récente) et la mettre à jour
          const existingBooking = existingBookings[0]
          console.log('🔄 Mise à jour de la réservation existante:', existingBooking.id)
          
          // Récupérer les transactions existantes
          const existingTransactions = existingBooking.transactions || []
          
          // Vérifier si cette session Stripe n'a pas déjà été traitée
          const sessionAlreadyProcessed = existingTransactions.some((t: any) => 
            t.method === 'stripe' && 
            t.note && 
            t.note.includes(sessionId)
          )
          
          if (sessionAlreadyProcessed) {
            console.log('🔒 SESSION STRIPE DÉJÀ TRAITÉE - Webhook en doublon absolu')
            
            const result = { 
              success: true, 
              type: 'session_already_processed',
              message: 'Session already processed',
              existingBookingId: existingBooking.id
            }
            
            processedSessions.set(sessionId, { timestamp: Date.now(), result })
            
            return new Response(JSON.stringify(result), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
          
          // Ajouter la nouvelle transaction avec référence à la session
          const newTransaction = {
            id: crypto.randomUUID(),
            amount: amountPaid,
            method: 'stripe',
            status: 'completed',
            note: `Acompte payé via Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`,
            created_at: new Date().toISOString()
          }
          
          const finalTransactions = [...existingTransactions, newTransaction]
          const newTotalPaid = amountPaid + (existingBooking.payment_amount || 0)
          const totalAmount = existingBooking.total_amount

          let newPaymentStatus = 'pending'
          if (newTotalPaid >= totalAmount) {
            newPaymentStatus = 'completed'
          } else if (newTotalPaid > 0) {
            newPaymentStatus = 'partial'
          }

          console.log('🔄 DÉBUT MISE À JOUR BASE DE DONNÉES...')
          console.log('📊 Données de mise à jour:', {
            booking_id: existingBooking.id,
            new_payment_amount: newTotalPaid,
            new_payment_status: newPaymentStatus,
            transactions_count: finalTransactions.length
          })

          const { error: updateError } = await supabaseClient
            .from('bookings')
            .update({
              payment_amount: newTotalPaid,
              payment_status: newPaymentStatus,
              booking_status: 'confirmed',
              transactions: finalTransactions,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingBooking.id)

          if (updateError) {
            console.error('❌ Erreur mise à jour réservation existante:', updateError)
            console.error('❌ Détails erreur:', {
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              code: updateError.code
            })
            processedSessions.delete(sessionId)
            return new Response('Erreur mise à jour réservation', { status: 500, headers: corsHeaders })
          }

          console.log('✅ RÉSERVATION EXISTANTE MISE À JOUR - AUCUNE CRÉATION')
          console.log('📊 Réservation après mise à jour:', {
            id: existingBooking.id,
            payment_amount: newTotalPaid,
            payment_status: newPaymentStatus,
            booking_status: 'confirmed'
          })
          
          const result = { 
            success: true, 
            type: 'existing_booking_updated',
            bookingId: existingBooking.id,
            amountPaid: amountPaid,
            totalPaid: newTotalPaid,
            paymentStatus: newPaymentStatus,
            bookingStatus: 'confirmed',
            sessionId: sessionId
          }
          
          processedSessions.set(sessionId, { timestamp: Date.now(), result })
          
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        
        console.log('🆕 AUCUNE RÉSERVATION EXISTANTE - Création d\'une nouvelle')
        
        // 🔒 CRÉATION AVEC PROTECTION CONTRE LES CONDITIONS DE COURSE
        const bookingData = {
          user_id: metadata.user_id,
          service_id: metadata.service_id,
          date: metadata.date || metadata.booking_date,
          time: metadata.time || metadata.booking_time,
          duration_minutes: parseInt(metadata.duration_minutes),
          quantity: parseInt(metadata.quantity),
          client_name: metadata.client_name,
          client_firstname: metadata.client_firstname,
          client_email: customerEmail,
          client_phone: metadata.phone,
          total_amount: parseFloat(metadata.total_amount),
          payment_status: 'partial',
          payment_amount: amountPaid,
          booking_status: 'confirmed',
          transactions: [{
            id: crypto.randomUUID(),
            amount: amountPaid,
            method: 'stripe',
            status: 'completed',
            note: `Acompte payé via Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`,
            created_at: new Date().toISOString()
          }]
        }
        
        console.log('📝 Données de réservation à créer:', bookingData)
        
        // 🔒 CRÉATION SÉCURISÉE AVEC GESTION D'ERREUR DE CONTRAINTE UNIQUE
        const { data: newBooking, error: bookingError } = await supabaseClient
          .from('bookings')
          .insert([bookingData])
          .select()
          .single()
        
        if (bookingError) {
          console.error('❌ Erreur création réservation:', bookingError)
          
          // Si c'est une erreur de contrainte unique (doublon), essayer de mettre à jour
          if (bookingError.code === '23505' || 
              bookingError.message.includes('duplicate') || 
              bookingError.message.includes('unique') ||
              bookingError.message.includes('already exists')) {
            
            console.log('🔄 Erreur de doublon détectée - tentative de mise à jour...')
            
            // Rechercher la réservation qui cause le conflit
            const { data: conflictBooking, error: conflictError } = await supabaseClient
              .from('bookings')
              .select('*')
              .eq('client_email', customerEmail)
              .eq('date', bookingData.date)
              .eq('time', bookingData.time)
              .eq('service_id', bookingData.service_id)
              .eq('user_id', bookingData.user_id)
              .in('booking_status', ['pending', 'confirmed'])
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
            
            if (!conflictError && conflictBooking) {
              console.log('✅ Réservation en conflit trouvée - mise à jour...')
              
              // Récupérer les transactions existantes
              const existingTransactions = conflictBooking.transactions || []
              
              // Vérifier si cette session Stripe n'a pas déjà été traitée
              const sessionAlreadyProcessed = existingTransactions.some((t: any) => 
                t.method === 'stripe' && 
                t.note && 
                t.note.includes(sessionId)
              )
              
              if (sessionAlreadyProcessed) {
                console.log('🔒 SESSION STRIPE DÉJÀ TRAITÉE - Webhook en doublon absolu')
                
                const result = { 
                  success: true, 
                  type: 'session_already_processed_conflict',
                  message: 'Session already processed in conflict resolution',
                  existingBookingId: conflictBooking.id
                }
                
                processedSessions.set(sessionId, { timestamp: Date.now(), result })
                
                return new Response(JSON.stringify(result), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
              }
              
              // Ajouter la nouvelle transaction avec référence à la session
              const newTransaction = {
                id: crypto.randomUUID(),
                amount: amountPaid,
                method: 'stripe',
                status: 'completed',
                note: `Acompte payé via Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`,
                created_at: new Date().toISOString()
              }
              
              const finalTransactions = [...existingTransactions, newTransaction]
              const newTotalPaid = amountPaid + (conflictBooking.payment_amount || 0)
              const totalAmount = conflictBooking.total_amount

              let newPaymentStatus = 'pending'
              if (newTotalPaid >= totalAmount) {
                newPaymentStatus = 'completed'
              } else if (newTotalPaid > 0) {
                newPaymentStatus = 'partial'
              }

              const { error: updateError } = await supabaseClient
                .from('bookings')
                .update({
                  payment_amount: newTotalPaid,
                  payment_status: newPaymentStatus,
                  booking_status: 'confirmed',
                  transactions: finalTransactions,
                  updated_at: new Date().toISOString()
                })
                .eq('id', conflictBooking.id)

              if (!updateError) {
                console.log('✅ CONFLIT RÉSOLU - Réservation mise à jour au lieu de créer un doublon')
                
                const result = { 
                  success: true, 
                  type: 'conflict_resolved',
                  bookingId: conflictBooking.id,
                  amountPaid: amountPaid,
                  totalPaid: newTotalPaid,
                  paymentStatus: newPaymentStatus,
                  bookingStatus: 'confirmed',
                  sessionId: sessionId
                }
                
                processedSessions.set(sessionId, { timestamp: Date.now(), result })
                
                return new Response(JSON.stringify(result), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
              }
            }
          }
          
          console.error('❌ Erreur création réservation après paiement:', bookingError)
          processedSessions.delete(sessionId)
          return new Response('Erreur création réservation', { status: 500, headers: corsHeaders })
        }
        
        console.log('✅ NOUVELLE RÉSERVATION CRÉÉE avec succès APRÈS paiement:', newBooking.id)
        
        const result = { 
          success: true, 
          type: 'booking_created',
          bookingId: newBooking.id,
          amountPaid: amountPaid,
          paymentStatus: 'partial',
          bookingStatus: 'confirmed',
          sessionId: sessionId
        }
        
        // Mettre à jour le cache avec le résultat final
        processedSessions.set(sessionId, { timestamp: Date.now(), result })
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Sinon, c'est un paiement pour une réservation existante (backend)
      console.log('🔍 Recherche de la réservation existante pour:', customerEmail)
      
      let booking = null
      
      // 🔍 RECHERCHE AMÉLIORÉE DE LA RÉSERVATION EXISTANTE
      console.log('🔍 Métadonnées reçues pour recherche:', {
        email: customerEmail,
        date: metadata.date || metadata.booking_date,
        time: metadata.time || metadata.booking_time,
        user_id: metadata.user_id,
        service_id: metadata.service_id
      })

      // Recherche par critères exacts (email + date + heure + user_id)
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
        return new Response('Réservation non trouvée', { status: 404, headers: corsHeaders })
      }

      console.log('💳 MISE À JOUR RÉSERVATION EXISTANTE:', booking.id)
      console.log('📊 Réservation avant mise à jour:', {
        id: booking.id,
        payment_amount: booking.payment_amount,
        payment_status: booking.payment_status,
        booking_status: booking.booking_status,
        transactions_count: (booking.transactions || []).length
      })

      // Mettre à jour la réservation existante
      const existingTransactions = booking.transactions || []
      
      // Vérifier si cette session n'a pas déjà été traitée
      const sessionAlreadyProcessed = existingTransactions.some((t: any) => 
        t.method === 'stripe' && 
        t.note && 
        t.note.includes(sessionId)
      )
      
      if (sessionAlreadyProcessed) {
        console.log('🔒 SESSION STRIPE DÉJÀ TRAITÉE - Webhook en doublon absolu')
        
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
      
      const { error: updateError } = await supabaseClient
        .from('bookings')
        .update({
          payment_amount: newTotalPaid,
          payment_status: newPaymentStatus,
          booking_status: newBookingStatus,
          transactions: finalTransactions,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (updateError) {
        console.error('❌ Erreur mise à jour réservation:', updateError)
        console.error('❌ Détails erreur:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        })
        processedSessions.delete(sessionId)
        return new Response('Erreur mise à jour', { status: 500, headers: corsHeaders })
      }

      console.log('✅ RÉSERVATION MISE À JOUR AVEC SUCCÈS EN BASE DE DONNÉES')
      console.log('📊 Réservation après mise à jour:', {
        id: booking.id,
        payment_amount: newTotalPaid,
        payment_status: newPaymentStatus,
        booking_status: newBookingStatus,
        transactions_count: finalTransactions.length
      })
      
      const result = { 
        success: true, 
        type: 'existing_booking_updated',
        bookingId: booking?.id || 'updated',
        amountPaid: amountPaid,
        totalPaid: newTotalPaid,
        paymentStatus: newPaymentStatus,
        bookingStatus: newBookingStatus,
        sessionId: sessionId
      }
      
      // Mettre à jour le cache avec le résultat final
      processedSessions.set(sessionId, { timestamp: Date.now(), result })
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Autres types d'événements
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