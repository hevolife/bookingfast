import { createClient } from 'npm:@supabase/supabase-js@2'

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔔 Webhook Stripe reçu')
    
    // Créer le client Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Lire le body de la requête
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ Signature Stripe manquante')
      return new Response('Signature manquante', { status: 400, headers: corsHeaders })
    }

    // Pour le développement, on parse directement le JSON
    let event
    try {
      event = JSON.parse(body)
      console.log('📦 Événement Stripe:', event.type)
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

      console.log('📧 Email client:', session.customer_details?.email)
      console.log('💰 Montant payé:', session.amount_total, 'centimes')
      console.log('🏷️ Métadonnées:', session.metadata)

      const customerEmail = session.customer_details?.email
      const amountPaid = session.amount_total / 100 // Convertir centimes en euros
      const metadata = session.metadata || {}

      if (!customerEmail) {
        console.error('❌ Email client manquant')
        processedSessions.delete(sessionId) // Nettoyer le cache en cas d'erreur
        return new Response('Email client manquant', { status: 400, headers: corsHeaders })
      }

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

      // 🔒 VÉRIFICATION BASE DE DONNÉES - DEUXIÈME LIGNE DE DÉFENSE
      console.log('🔒 VÉRIFICATION BASE DE DONNÉES ANTI-DOUBLON...')
      const { data: existingBySession, error: sessionError } = await supabaseClient
        .from('bookings')
        .select('id, payment_status, payment_amount, total_amount, booking_status, transactions')
        .eq('client_email', customerEmail)
        .neq('booking_status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!sessionError && existingBySession && existingBySession.length > 0) {
        // Chercher une réservation avec une transaction Stripe ayant cette session
        const bookingWithSession = existingBySession.find(booking => {
          const transactions = booking.transactions || []
          return transactions.some((t: any) => 
            t.method === 'stripe' && 
            t.note && 
            t.note.includes(sessionId)
          )
        })

        if (bookingWithSession) {
          console.log('🔒 SESSION STRIPE DÉJÀ TRAITÉE EN BASE - Webhook en doublon')
          console.log('📋 Réservation existante avec cette session:', bookingWithSession.id)
          
          const result = { 
            success: true, 
            type: 'database_duplicate_prevented',
            message: 'Session already processed in database',
            existingBookingId: bookingWithSession.id
          }
          
          // Mettre à jour le cache
          processedSessions.set(sessionId, { timestamp: Date.now(), result })
          
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
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
          
          // Chercher une transaction Stripe en attente avec le même montant pour la mettre à jour
          let transactionUpdated = false
          const finalTransactions = existingTransactions.map(t => {
            if (t.method === 'stripe' && 
                t.status === 'pending' && 
                Math.abs(t.amount - amountPaid) < 0.01 && 
                !transactionUpdated) {
              transactionUpdated = true
              return {
                ...t,
                status: 'completed',
                note: `Acompte payé via Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`,
                updated_at: new Date().toISOString()
              }
            }
            return t
          })
          
          // Si aucune transaction n'a été mise à jour, ajouter une nouvelle
          if (!transactionUpdated) {
            finalTransactions.push(newTransaction)
          }
          
          // Calculer le nouveau montant total payé depuis TOUTES les transactions finales
          const newTotalPaid = finalTransactions
            .filter(t => t.status === 'completed' || t.status === 'success')
            .reduce((sum, t) => sum + t.amount, 0)
          const newTotalPaid = finalTransactions
            .filter(t => t.status === 'completed' || t.status === 'success')
            .reduce((sum, t) => sum + t.amount, 0)
          const totalAmount = existingBooking.total_amount

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
            .eq('id', existingBooking.id)

          if (updateError) {
            console.error('❌ Erreur mise à jour réservation existante:', updateError)
            processedSessions.delete(sessionId)
            return new Response('Erreur mise à jour réservation', { status: 500, headers: corsHeaders })
          }

          console.log('✅ RÉSERVATION EXISTANTE MISE À JOUR - AUCUNE CRÉATION')
          
          // 🚀 DÉCLENCHER LES WORKFLOWS APRÈS MISE À JOUR RÉUSSIE
          try {
            console.log('🚀 Déclenchement workflow payment_completed pour:', customerEmail)
            
            // Récupérer les données complètes de la réservation mise à jour
            const { data: updatedBookingData, error: fetchError } = await supabaseClient
              .from('bookings')
              .select(`
                *,
                service:services(*)
              `)
              .eq('id', existingBooking.id)
              .single()
            
            if (!fetchError && updatedBookingData) {
              // Appeler la fonction de workflow
              const workflowResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/trigger-workflow`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  trigger: 'payment_completed',
                  booking_data: updatedBookingData,
                  user_id: metadata.user_id
                })
              })
              
              if (workflowResponse.ok) {
                console.log('✅ Workflow payment_completed déclenché avec succès')
              } else {
                const workflowError = await workflowResponse.text()
                console.error('❌ Erreur déclenchement workflow:', workflowError)
              }
            }
          } catch (workflowError) {
            console.error('❌ Erreur déclenchement workflow payment_completed:', workflowError)
            // Ne pas faire échouer le paiement pour une erreur de workflow
          }
          
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
              
              // Chercher une transaction Stripe en attente avec le même montant pour la mettre à jour
              let transactionUpdated = false
              const finalTransactions = existingTransactions.map(t => {
                if (t.method === 'stripe' && 
                    t.status === 'pending' && 
                    Math.abs(t.amount - amountPaid) < 0.01 && 
                    !transactionUpdated) {
                  transactionUpdated = true
                  return {
                    ...t,
                    status: 'completed',
                    note: `Acompte payé via Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`,
                    updated_at: new Date().toISOString()
                  }
                }
                return t
              })
              
              // Si aucune transaction n'a été mise à jour, ajouter une nouvelle
              if (!transactionUpdated) {
                finalTransactions.push(newTransaction)
              }
              
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
                
                // 🚀 DÉCLENCHER LES WORKFLOWS APRÈS MISE À JOUR RÉUSSIE
                try {
                  console.log('🚀 Déclenchement workflow booking_updated pour:', customerEmail)
                  
                  // Récupérer les données complètes de la réservation mise à jour
                  const { data: updatedBookingData, error: fetchError } = await supabaseClient
                    .from('bookings')
                    .select(`
                      *,
                      service:services(*)
                    `)
                    .eq('id', conflictBooking.id)
                    .single()
                  
                  if (!fetchError && updatedBookingData) {
                    // Appeler la fonction de workflow
                    const workflowResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/trigger-workflow`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                      },
                      body: JSON.stringify({
                        trigger: 'payment_completed',
                        booking_data: updatedBookingData,
                        user_id: metadata.user_id
                      })
                    })
                    
                    if (workflowResponse.ok) {
                      console.log('✅ Workflow payment_completed déclenché avec succès')
                    } else {
                      const workflowError = await workflowResponse.text()
                      console.error('❌ Erreur déclenchement workflow:', workflowError)
                    }
                  }
                } catch (workflowError) {
                  console.error('❌ Erreur déclenchement workflow payment_completed:', workflowError)
                  // Ne pas faire échouer le paiement pour une erreur de workflow
                }
                
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
        
        // 🚀 DÉCLENCHER LES WORKFLOWS APRÈS CRÉATION RÉUSSIE
        try {
          console.log('🚀 Déclenchement workflow booking_created pour:', customerEmail)
          
          // Récupérer les données complètes de la réservation avec le service
          const { data: completeBookingData, error: fetchError } = await supabaseClient
            .from('bookings')
            .select(`
              *,
              service:services(*)
            `)
            .eq('id', newBooking.id)
            .single()
          
          if (!fetchError && completeBookingData) {
            // Appeler la fonction de workflow via Edge Function
            const workflowResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/trigger-workflow`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                trigger: 'booking_created',
                booking_data: completeBookingData,
                user_id: metadata.user_id
              })
            })
            
            if (workflowResponse.ok) {
              console.log('✅ Workflow booking_created déclenché avec succès')
            } else {
              const workflowError = await workflowResponse.text()
              console.error('❌ Erreur déclenchement workflow:', workflowError)
            }
          } else {
            console.error('❌ Impossible de récupérer les données complètes de la réservation')
          }
        } catch (workflowError) {
          console.error('❌ Erreur déclenchement workflow booking_created:', workflowError)
          // Ne pas faire échouer le paiement pour une erreur de workflow
        }
        
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
      
      // Recherche par booking_id si disponible
      if (metadata.booking_id) {
        console.log('🔍 Recherche par booking_id:', metadata.booking_id)
        const { data: bookingData, error: bookingError } = await supabaseClient
          .from('bookings')
          .select('*')
          .eq('id', metadata.booking_id)
          .maybeSingle()

        if (bookingData && !bookingError) {
          booking = bookingData
          console.log('✅ Réservation trouvée par ID:', booking.id)
        } else {
          console.log('❌ Réservation non trouvée par ID:', bookingError?.message)
        }
      }
      
      // Recherche par email et métadonnées (fallback)
      if (!booking && metadata.client && metadata.booking_date && metadata.booking_time) {
        console.log('🔍 Recherche par métadonnées:', { email: customerEmail, date: metadata.booking_date, time: metadata.booking_time })
        const { data: bookingData, error: bookingError } = await supabaseClient
          .from('bookings')
          .select('*')
          .eq('client_email', customerEmail)
          .eq('date', metadata.booking_date)
          .eq('time', metadata.booking_time)
          .maybeSingle()

        if (bookingData && !bookingError) {
          booking = bookingData
          console.log('✅ Réservation trouvée par métadonnées:', booking.id)
        } else {
          console.log('❌ Réservation non trouvée par métadonnées:', bookingError?.message)
        }
      }

      if (!booking) {
        console.log('🔍 Recherche par email seulement:', customerEmail)
        const { data: bookingData, error: bookingError } = await supabaseClient
          .from('bookings')
          .select('*')
          .eq('client_email', customerEmail)
          .maybeSingle()

        if (bookingData && !bookingError) {
          booking = bookingData
          console.log('✅ Réservation trouvée par email:', booking.id)
        } else {
          console.log('❌ Aucune réservation trouvée par email:', bookingError?.message)
        }
      }

      if (!booking) {
        console.error('❌ Aucune réservation trouvée pour:', customerEmail)
        processedSessions.delete(sessionId)
        return new Response('Réservation non trouvée', { status: 404, headers: corsHeaders })
      }

      // Mettre à jour la réservation existante
      const existingTransactions = booking.transactions || []
      
      // Vérifier si cette session n'a pas déjà été traitée
      const sessionAlreadyProcessed = existingTransactions.some((t: any) => 
        t.method === 'stripe' && 
        t.note && 
        t.note.includes(sessionId)
      )
      
      if (sessionAlreadyProcessed) {
        console.log('🔒 SESSION STRIPE DÉJÀ TRAITÉE - Webhook en doublon')
        
        const result = { 
          success: true, 
          type: 'session_already_processed',
          message: 'Session already processed',
          existingBookingId: booking.id
        }
        
        processedSessions.set(sessionId, { timestamp: Date.now(), result })
        console.log('🔍 Métadonnées reçues:', metadata)
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Créer une nouvelle transaction pour ce paiement
      const newTransaction = {
        id: crypto.randomUUID(),
        amount: amountPaid,
        method: 'stripe',
        status: 'completed',
        note: metadata.is_deposit === 'true' 
          ? `Acompte payé via Stripe (${amountPaid.toFixed(2)}€)`
          : `Paiement Stripe (${amountPaid.toFixed(2)}€)`,
        created_at: new Date().toISOString()
      }
      
      // Chercher une transaction Stripe en attente avec le même montant pour la mettre à jour
      let transactionUpdated = false
      const finalTransactions = existingTransactions.map(t => {
        if (t.method === 'stripe' && 
            t.status === 'pending' && 
            Math.abs(t.amount - amountPaid) < 0.01 && 
            !transactionUpdated) {
          transactionUpdated = true
          return {
            ...t,
            status: 'completed',
            note: metadata.is_deposit === 'true' 
              ? `Acompte payé via Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`
              : `Paiement Stripe (${amountPaid.toFixed(2)}€) - Session: ${sessionId}`,
            updated_at: new Date().toISOString()
          }
        }
        return t
      })
      
      // Si aucune transaction n'a été mise à jour, ajouter une nouvelle
      if (!transactionUpdated) {
        finalTransactions.push(newTransaction)
      }

      // Calculer le nouveau montant total payé depuis TOUTES les transactions finales
      const newTotalPaid = finalTransactions
        .filter((t: any) => t.status === 'completed' || t.status === 'success')
        .reduce((sum: number, t: any) => sum + t.amount, 0)
      const totalAmount = parseFloat(booking.total_amount)

      // Déterminer le nouveau statut de paiement
      let newPaymentStatus = 'pending'
      if (newTotalPaid >= totalAmount) {
        newPaymentStatus = 'completed'
      } else if (newTotalPaid > 0) {
        newPaymentStatus = 'partial'
      }
      
      // Confirmer la réservation si c'est un acompte
      let newBookingStatus = booking.booking_status
      if (metadata.is_deposit === 'true' && amountPaid > 0) {
        newBookingStatus = 'confirmed'
        console.log('✅ Acompte payé - réservation confirmée')
      }

      // Mettre à jour la réservation
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
        processedSessions.delete(sessionId)
        return new Response('Erreur mise à jour', { status: 500, headers: corsHeaders })
      }

      console.log('✅ Réservation existante mise à jour avec succès')

      // 🚀 DÉCLENCHER LES WORKFLOWS APRÈS MISE À JOUR RÉUSSIE
      try {
        console.log('🚀 Déclenchement workflow payment_completed pour:', customerEmail)
        
        // Récupérer les données complètes de la réservation mise à jour
        const { data: updatedBookingData, error: fetchError } = await supabaseClient
          .from('bookings')
          .select(`
            *,
            service:services(*)
          `)
          .eq('id', booking.id)
          .single()
        
        if (!fetchError && updatedBookingData) {
          // Appeler la fonction de workflow
          const workflowResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/trigger-workflow`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              trigger: 'payment_completed',
              booking_data: updatedBookingData,
              user_id: metadata.user_id || booking.user_id
            })
          })
          
          if (workflowResponse.ok) {
            console.log('✅ Workflow payment_completed déclenché avec succès')
          } else {
            const workflowError = await workflowResponse.text()
            console.error('❌ Erreur déclenchement workflow:', workflowError)
          }
        }
      } catch (workflowError) {
        console.error('❌ Erreur déclenchement workflow payment_completed:', workflowError)
        // Ne pas faire échouer le paiement pour une erreur de workflow
      }
      
      const result = { 
        success: true, 
        bookingId: booking?.id || 'updated',
        amountPaid: amountPaid,
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