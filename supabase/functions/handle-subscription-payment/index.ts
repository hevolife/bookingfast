import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('💰 Traitement paiement d\'abonnement pour affiliation...')
    
    // Créer le client Supabase avec la clé service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Lire les données de la requête
    const { user_id, subscription_amount } = await req.json()

    if (!user_id || !subscription_amount) {
      return new Response(
        JSON.stringify({ error: 'user_id and subscription_amount required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('🔍 Recherche parrainage pour utilisateur:', user_id)

    // Vérifier si cet utilisateur a été parrainé
    const { data: referral, error: referralError } = await supabaseClient
      .from('affiliate_referrals')
      .select('*, affiliate:affiliates(*)')
      .eq('referred_user_id', user_id)
      .eq('is_active', true)
      .single()

    if (referralError || !referral) {
      console.log('ℹ️ Aucun parrainage trouvé pour cet utilisateur')
      return new Response(
        JSON.stringify({ success: true, message: 'No affiliate referral found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Parrainage trouvé:', referral.affiliate_code)

    // Récupérer les paramètres d'affiliation
    const { data: settings, error: settingsError } = await supabaseClient
      .from('affiliate_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (settingsError || !settings) {
      console.warn('⚠️ Paramètres d\'affiliation non trouvés')
      return new Response(
        JSON.stringify({ success: true, message: 'Affiliate settings not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Marquer la conversion si ce n'est pas déjà fait
    if (!referral.conversion_date) {
      const { error: updateError } = await supabaseClient
        .from('affiliate_referrals')
        .update({
          conversion_date: new Date().toISOString(),
          subscription_status: 'active',
          total_paid: subscription_amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', referral.id)

      if (updateError) {
        console.error('❌ Erreur mise à jour parrainage:', updateError)
      } else {
        console.log('✅ Conversion marquée')
        
        // Mettre à jour les statistiques de l'affilié
        await supabaseClient
          .from('affiliates')
          .update({
            successful_conversions: referral.affiliate.successful_conversions + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', referral.affiliate_id)
      }
    }

    // Calculer et créer la commission
    const commissionAmount = subscription_amount * (settings.commission_percentage / 100)
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01' // Premier jour du mois

    console.log('💰 Calcul commission:', {
      subscription_amount,
      commission_percentage: settings.commission_percentage,
      commission_amount: commissionAmount
    })

    // Vérifier si la commission pour ce mois n'existe pas déjà
    const { data: existingCommission, error: commissionCheckError } = await supabaseClient
      .from('affiliate_commissions')
      .select('id')
      .eq('referral_id', referral.id)
      .eq('commission_month', currentMonth)
      .single()

    if (!existingCommission && !commissionCheckError) {
      // Créer la commission
      const { error: commissionError } = await supabaseClient
        .from('affiliate_commissions')
        .insert([{
          affiliate_id: referral.affiliate_id,
          referral_id: referral.id,
          amount: commissionAmount,
          commission_month: currentMonth,
          status: 'pending'
        }])

      if (commissionError) {
        console.error('❌ Erreur création commission:', commissionError)
      } else {
        console.log('✅ Commission créée:', commissionAmount, '€')
        
        // Mettre à jour les totaux de l'affilié
        await supabaseClient
          .from('affiliates')
          .update({
            total_commissions: referral.affiliate.total_commissions + commissionAmount,
            pending_commissions: referral.affiliate.pending_commissions + commissionAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', referral.affiliate_id)
      }
    } else {
      console.log('ℹ️ Commission déjà existante pour ce mois')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        commission_created: !existingCommission,
        commission_amount: commissionAmount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur traitement paiement affiliation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
