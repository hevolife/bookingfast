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
    // Créer le client Supabase avec la clé service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Lire les données de la requête
    const { account_id, email, password, full_name, role, permissions } = await req.json()

    if (!account_id || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'account_id, email and password are required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Vérifier que l'utilisateur est propriétaire du compte
    const { data: accountData, error: accountError } = await supabaseClient
      .from('accounts')
      .select('owner_id')
      .eq('id', account_id)
      .single()

    if (accountError || !accountData || accountData.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: corsHeaders }
      )
    }

    console.log('🔄 Création utilisateur pour compte:', account_id, 'Email:', email)

    // Créer l'utilisateur dans auth.users
    const { data: authData, error: authError2 } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || null
      }
    })

    if (authError2) {
      console.error('❌ Erreur création auth user:', authError2)
      return new Response(
        JSON.stringify({ error: authError2.message }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('✅ Utilisateur auth créé:', authData.user.id)

    // Créer l'entrée dans la table users
    const { error: userError } = await supabaseClient
      .from('users')
      .insert([{
        id: authData.user.id,
        email: email,
        full_name: full_name || null,
        is_super_admin: false,
        subscription_status: 'active', // Hérite du statut du compte principal
        trial_started_at: new Date().toISOString(),
        trial_ends_at: null // Pas de limite pour les sous-comptes
      }])

    if (userError) {
      console.error('❌ Erreur création user profile:', userError)
      // Nettoyer l'utilisateur auth
      await supabaseClient.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Ajouter l'utilisateur au compte
    const { error: accountUserError } = await supabaseClient
      .from('account_users')
      .insert([{
        account_id: account_id,
        user_id: authData.user.id,
        role: role || 'member',
        permissions: permissions || [],
        invited_by: user.id
      }])

    if (accountUserError) {
      console.error('❌ Erreur ajout utilisateur au compte:', accountUserError)
      // Nettoyer l'utilisateur créé
      await supabaseClient.auth.admin.deleteUser(authData.user.id)
      await supabaseClient.from('users').delete().eq('id', authData.user.id)
      return new Response(
        JSON.stringify({ error: accountUserError.message }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('✅ Utilisateur ajouté au compte avec succès')

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user.id,
          email: email,
          full_name: full_name,
          role: role,
          permissions: permissions
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur création utilisateur compte:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})